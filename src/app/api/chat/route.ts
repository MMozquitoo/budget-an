import { streamText, convertToModelMessages, isStepCount } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { budgetTools, buildSystemPrompt } from "@/agent/budget-agent";

export async function POST(req: Request) {
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
