/**
 * Decision Log Types — v0 类型定义
 *
 * 设计原则：
 * - append-only
 * - workspace scoped
 * - provenance refs
 * - no raw chat storage
 */

// === Event Types ===

export type DecisionLogEventType =
  | "memory_candidate_created"
  | "memory_candidate_accepted"
  | "memory_candidate_rejected"
  | "memory_candidate_expired"
  | "council_round_completed"
  | "role_tool_used"
  | "moderator_summary_created"
  | "user_decision";

// === Actor ===

export type DecisionLogActor = "user" | "system" | "policy" | "role" | "moderator";

// === Source Ref ===

export type DecisionLogSourceRefType =
  | "memory_review"
  | "council_message"
  | "tool_trace"
  | "document"
  | "memory";

export interface DecisionLogSourceRef {
  type: DecisionLogSourceRefType;
  id: string;
  excerpt?: string;
}

// === Log Entry ===

export interface DecisionLogEntry {
  id: string;
  workspaceId: string;
  projectId?: string;
  sessionId?: string;
  councilRoundId?: string;

  type: DecisionLogEventType;
  title: string;
  summary: string;

  actor: DecisionLogActor;
  actorId?: string;

  sourceRefs: DecisionLogSourceRef[];

  createdAt: string;
}

// === Query ===

export interface DecisionLogQuery {
  workspaceId: string;
  projectId?: string;
  sessionId?: string;
  councilRoundId?: string;
  type?: DecisionLogEventType[];
  actor?: DecisionLogActor[];
  limit?: number;
  offset?: number;
}

// === Store Interface ===

export interface DecisionLogStore {
  append(entry: DecisionLogEntry): Promise<DecisionLogError | null>;
  query(query: DecisionLogQuery): Promise<DecisionLogEntry[]>;
  getById(id: string): Promise<DecisionLogEntry | null>;
  getCount(workspaceId: string): Promise<number>;
}

// === Errors ===

export type DecisionLogErrorCode =
  | "INVALID_ENTRY"
  | "WORKSPACE_REQUIRED"
  | "ENTRY_NOT_FOUND";

export interface DecisionLogError {
  code: DecisionLogErrorCode;
  message: string;
  recoverable: boolean;
}

// === Helpers ===

export function generateDecisionLogId(): string {
  return `dlog-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
