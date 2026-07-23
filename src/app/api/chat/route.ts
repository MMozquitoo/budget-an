import { streamText, convertToModelMessages, isStepCount } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { budgetTools, buildSystemPrompt } from "@/agent/budget-agent";
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

  const result = streamText({
    model: anthropic("claude-sonnet-4-6"),
    system: buildSystemPrompt(),
    messages: await convertToModelMessages(messages),
    tools: budgetTools,
    stopWhen: isStepCount(5),
  });

  return result.toUIMessageStreamResponse();
}
