/**
 * DocumentPatchBuilder — build concrete patches from change plans.
 *
 * PR-10: Supports create_document, append_section, update_section.
 * No complex markdown AST patching yet.
 */

import type { DocumentChangePlan, DocumentPatch } from "./types.js";

/**
 * Build a DocumentPatch from a plan and content.
 */
export function buildDocumentPatch(args: {
  plan: DocumentChangePlan;
  currentContent?: string;
  newText: string;
  expectedHashBefore: string;
  insertionAnchor?: DocumentPatch["insertionAnchor"];
}): DocumentPatch {
  const { plan, currentContent, newText, expectedHashBefore, insertionAnchor } = args;

  return {
    planId: plan.id,
    targetPath: plan.targetPath,
    mode: plan.mode,
    oldText: currentContent,
    newText,
    insertionAnchor,
    expectedHashBefore,
  };
}
