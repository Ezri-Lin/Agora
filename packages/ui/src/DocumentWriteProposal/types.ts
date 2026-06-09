import type { ReactNode } from "react";

/** Supported document change modes for MVP UI. */
export type SupportedChangeMode =
  | "create_document"
  | "append_section"
  | "update_section";

/** All modes the kernel knows about. */
export type DocumentChangeMode =
  | SupportedChangeMode
  | "replace_section"
  | "insert_after"
  | "delete_section"
  | "rename_heading"
  | "rewrite_document";

/** UI view model for a document write candidate. */
export interface DocWriteCandidateViewModel {
  id: string;
  targetPath: string;
  mode: DocumentChangeMode;
  intent: string;
  rationale: string;
  riskLevel: "low" | "medium" | "high";
  status?: "pending" | "diff_preview" | "applying" | "success" | "error";
  error?: string;
}

/** UI view model for a diff preview. */
export interface DiffPreviewViewModel {
  patchId: string;
  targetPath: string;
  summary: string;
  additions: number;
  deletions: number;
  riskLevel: "low" | "medium" | "high";
  diffText: string;
}

export interface DocumentWriteProposalPanelProps {
  candidates: DocWriteCandidateViewModel[];
  diffPreview?: DiffPreviewViewModel | null;
  previewForId?: string | null;
  isGeneratingDiff?: boolean;
  isApplying?: boolean;
  applyResult?: { applied: boolean; newHash?: string; rollbackId?: string; warnings: string[] } | null;
  onGenerateDiff: (candidateId: string) => void;
  onApply: (candidateId: string) => void;
  onDismiss: (candidateId: string) => void;
  onDismissAll: () => void;
  onCloseDiff: () => void;
  headerExtra?: ReactNode;
}
