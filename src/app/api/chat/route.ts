import { streamText, convertToModelMessages, isStepCount, pruneMessages } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { buildBudgetTools, buildSystemPrompt, getMemoryFacts } from "@/agent/budget-agent";
import { getTaxonomy } from "@/lib/taxonomy";
import { checkRateLimit } from "@/lib/rate-limit";

export async function POST(req: Request) {
  // Cap the model spend: a leaked session shouldn't be able to run up the bill.
  const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "unknown";
  if (!(await checkRateLimit(`chat:${ip}`, 60, 60 * 60)).allowed) {
    return Response.json(
      { error: "Trop de requêtes. Réessaie dans un moment." },
      { status: 429 }
    );
  }

  let messages;
  try {
    ({ messages } = await req.json());
  } catch {
    return Response.json({ error: "Corps de requête invalide" }, { status: 400 });
  }
  if (!Array.isArray(messages)) {
    return Response.json({ error: "messages doit être un tableau" }, { status: 400 });
  }

  const [memoryFacts, taxonomy] = await Promise.all([getMemoryFacts(), getTaxonomy()]);

  const result = streamText({
    model: anthropic("claude-sonnet-4-6"),
    // Cache the (large, mostly-static) system prompt: same content on every
    // message of every conversation, so this is a cache hit after the first
    // request in the window. See the matching tool-side breakpoint on the
    // last tool in buildBudgetTools (budget-agent.ts) — Anthropic caches
    // everything between the start of the request and a cache_control marker
    // as one unit. A new rememberFact/forgetFact/createCategory/createGroup
    // call changes this string, so it naturally busts the cache only when
    // the facts or taxonomy actually change.
    instructions: {
      role: "system",
      content: buildSystemPrompt(new Date(), memoryFacts, taxonomy),
      providerOptions: {
        anthropic: { cacheControl: { type: "ephemeral", ttl: "1h" } },
      },
    },
    // The client resends the whole conversation on every turn. Old text is
    // cheap, but old *tool* payloads aren't — a single query call can return
    // up to 200 transactions as JSON, and without pruning that gets re-sent
    // (and re-billed) on every subsequent message for the rest of the chat.
    // Keep full tool detail for the last few exchanges; drop it from
    // anything older — the assistant's text summary of what it found stays,
    // only the raw payload goes.
    messages: pruneMessages({
      messages: await convertToModelMessages(messages),
      toolCalls: "before-last-12-messages",
      emptyMessages: "remove",
    }),
    tools: buildBudgetTools(taxonomy),
    stopWhen: isStepCount(5),
  });

  return result.toUIMessageStreamResponse();
}
