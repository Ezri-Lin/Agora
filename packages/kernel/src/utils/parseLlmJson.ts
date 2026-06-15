/**
 * Robust JSON extraction from LLM responses.
 *
 * Handles common LLM output patterns:
 * - Markdown code fences (```json ... ```)
 * - Text before/after JSON
 * - Trailing commas
 * - Whitespace padding
 */

export function parseLlmJson<T>(raw: string, fallback: T): T {
  const extracted = extractJsonString(raw);
  if (!extracted) return fallback;

  try {
    return JSON.parse(extracted) as T;
  } catch {
    // Try fixing trailing commas
    const fixed = extracted.replace(/,\s*([\]}])/g, "$1");
    try {
      return JSON.parse(fixed) as T;
    } catch {
      return fallback;
    }
  }
}

function extractJsonString(raw: string): string | null {
  const trimmed = raw.trim();

  // 1. Try markdown code fence: ```json ... ``` or ``` ... ```
  const fenceMatch = trimmed.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/);
  if (fenceMatch) {
    return fenceMatch[1].trim();
  }

  // 2. Try to find JSON array or object boundaries
  const arrayStart = trimmed.indexOf("[");
  const objectStart = trimmed.indexOf("{");

  if (arrayStart === -1 && objectStart === -1) return null;

  // Find the matching closing bracket
  if (arrayStart !== -1 && (objectStart === -1 || arrayStart < objectStart)) {
    return findMatchingBracket(trimmed, arrayStart, "[", "]");
  }

  if (objectStart !== -1) {
    return findMatchingBracket(trimmed, objectStart, "{", "}");
  }

  return null;
}

function findMatchingBracket(text: string, start: number, open: string, close: string): string | null {
  let depth = 0;
  let inString = false;
  let escape = false;

  for (let i = start; i < text.length; i++) {
    const ch = text[i];

    if (escape) {
      escape = false;
      continue;
    }

    if (ch === "\\") {
      escape = true;
      continue;
    }

    if (ch === '"') {
      inString = !inString;
      continue;
    }

    if (inString) continue;

    if (ch === open) depth++;
    else if (ch === close) {
      depth--;
      if (depth === 0) {
        return text.slice(start, i + 1);
      }
    }
  }

  return null;
}
