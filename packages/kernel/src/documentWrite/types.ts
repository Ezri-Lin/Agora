/**
 * Types for the Document Write Pipeline.
 *
 * PR-10: Plan + DiffPreview skeleton (no actual file writes).
 */

/** How a document change should be applied. */
export type DocumentChangeMode =
  | "append_section"
  | "update_section"
  | "replace_section"
  | "insert_after"
  | "delete_section"
  | "rename_heading"
  | "rewrite_document"
  | "create_document";

/** A planned change to a document. */
export interface DocumentChangePlan {
  id: string;
  targetPath: string;
  targetDocId?: string;
  mode: DocumentChangeMode;
  intent: string;
  rationale: string;
  affectedSections: Array<{
    headingPath: string[];
    reason: string;
  }>;
  requiredEvidence: Array<{
    sourceId: string;
    claim: string;
  }>;
  riskLevel: "low" | "medium" | "high";
  rollbackStrategy: string;
}

/** A concrete patch to apply to a document. */
export interface DocumentPatch {
  planId: string;
  targetPath: string;
  mode: DocumentChangeMode;
  oldText?: string;
  newText: string;
  insertionAnchor?: {
    headingPath?: string[];
    afterText?: string;
  };
  expectedHashBefore: string;
}

/** Human-readable preview of what a patch would change. */
export interface DiffPreview {
  patchId: string;
  targetPath: string;
  summary: string;
  additions: number;
  deletions: number;
  riskLevel: "low" | "medium" | "high";
  diffText: string;
}
