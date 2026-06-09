/**
 * DocumentChangePlanner — deterministic helper for creating change plans.
 *
 * PR-10: No LLM planner. Just fills in defaults and classifies risk.
 */

import type { DocumentChangePlan, DocumentChangeMode } from "./types.js";
import { stableHashInt } from "./contentHash.js";

/**
 * Classify the risk level of a document change.
 */
export function classifyDocumentChangeRisk(args: {
  mode: DocumentChangeMode;
  targetKind?: "markdown" | "text" | "json" | "yaml" | "code";
  affectedSectionCount?: number;
}): "low" | "medium" | "high" {
  const { mode, targetKind, affectedSectionCount } = args;

  // Code targets are always high risk
  if (targetKind === "code") return "high";

  // Many sections affected is high risk
  if (affectedSectionCount != null && affectedSectionCount > 3) return "high";

  switch (mode) {
    case "create_document":
    case "append_section":
      return "low";

    case "update_section":
    case "replace_section":
    case "insert_after":
    case "rename_heading":
      return "medium";

    case "delete_section":
    case "rewrite_document":
      return "high";
  }
}

/**
 * Create a DocumentChangePlan with defaults and risk classification.
 */
export function createDocumentChangePlan(args: {
  targetPath: string;
  targetDocId?: string;
  mode: DocumentChangeMode;
  intent: string;
  rationale?: string;
  affectedSections?: Array<{ headingPath: string[]; reason: string }>;
  requiredEvidence?: Array<{ sourceId: string; claim: string }>;
  targetKind?: "markdown" | "text" | "json" | "yaml" | "code";
}): DocumentChangePlan {
  const {
    targetPath,
    targetDocId,
    mode,
    intent,
    rationale,
    affectedSections = [],
    requiredEvidence = [],
    targetKind,
  } = args;

  const riskLevel = classifyDocumentChangeRisk({
    mode,
    targetKind,
    affectedSectionCount: affectedSections.length,
  });

  const id = `plan_${stableHashInt(targetPath + ":" + mode + ":" + intent)}`;

  return {
    id,
    targetPath,
    targetDocId,
    mode,
    intent,
    rationale: rationale ?? `Change via ${mode}`,
    affectedSections,
    requiredEvidence,
    riskLevel,
    rollbackStrategy: riskLevel === "high"
      ? "Requires manual review before apply. Create backup first."
      : riskLevel === "medium"
        ? "Can be reverted by re-applying previous content."
        : "Safe to revert by removing appended content.",
  };
}
