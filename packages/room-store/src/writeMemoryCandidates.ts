import type { MemoryCandidate } from "@agora/shared";
import { writeText } from "./fs-utils.js";
import { roomDir } from "./paths.js";

export async function writeMemoryCandidates(
  workspaceRoot: string,
  roomId: string,
  candidates: MemoryCandidate[],
): Promise<void> {
  const lines: string[] = ["# Memory Candidates", ""];

  for (const c of candidates) {
    lines.push(`## ${c.id}`);
    lines.push(`- Scope: ${c.scope}`);
    lines.push(`- Domains: ${c.domains.join(", ")}`);
    lines.push(`- Tags: ${c.tags.join(", ")}`);
    lines.push(`- Confidence: ${c.confidence}`);
    lines.push(`- Status: ${c.status}`);
    lines.push("");
    lines.push(c.content);
    lines.push("");
  }

  const dir = roomDir(workspaceRoot, roomId);
  await writeText(`${dir}/memory-candidates.md`, lines.join("\n"));
}
