/**
 * Finalize types — post-round user actions.
 */

// === UserNextAction ===

export type UserNextAction =
  | { kind: "continue_discussion"; instruction?: string }
  | { kind: "ask_specific_role"; roleId: string; question: string }
  | { kind: "host_synthesize"; focus?: string }
  | { kind: "finalize_decision"; decisionText?: string }
  | { kind: "write_doc_candidate"; targetDoc?: string }
  | { kind: "discard" };

// === FinalizeAction ===

export type FinalizeAction =
  | { kind: "summary_only" }
  | { kind: "decision_summary"; decisionText?: string }
  | { kind: "memory_candidates" }
  | { kind: "doc_write_candidate"; targetDoc?: string };
