import type {
  TailCompactPayload,
  MessageCompact,
  ParseTailCompactResult,
} from "./types.js";

/**
 * Parse a `<compact>` JSON block from the tail of a persona response.
 *
 * Supports two formats:
 * 1. `<compact>{ ... }</compact>` (preferred)
 * 2. Bare JSON with `{ "compact": { ... } }` at the end (fallback)
 *
 * Returns the visible content (compact stripped) and the parsed compact.
 * MUST NOT throw — malformed compact returns compact: null + parseError.
 */
export function parseTailCompact(args: {
  content: string;
  messageId: string;
  speakerId: string;
  phase: "opening" | "cross_exam" | "synthesis";
}): ParseTailCompactResult {
  const { content, messageId, speakerId, phase } = args;

  // Try XML-style compact first
  const xmlResult = tryParseXmlCompact(content);
  if (xmlResult) {
    return buildResult(xmlResult.json, xmlResult.visibleContent, messageId, speakerId, phase);
  }

  // Fallback: bare JSON with "compact" key at end
  const jsonResult = tryParseBareJsonCompact(content);
  if (jsonResult) {
    return buildResult(jsonResult.json, jsonResult.visibleContent, messageId, speakerId, phase);
  }

  // No compact found
  return { visibleContent: content, compact: null };
}

interface RawParseResult {
  json: TailCompactPayload;
  visibleContent: string;
}

function tryParseXmlCompact(content: string): RawParseResult | null {
  // Find the last <compact>...</compact> block
  const lastOpen = content.lastIndexOf("<compact>");
  const lastClose = content.lastIndexOf("</compact>");

  if (lastOpen === -1 || lastClose === -1 || lastClose <= lastOpen) {
    return null;
  }

  const jsonStr = content.slice(lastOpen + "<compact>".length, lastClose).trim();

  try {
    const parsed = JSON.parse(jsonStr) as TailCompactPayload;
    const visibleContent = content.slice(0, lastOpen).trimEnd();
    return { json: parsed, visibleContent };
  } catch {
    return null;
  }
}

function tryParseBareJsonCompact(content: string): RawParseResult | null {
  // Look for a trailing JSON block with "compact" key
  // Strategy: find the last `{` and try to parse from there
  const lastBrace = content.lastIndexOf("{");
  if (lastBrace === -1) return null;

  // Walk back to find the start of a JSON object that might contain "compact"
  // Try progressively larger slices
  const candidates = [lastBrace];
  let searchFrom = lastBrace - 1;
  while (searchFrom >= 0) {
    const idx = content.lastIndexOf("{", searchFrom);
    if (idx === -1) break;
    candidates.push(idx);
    searchFrom = idx - 1;
    // Don't scan too far back
    if (candidates.length > 5) break;
  }

  for (const start of candidates) {
    const jsonStr = content.slice(start).trim();
    try {
      const parsed = JSON.parse(jsonStr);
      if (parsed && typeof parsed === "object" && "compact" in parsed) {
        const payload = parsed.compact as TailCompactPayload;
        const visibleContent = content.slice(0, start).trimEnd();
        return { json: payload, visibleContent };
      }
    } catch {
      continue;
    }
  }

  return null;
}

function buildResult(
  payload: TailCompactPayload,
  visibleContent: string,
  messageId: string,
  speakerId: string,
  phase: "opening" | "cross_exam" | "synthesis",
): ParseTailCompactResult {
  try {
    const compact = normalizeCompact(payload, messageId, speakerId, phase);
    return { visibleContent, compact };
  } catch (err) {
    return {
      visibleContent,
      compact: null,
      parseError: err instanceof Error ? err.message : String(err),
    };
  }
}

function normalizeCompact(
  raw: TailCompactPayload,
  messageId: string,
  speakerId: string,
  phase: "opening" | "cross_exam" | "synthesis",
): MessageCompact {
  const summary =
    raw.summary ??
    raw.stance ??
    (Array.isArray(raw.keyClaims) ? raw.keyClaims[0] : undefined) ??
    "";

  const keyClaims = normalizeToStringArray(raw.keyClaims);
  const risks = normalizeToStringArray(raw.risks);
  const agreements = normalizeInteractionArray(raw.agreements);
  const disagreements = normalizeInteractionArray(raw.disagreements);
  const openQuestions = normalizeToStringArray(raw.openQuestions);
  const memoryCandidate = raw.memoryCandidate ?? null;

  return {
    messageId,
    speakerId,
    phase,
    summary,
    keyClaims,
    risks,
    agreements,
    disagreements,
    openQuestions,
    memoryCandidate,
    raw,
  };
}

function normalizeToStringArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String);
  if (typeof value === "string") return [value];
  return [];
}

function normalizeInteractionArray(
  value: unknown,
): Array<{ with: string; point: string }> {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null)
    .map((item) => ({
      with: String(item.with ?? item.persona ?? item.id ?? ""),
      point: String(item.point ?? item.claim ?? item.text ?? ""),
    }))
    .filter((item) => item.with !== "" && item.point !== "");
}
