import type { MemoryCandidate } from "@agora/shared";

/** Stub: search memory by keywords. Real implementation will use embeddings or index. */
export function searchMemory(
  candidates: MemoryCandidate[],
  query: string,
): MemoryCandidate[] {
  const lower = query.toLowerCase();
  return candidates.filter(
    (c) =>
      c.content.toLowerCase().includes(lower) ||
      c.tags.some((t) => lower.includes(t)),
  );
}
