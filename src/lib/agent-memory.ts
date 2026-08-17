/**
 * Cross-conversation memory — pure formatting only, database-free (loading
 * the facts is Prisma, done in budget-agent.ts, same split as computeInsights()
 * vs insights.ts). Adrien was re-explaining the same handful of facts (the
 * MCAN/Street Kred holding structure, what a recurring counterparty actually
 * is, the target MCAN salary) in nearly every new conversation, because chat
 * history doesn't carry across conversations. This turns whatever is in
 * AgentMemory into a system-prompt section so a fresh conversation already
 * knows it.
 */

export interface MemoryFact {
  id: string;
  content: string;
}

/**
 * Empty string when there is nothing to remember yet — no empty section.
 * Each fact's id is included so the agent can pass it back to forgetFact
 * without a separate lookup tool call.
 */
export function buildMemorySection(facts: MemoryFact[]): string {
  if (facts.length === 0) return "";
  const lines = facts.map((f) => `- ${f.content} (id: ${f.id})`).join("\n");
  return `\nCE QUE TU SAIS DÉJÀ (mémoire persistante, confirmée par Adrien dans une conversation précédente — ne redemande pas) :\n${lines}\n`;
}
