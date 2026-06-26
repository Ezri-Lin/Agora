/**
 * MemoryCandidateReviewQueue — Append-only 审核队列
 *
 * 内部用 event log，对外提供 query 接口
 */

import type {
  MemoryReviewItem,
  ReviewStatus,
  ReviewQueueEvent,
  ReviewDecision,
  MemoryReviewError,
  MemoryReviewPolicy,
} from "./types.js";
import { DEFAULT_REVIEW_POLICY } from "./types.js";

export class MemoryCandidateReviewQueue {
  private events: ReviewQueueEvent[] = [];
  private items = new Map<string, MemoryReviewItem>();

  constructor(private policy: MemoryReviewPolicy = DEFAULT_REVIEW_POLICY) {}

  /**
   * 追加候选
   */
  async append(item: MemoryReviewItem): Promise<MemoryReviewError | null> {
    // 检查 queue 容量
    const pendingCount = this.getCountByStatus("pending");
    if (pendingCount >= this.policy.maxPendingItems) {
      return {
        code: "QUEUE_FULL",
        message: `Queue full: ${pendingCount} >= ${this.policy.maxPendingItems}`,
        recoverable: true,
      };
    }

    // 检查 contentHash 去重
    const existing = this.findByContentHash(item.contentHash);
    if (existing && existing.status === "pending") {
      return {
        code: "CONTENT_HASH_DUPLICATE",
        message: `Duplicate content hash: ${item.contentHash}`,
        recoverable: true,
        details: { existingId: existing.id },
      };
    }

    // 检查 provenance
    if (!item.provenance || item.provenance.sourceSpans.length === 0) {
      return {
        code: "PROVENANCE_REQUIRED",
        message: "Provenance with at least one source span is required",
        recoverable: false,
      };
    }

    // 检查 excerpt 长度
    for (const span of item.provenance.sourceSpans) {
      if (span.excerpt.length > this.policy.maxExcerptChars) {
        return {
          code: "EXCERPT_TOO_LONG",
          message: `Excerpt too long: ${span.excerpt.length} > ${this.policy.maxExcerptChars}`,
          recoverable: true,
        };
      }
    }

    // 检查 sourceSpans 数量
    if (item.provenance.sourceSpans.length > this.policy.maxSourceSpans) {
      return {
        code: "TOO_MANY_SOURCE_SPANS",
        message: `Too many source spans: ${item.provenance.sourceSpans.length} > ${this.policy.maxSourceSpans}`,
        recoverable: true,
      };
    }

    // 追加 event
    this.events.push({
      type: "item_appended",
      reviewId: item.id,
      timestamp: new Date().toISOString(),
      data: { type: "item_appended", item },
    });

    this.items.set(item.id, { ...item });

    return null;
  }

  /**
   * 记录决定
   */
  async recordDecision(decision: ReviewDecision): Promise<MemoryReviewError | null> {
    const item = this.items.get(decision.reviewId);
    if (!item) {
      return {
        code: "REVIEW_NOT_FOUND",
        message: `Review not found: ${decision.reviewId}`,
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

    // 追加 event
    this.events.push({
      type: "decision_recorded",
      reviewId: decision.reviewId,
      timestamp: new Date().toISOString(),
      data: { type: "decision_recorded", decision },
    });

    // 更新 item 状态
    item.status = decision.action === "expire" ? "expired" : `${decision.action}ed` as ReviewStatus;
    item.decidedAt = new Date().toISOString();
    item.decidedBy = decision.decidedBy;
    item.decisionReason = decision.reason;

    return null;
  }

  /**
   * 获取待审核
   */
  getPending(limit?: number): MemoryReviewItem[] {
    const pending = [...this.items.values()]
      .filter((item) => item.status === "pending")
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));

    return limit ? pending.slice(0, limit) : pending;
  }

  /**
   * 获取单条
   */
  getById(id: string): MemoryReviewItem | undefined {
    return this.items.get(id);
  }

  /**
   * 获取数量
   */
  getCount(status?: ReviewStatus): number {
    if (!status) return this.items.size;
    return this.getCountByStatus(status);
  }

  /**
   * 获取所有 events
   */
  getEvents(): ReviewQueueEvent[] {
    return [...this.events];
  }

  /**
   * 获取指定 review 的 events
   */
  getEventsForReview(reviewId: string): ReviewQueueEvent[] {
    return this.events.filter((e) => e.reviewId === reviewId);
  }

  // === Private ===

  private getCountByStatus(status: ReviewStatus): number {
    return [...this.items.values()].filter((item) => item.status === status).length;
  }

  private findByContentHash(contentHash: string): MemoryReviewItem | undefined {
    return [...this.items.values()].find((item) => item.contentHash === contentHash);
  }
}
