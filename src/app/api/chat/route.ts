import { streamText, convertToModelMessages, isStepCount } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { budgetTools, SYSTEM_PROMPT } from "@/agent/budget-agent";

export async function POST(req: Request) {
  const { messages } = await req.json();

  const result = streamText({
    model: anthropic("claude-sonnet-4-6"),
    system: SYSTEM_PROMPT,
    messages: await convertToModelMessages(messages),
    tools: budgetTools,
    stopWhen: isStepCount(5),
  });

  return result.toUIMessageStreamResponse();
}
