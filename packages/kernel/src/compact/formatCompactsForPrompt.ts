/**
 * Format MessageCompacts into a human-readable prompt section.
 *
 * Used by moderator synthesis and cross-exam prompts to understand
 * persona stances without re-reading full responses.
 */

import type { MessageCompact } from "./types.js";

/**
 * Format a list of MessageCompacts into a structured prompt section.
 *
 * Returns empty string if no compacts provided.
 */
export function formatCompactsForPrompt(compacts: MessageCompact[]): string {
  if (compacts.length === 0) return "";

  const lines: string[] = [
    "## Persona Compacts",
    "",
    "The following structured summaries were extracted from each persona's response.",
    "Use these to preserve disagreements and avoid inventing consensus.",
    "",
  ];

  for (const compact of compacts) {
    lines.push(`### ${compact.speakerId}`);
    lines.push("");

    if (compact.summary) {
      lines.push(`Stance: ${compact.summary}`);
      lines.push("");
    }

    if (compact.keyClaims.length > 0) {
      lines.push("Key claims:");
      for (const claim of compact.keyClaims) {
        lines.push(`- ${claim}`);
      }
      lines.push("");
    }

    if (compact.risks.length > 0) {
      lines.push("Risks:");
      for (const risk of compact.risks) {
        lines.push(`- ${risk}`);
      }
      lines.push("");
    }

    if (compact.agreements.length > 0) {
      lines.push("Agreements:");
      for (const a of compact.agreements) {
        lines.push(`- with ${a.with}: ${a.point}`);
      }
      lines.push("");
    }

    if (compact.disagreements.length > 0) {
      lines.push("Disagreements:");
      for (const d of compact.disagreements) {
        lines.push(`- with ${d.with}: ${d.point}`);
      }
      lines.push("");
    }

    if (compact.openQuestions.length > 0) {
      lines.push("Open questions:");
      for (const q of compact.openQuestions) {
        lines.push(`- ${q}`);
      }
      lines.push("");
    }

    if (compact.memoryCandidate) {
      lines.push(`Memory candidate: ${compact.memoryCandidate}`);
      lines.push("");
    }
  }

  return lines.join("\n");
}
