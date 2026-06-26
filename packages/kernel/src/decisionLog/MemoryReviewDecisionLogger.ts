/**
 * MemoryReviewDecisionLogger — 把 Memory Review 决策写入 DecisionLog
 *
 * 包装 MemoryCandidateDecisionService，在 accept/reject 时自动记录日志
 */

import type { MemoryStore } from "../memory/MemoryStoreTypes.js";
import type { ProvenanceTracker } from "../memory/ProvenanceTracker.js";
import type { StructuredIndexer } from "../memory/StructuredIndexer.js";
import type { MemoryCandidateReviewQueue } from "../memoryReview/MemoryCandidateReviewQueue.js";
import type { MemoryReviewPolicy, MemoryReviewContext, MemoryReviewError } from "../memoryReview/types.js";
import { MemoryCandidateDecisionService } from "../memoryReview/MemoryCandidateDecisionService.js";
import type { DecisionLogWriter } from "./DecisionLogWriter.js";

export class MemoryReviewDecisionLogger {
  private service: MemoryCandidateDecisionService;

  constructor(
    queue: MemoryCandidateReviewQueue,
    memoryStore: MemoryStore,
    provenanceTracker: ProvenanceTracker,
    indexer: StructuredIndexer,
    policy: MemoryReviewPolicy,
    private logWriter: DecisionLogWriter
  ) {
    this.service = new MemoryCandidateDecisionService(
      queue,
      memoryStore,
      provenanceTracker,
      indexer,
      policy
    );
  }

  /**
   * Accept (user only) + 写入 DecisionLog
   */
  async accept(
    reviewId: string,
    reason: string,
    context: MemoryReviewContext
  ): Promise<MemoryReviewError | null> {
    const error = await this.service.accept(reviewId, reason, context);
    if (error) return error;

    // 写入 DecisionLog
    const item = await this.service["queue"].getById(reviewId);
    if (item) {
      await this.logWriter.logMemoryCandidateAccepted({
        workspaceId: context.workspaceId,
        projectId: context.projectId,
        sessionId: context.sessionId,
        councilRoundId: item.provenance.councilRoundId,
        reviewId,
        candidateId: item.candidate.id,
        reason,
        sourceRefs: item.provenance.sourceSpans.map((span) => ({
          type: "memory_review" as const,
          id: span.sourceId,
          excerpt: span.excerpt.slice(0, 100),
        })),
      });
    }

    return null;
  }

  /**
   * Reject + 写入 DecisionLog
   */
  async reject(
    reviewId: string,
    reason: string,
    decidedBy: "user" | "policy" = "user"
  ): Promise<MemoryReviewError | null> {
    const error = await this.service.reject(reviewId, reason, decidedBy);
    if (error) return error;

    // 写入 DecisionLog
    const item = await this.service["queue"].getById(reviewId);
    if (item) {
      await this.logWriter.logMemoryCandidateRejected({
        workspaceId: item.workspaceId,
        projectId: item.projectId,
        sessionId: item.sessionId,
        councilRoundId: item.provenance.councilRoundId,
        reviewId,
        candidateId: item.candidate.id,
        reason,
        decidedBy,
      });
    }

    return null;
  }

  /**
   * 过期处理 + 写入 DecisionLog
   */
  async processExpired(): Promise<number> {
    const count = await this.service.processExpired();
    // 过期日志已在 DecisionService 中处理
    return count;
  }
}
