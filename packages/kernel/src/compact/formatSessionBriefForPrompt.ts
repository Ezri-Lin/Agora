/**
 * formatSessionBriefForPrompt — render a SessionRunningBrief
 * into a structured prompt section for moderator / persona injection.
 */

import type { SessionRunningBrief } from "./types.js";

/**
 * Format a SessionRunningBrief into a human-readable prompt section.
 * Returns empty string if brief has no meaningful content.
 */
export function formatSessionBriefForPrompt(brief: SessionRunningBrief): string {
  const lines: string[] = [
    "## Session Running Brief",
    "",
    `Topic: ${brief.topic}`,
    "",
  ];

  if (brief.activeGoal) {
    lines.push(`Active goal: ${brief.activeGoal}`, "");
  }

  if (brief.latestUserIntent) {
    lines.push(`Latest user intent: ${brief.latestUserIntent}`, "");
  }

  // Consensus
  if (brief.currentConsensus.length > 0) {
    lines.push("Current consensus:");
    for (const c of brief.currentConsensus) lines.push(`- ${c}`);
    lines.push("");
  }

  // Disagreements
  if (brief.currentDisagreements.length > 0) {
    lines.push("Current disagreements:");
    for (const d of brief.currentDisagreements) {
      lines.push(`- ${d.with}: ${d.point}`);
    }
    lines.push("");
  }

  // Unresolved questions
  if (brief.unresolvedQuestions.length > 0) {
    lines.push("Unresolved questions:");
    for (const q of brief.unresolvedQuestions) lines.push(`- ${q}`);
    lines.push("");
  }

  // Persona stances
  if (brief.personaStances.length > 0) {
    lines.push("Persona stances:");
    for (const stance of brief.personaStances) {
      lines.push(`### ${stance.personaId}`);
      lines.push(`Position: ${stance.currentPosition}`);
      if (stance.strongestClaim) {
        lines.push(`Strongest claim: ${stance.strongestClaim}`);
      }
      if (stance.concerns.length > 0) {
        lines.push("Concerns:");
        for (const c of stance.concerns) lines.push(`- ${c}`);
      }
      if (stance.disagreements.length > 0) {
        lines.push("Disagreements:");
        for (const d of stance.disagreements) {
          lines.push(`- with ${d.withPersonaId}: ${d.point}`);
        }
      }
      if (stance.agreements.length > 0) {
        lines.push("Agreements:");
        for (const a of stance.agreements) {
          lines.push(`- with ${a.withPersonaId}: ${a.point}`);
        }
      }
      if (stance.changedMind) {
        lines.push(`Changed mind: ${stance.changedMind}`);
      }
      lines.push("");
    }
  }

  // Memory candidates
  if (brief.memoryCandidates.length > 0) {
    lines.push("Memory candidates:");
    for (const m of brief.memoryCandidates) lines.push(`- ${m}`);
    lines.push("");
  }

  // Round count
  lines.push(`Rounds completed: ${brief.roundCount}`, "");

  return lines.join("\n");
}
