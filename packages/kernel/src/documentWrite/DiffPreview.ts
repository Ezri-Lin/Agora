/**
 * DiffPreview — generate human-readable diff previews from patches.
 *
 * PR-10: Simple line-level diff. No complex diff library needed.
 */

import type { DocumentPatch, DiffPreview } from "./types.js";

/**
 * Create a DiffPreview from a DocumentPatch.
 *
 * For append/create modes, only shows additions.
 * For update/replace modes, shows line-level diff.
 */
export function createDiffPreview(args: {
  patch: DocumentPatch;
  summary?: string;
}): DiffPreview {
  const { patch, summary } = args;

  const oldLines = patch.oldText ? patch.oldText.split("\n") : [];
  const newLines = patch.newText.split("\n");

  const { additions, deletions, diffText } = computeLineDiff(oldLines, newLines, patch.mode);

  return {
    patchId: patch.planId,
    targetPath: patch.targetPath,
    summary: summary ?? buildAutoSummary(patch.mode, additions, deletions),
    additions,
    deletions,
    riskLevel: classifyPatchRisk(patch),
    diffText,
  };
}

/** Simple line-level diff. Only compares full lines, not character-level. */
function computeLineDiff(
  oldLines: string[],
  newLines: string[],
  mode: DocumentPatch["mode"],
): { additions: number; deletions: number; diffText: string } {
  // For create / append, everything is new
  if (mode === "create_document" || mode === "append_section") {
    const diff = newLines.map((l) => `+ ${l}`).join("\n");
    return { additions: newLines.length, deletions: 0, diffText: diff };
  }

  // For delete, everything is removed
  if (mode === "delete_section") {
    const diff = oldLines.map((l) => `- ${l}`).join("\n");
    return { additions: 0, deletions: oldLines.length, diffText: diff };
  }

  // For update/replace/insert: line-level comparison
  const oldSet = new Set(oldLines.filter((l) => l.trim()));
  const newSet = new Set(newLines.filter((l) => l.trim()));

  const added = newLines.filter((l) => l.trim() && !oldSet.has(l));
  const removed = oldLines.filter((l) => l.trim() && !newSet.has(l));

  const diffParts: string[] = [];
  for (const line of removed) {
    diffParts.push(`- ${line}`);
  }
  for (const line of added) {
    diffParts.push(`+ ${line}`);
  }

  return {
    additions: added.length,
    deletions: removed.length,
    diffText: diffParts.join("\n"),
  };
}

function buildAutoSummary(mode: DocumentPatch["mode"], additions: number, deletions: number): string {
  switch (mode) {
    case "create_document":
      return `New document (${additions} lines)`;
    case "append_section":
      return `Append ${additions} lines`;
    case "update_section":
      return `Update section (+${additions} -${deletions} lines)`;
    case "replace_section":
      return `Replace section (+${additions} -${deletions} lines)`;
    case "insert_after":
      return `Insert ${additions} lines after anchor`;
    case "delete_section":
      return `Delete ${deletions} lines`;
    case "rename_heading":
      return `Rename heading`;
    case "rewrite_document":
      return `Rewrite document (+${additions} -${deletions} lines)`;
  }
}

function classifyPatchRisk(patch: DocumentPatch): "low" | "medium" | "high" {
  switch (patch.mode) {
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
