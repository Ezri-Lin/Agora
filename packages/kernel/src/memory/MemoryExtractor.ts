import type { MemoryScope } from "@agora/shared";
import type { LLMProvider } from "../types/index.js";

interface ExtractedMemory {
  content: string;
  domains: string[];
  tags: string[];
  scope: MemoryScope;
}

/**
 * Ask the LLM to extract durable insights from a council round.
 * Returns 0-3 memory candidates.
 */
export async function extractMemories(
  llm: LLMProvider,
  roomId: string,
  topic: string,
  summary: string,
): Promise<ExtractedMemory[]> {
  const context = `## Topic\n${topic}\n\n## Council Summary\n${summary}\n\nExtract 0-3 durable insights that would be valuable for future discussions on similar topics. Focus on:\n- Non-obvious conclusions or frameworks\n- Key tradeoffs discovered\n- Recurring patterns or principles\n- Actionable recommendations with lasting value\n\nDo NOT extract:\n- Obvious facts\n- Topic-specific details that won't generalize\n- Temporary status updates\n\nReturn a JSON array. Each item: {content: string, domains: string[], tags: string[], scope: "universal"|"domain"|"project"}\n\nIf no durable insights found, return: []`;

  const result = await llm.callModerator({
    roomId,
    task: "extract_memories",
    context,
  });

  try {
    const parsed = JSON.parse(result.content);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((m: any) => m && typeof m.content === "string")
      .slice(0, 3)
      .map((m: any) => ({
        content: m.content,
        domains: Array.isArray(m.domains) ? m.domains : [],
        tags: Array.isArray(m.tags) ? m.tags : [],
        scope: ["universal", "domain", "project"].includes(m.scope) ? m.scope : "domain",
      }));
  } catch {
    return [];
  }
}
