/**
 * Memory Candidate Review Types — v0 类型定义
 *
 * 设计原则：
 * - candidate-before-memory
 * - v0 只允许 user accept
 * - append-only event log
 * - workspace/session scope 隔离
 * - provenance 必须绑定
 */

import type { MemoryCandidate } from "../memory/MemoryCandidate.js";

// === Review Status ===

export type ReviewStatus =
  | "pending"
  | "accepted"
  | "rejected"
  | "superseded"
  | "expired";

// === Review Context ===

export interface MemoryReviewContext {
  workspaceId: string;
  projectId?: string;
  sessionId?: string;
}

// === Review Item ===

export interface MemoryReviewItem {
  id: string;
  workspaceId: string;
  projectId?: string;
  sessionId?: string;
  candidate: MemoryCandidate;
  contentHash: string;
  provenance: ReviewProvenance;
  status: ReviewStatus;
  createdAt: string;
  decidedAt?: string;
  decidedBy?: ReviewDecisionActor;
  decisionReason?: string;
}

// === Review Provenance ===

export interface ReviewProvenance {
  workspaceId: string;
  projectId?: string;
  sessionId?: string;
  councilRoundId?: string;
  roleId?: string;
  messageIds: string[];
  toolCallIds: string[];
  sourceSpans: ReviewSourceSpan[];
}

export interface ReviewSourceSpan {
  sourceType: "document" | "memory" | "tool" | "message";
  sourceId: string;
  excerpt: string;
  charRange?: { start: number; end: number };
  lineRange?: { start: number; end: number };
  trustLevel: "workspace" | "tool_untrusted" | "generated" | "external" | "user";
  provenanceStatus?: "complete" | "partial" | "missing_legacy" | "none";
}

// === Decision ===

export type ReviewDecisionActor = "user" | "policy" | "system";

export interface ReviewDecision {
  reviewId: string;
  action: "accept" | "reject" | "expire";
  reason: string;
  decidedBy: ReviewDecisionActor;
}

// === Queue Event (append-only) ===

export type ReviewQueueEventType =
  | "item_appended"
  | "decision_recorded"
  | "item_expired"
  | "item_superseded";

export interface ReviewQueueEvent {
  type: ReviewQueueEventType;
  reviewId: string;
  timestamp: string;
  data: ReviewQueueEventData;
}

export type ReviewQueueEventData =
  | { type: "item_appended"; item: MemoryReviewItem }
  | { type: "decision_recorded"; decision: ReviewDecision }
  | { type: "item_expired"; reason: string }
  | { type: "item_superseded"; supersededBy: string };

// === Policy ===

export interface MemoryReviewPolicy {
  autoRejectThreshold: number;  // confidence < 此值自动 reject
  maxPendingItems: number;
  expiryDays: number;
  allowPolicyReject: boolean;
  allowSystemExpire: boolean;
  maxExcerptChars: number;
  maxSourceSpans: number;
}

export const DEFAULT_REVIEW_POLICY: MemoryReviewPolicy = {
  autoRejectThreshold: 0.3,
  maxPendingItems: 1000,
  expiryDays: 30,
  allowPolicyReject: true,
  allowSystemExpire: true,
  maxExcerptChars: 500,
  maxSourceSpans: 20,
};

// === Errors ===

export type MemoryReviewErrorCode =
  | "REVIEW_NOT_FOUND"
  | "REVIEW_ALREADY_DECIDED"
  | "PROVENANCE_REQUIRED"
  | "POLICY_ACCEPT_DISABLED"
  | "WORKSPACE_SCOPE_MISMATCH"
  | "QUEUE_FULL"
  | "INVALID_DECISION"
  | "CONTENT_HASH_DUPLICATE"
  | "EXCERPT_TOO_LONG"
  | "TOO_MANY_SOURCE_SPANS";

export interface MemoryReviewError {
  code: MemoryReviewErrorCode;
  message: string;
  recoverable: boolean;
  details?: Record<string, unknown>;
}

// === Result ===

export type MemoryReviewResult =
  | { ok: true; item: MemoryReviewItem }
  | { ok: false; error: MemoryReviewError };

// === Helpers ===

/**
 * 计算 content hash (简单实现)
 */
export function computeContentHash(content: string): string {
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return hash.toString(36);
}

/**
 * 生成 review item ID
 */
export function generateReviewId(): string {
  return `review-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
