/**
 * Extract graph summary from content that contains <!-- summary: ... --> tag.
 */
export function extractGraphSummary(content: string): string | null {
  const match = content.match(/<!--\s*summary:\s*(.+?)\s*-->/);
  return match?.[1]?.trim() ?? null;
}

/**
 * Extract the first meaningful sentence from content.
 * Skips markdown headers, empty lines, and very short fragments.
 */
export function firstMeaningfulSentence(content: string): string | null {
  const lines = content.split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    // Skip empty lines, markdown headers, and HTML comments
    if (!trimmed || trimmed.startsWith("#") || trimmed.startsWith("<!--")) continue;
    // Skip very short fragments
    if (trimmed.length < 10) continue;
    // Extract first sentence (up to period, exclamation, or newline)
    const sentenceMatch = trimmed.match(/^(.+?[.!?。！？])\s/);
    if (sentenceMatch?.[1]) return sentenceMatch[1];
    // If no sentence boundary, use the whole line (truncated)
    return trimmed.length > 100 ? trimmed.slice(0, 97) + "..." : trimmed;
  }
  return null;
}

/**
 * Build a preview of content, truncated to maxChars.
 * Tries to break at sentence boundary.
 */
export function buildPreview(content: string, maxChars: number): string {
  if (content.length <= maxChars) return content;
  // Try to break at sentence boundary
  const truncated = content.slice(0, maxChars);
  const lastPeriod = Math.max(
    truncated.lastIndexOf("."),
    truncated.lastIndexOf("。"),
    truncated.lastIndexOf("!"),
    truncated.lastIndexOf("！"),
  );
  if (lastPeriod > maxChars * 0.5) {
    return truncated.slice(0, lastPeriod + 1);
  }
  return truncated + "...";
}
