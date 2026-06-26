/**
 * MemoryReviewPolicy — 审核策略
 *
 * v0 规则：
 * - 不自动 accept
 * - policy/system 可以 reject/expire
 * - confidence < autoRejectThreshold 自动 reject
 */

import type {
  MemoryReviewPolicy,
  MemoryReviewItem,
} from "./types.js";
import { DEFAULT_REVIEW_POLICY } from "./types.js";

export class MemoryReviewPolicyEvaluator {
  private policy: MemoryReviewPolicy;

  constructor(policy?: Partial<MemoryReviewPolicy>) {
    this.policy = { ...DEFAULT_REVIEW_POLICY, ...policy };
  }

  /**
   * 评估 candidate 是否应自动 reject
   */
  shouldAutoReject(item: MemoryReviewItem): boolean {
    return item.candidate.confidence < this.policy.autoRejectThreshold;
  }

  /**
   * 检查 queue 是否已满
   */
  isQueueFull(pendingCount: number): boolean {
    return pendingCount >= this.policy.maxPendingItems;
  }

  /**
   * 检查是否过期
   */
  isExpired(item: MemoryReviewItem): boolean {
    const now = new Date();
    const createdAt = new Date(item.createdAt);
    const expiryMs = this.policy.expiryDays * 24 * 60 * 60 * 1000;
    return now.getTime() - createdAt.getTime() > expiryMs;
  }

  /**
   * 获取策略
   */
  getPolicy(): MemoryReviewPolicy {
    return { ...this.policy };
  }
}
