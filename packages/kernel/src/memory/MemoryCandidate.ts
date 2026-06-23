/**
 * MemoryCandidate — 记忆候选 contract
 *
 * 基于 contracts-v1.md 冻结的 schema
 */

export type MemoryScope =
  | "global"
  | "domain"
  | "project"
  | "session"
  | "role_usage";

export type MemoryType =
  | "preference"
  | "decision"
  | "insight"
  | "constraint"
  | "fact"
  | "anti_pattern";

export type MemoryStatus =
  | "candidate"
  | "accepted"
  | "rejected"
  | "superseded"
  | "expired"
  | "contradicted";

export interface MemoryCandidateSource {
  sessionId: string;
  messageIds: string[];
  summaryId?: string;
  evidenceRefs?: string[];
}

export interface MemoryCandidate {
  id: string;
  scope: MemoryScope;
  type: MemoryType;
  content: string;
  source: MemoryCandidateSource;
  confidence: number; // 0-1
  status: MemoryStatus;
  tags: string[];
  createdAt: string;
}

export interface RejectedMemoryCandidate {
  content: string;
  reason: string;
  source?: MemoryCandidateSource;
}

export interface MemoryExtractionTrace {
  extractor: "rule_based" | "llm";
  startedAt: string;
  completedAt: string;
  model?: string;
  rawResponse?: string;
  parsedCandidateCount: number;
  validatedCandidateCount: number;
  rejectedCandidateCount: number;
  reviewAcceptedCount: number;
  reviewCandidateCount: number;
  validationErrors: string[];
  retryCount: number;
  fallbackUsed: boolean;
}

export interface MemoryExtractionInput {
  sessionId: string;
  summary: import("../context/ConversationSummary.js").ConversationSummaryV1;
  existingMemoryRefs?: string[];
  projectId?: string;
  domain?: string;
}

export interface MemoryExtractionResult {
  candidates: MemoryCandidate[];
  rejected: RejectedMemoryCandidate[];
  trace: MemoryExtractionTrace;
}
