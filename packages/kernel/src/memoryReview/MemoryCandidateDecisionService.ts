/**
 * MemoryCandidateDecisionService — 处理 accept/reject
 *
 * v0 规则：
 * - accept 只允许 user
 * - policy/system 可以 reject/expire，不能 accept
 * - accept 写入 MemoryStore + ProvenanceTracker
 */

import type { MemoryStore } from "../memory/MemoryStoreTypes.js";
import type { ProvenanceTracker } from "../memory/ProvenanceTracker.js";
import type { StructuredIndexer } from "../memory/StructuredIndexer.js";
import type {
  MemoryReviewItem,
  ReviewDecision,
  MemoryReviewError,
  MemoryReviewPolicy,
  MemoryReviewContext,
} from "./types.js";
import type { MemoryCandidateReviewQueue } from "./MemoryCandidateReviewQueue.js";

export class MemoryCandidateDecisionService {
  constructor(
    private queue: MemoryCandidateReviewQueue,
    private memoryStore: MemoryStore,
    private provenanceTracker: ProvenanceTracker,
    private indexer: StructuredIndexer,
    private policy: MemoryReviewPolicy
  ) {}

  /**
   * Accept (仅 user)
   */
  async accept(
    reviewId: string,
    reason: string,
    context: MemoryReviewContext
  ): Promise<MemoryReviewError | null> {
    const item = this.queue.getById(reviewId);
    if (!item) {
      return {
        code: "REVIEW_NOT_FOUND",
        message: `Review not found: ${reviewId}`,
        recoverable: false,
      };
    }

    if (item.status !== "pending") {
      return {
        code: "REVIEW_ALREADY_DECIDED",
        message: `Review already decided: ${item.status}`,
        recoverable: false,
      };
    }

    // v0: accept 只允许 user
    // (通过 API 调用时 decidedBy 固定为 "user")

    // 检查 workspace scope
    if (item.workspaceId !== context.workspaceId) {
      return {
        code: "WORKSPACE_SCOPE_MISMATCH",
        message: `Workspace mismatch: item=${item.workspaceId}, context=${context.workspaceId}`,
        recoverable: false,
      };
    }

    // 1. 记录决定
    const decisionError = await this.queue.recordDecision({
      reviewId,
      action: "accept",
      reason,
      decidedBy: "user",
    });

    if (decisionError) return decisionError;

    // 2. 写入 MemoryStore (status = accepted)
    const acceptedCandidate = {
      ...item.candidate,
      status: "accepted" as const,
    };
    await this.memoryStore.appendCandidate(acceptedCandidate);

    // 3. 绑定 provenance
    await this.provenanceTracker.attach(
      item.candidate.id,
      item.provenance.sourceSpans.map((span) => ({
        type: span.sourceType as "message" | "document" | "external",
        ref: span.sourceId,
        excerpt: span.excerpt,
        timestamp: new Date().toISOString(),
        sourceSpan: {
          charRange: span.charRange,
          lineRange: span.lineRange,
        },
        trustLevel: span.trustLevel as "user_provided" | "workspace" | "external" | "generated",
      }))
    );

    // 4. 索引
    await this.indexer.index(acceptedCandidate);

    return null;
  }

  /**
   * Reject (user 或 policy)
   */
  async reject(
    reviewId: string,
    reason: string,
    decidedBy: "user" | "policy" = "user"
  ): Promise<MemoryReviewError | null> {
    // 检查 policy 是否允许
    if (decidedBy === "policy" && !this.policy.allowPolicyReject) {
      return {
        code: "POLICY_ACCEPT_DISABLED",
        message: "Policy reject is disabled",
        recoverable: false,
      };
    }

    const item = this.queue.getById(reviewId);
    if (!item) {
      return {
        code: "REVIEW_NOT_FOUND",
        message: `Review not found: ${reviewId}`,
        recoverable: false,
      };
    }

    if (item.status !== "pending") {
      return {
        code: "REVIEW_ALREADY_DECIDED",
        message: `Review already decided: ${item.status}`,
        recoverable: false,
      };
    }

    return this.queue.recordDecision({
      reviewId,
      action: "reject",
      reason,
      decidedBy,
    });
  }

  /**
   * 过期处理
   */
  async processExpired(): Promise<number> {
    if (!this.policy.allowSystemExpire) return 0;

    const now = new Date();
    const expiryMs = this.policy.expiryDays * 24 * 60 * 60 * 1000;
    let expiredCount = 0;

    const pending = this.queue.getPending();
    for (const item of pending) {
      const createdAt = new Date(item.createdAt);
      if (now.getTime() - createdAt.getTime() > expiryMs) {
        await this.queue.recordDecision({
          reviewId: item.id,
          action: "expire",
          reason: `Expired after ${this.policy.expiryDays} days`,
          decidedBy: "system",
        });
        expiredCount++;
      }
    }

    return expiredCount;
  }
}
