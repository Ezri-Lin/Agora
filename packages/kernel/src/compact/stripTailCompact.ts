import { parseTailCompact } from "./parseTailCompact.js";

/**
 * Strip the compact block from raw persona output.
 * Convenience wrapper that returns only the visible content string.
 */
export function stripTailCompact(content: string): string {
  return parseTailCompact({
    content,
    messageId: "",
    speakerId: "",
    phase: "opening",
  }).visibleContent;
}
