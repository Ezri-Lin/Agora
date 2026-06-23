/**
 * MemoryConsolidationPolicy — 策略规则
 *
 * 定义 consolidation 的前置条件检查
 */

import type { MemoryCandidate } from "./MemoryCandidate.js";
import type { MemoryStore } from "./MemoryStoreTypes.js";

// === Policy Errors ===

export class ConsolidationPolicyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConsolidationPolicyError";
  }
}

// === Policy Checks ===

export class MemoryConsolidationPolicy {
  constructor(private store: MemoryStore) {}

  /**
   * 检查 supersede 是否允许
   * 规则：
   * - old 和 new 都必须存在
   * - old 和 new 都必须是 accepted 状态
   * - old 和 new 不能是同一个 ID
   */
  async checkSupersede(
    oldId: string,
    newId: string
  ): Promise<{ allowed: boolean; error?: string }> {
    if (oldId === newId) {
      return { allowed: false, error: "Cannot supersede memory with itself" };
    }

    const old = await this.store.getById(oldId);
    if (!old) {
      return { allowed: false, error: `Old memory not found: ${oldId}` };
    }

    const newMem = await this.store.getById(newId);
    if (!newMem) {
      return { allowed: false, error: `New memory not found: ${newId}` };
    }

    if (old.status !== "accepted") {
      return {
        allowed: false,
        error: `Old memory status must be accepted, got: ${old.status}`,
      };
    }

    if (newMem.status !== "accepted") {
      return {
        allowed: false,
        error: `New memory status must be accepted, got: ${newMem.status}`,
      };
    }

    return { allowed: true };
  }

  /**
   * 检查 expire 是否允许
   * 规则：
   * - 记忆必须存在
   * - 记忆必须是 accepted 或 candidate 状态
   */
  async checkExpire(
    id: string
  ): Promise<{ allowed: boolean; error?: string }> {
    const memory = await this.store.getById(id);
    if (!memory) {
      return { allowed: false, error: `Memory not found: ${id}` };
    }

    if (memory.status !== "accepted" && memory.status !== "candidate") {
      return {
        allowed: false,
        error: `Memory status must be accepted or candidate, got: ${memory.status}`,
      };
    }

    return { allowed: true };
  }

  /**
   * 检查 contradict 是否允许
   * 规则：
   * - 两个记忆都必须存在
   * - 被矛盾的记忆必须是 accepted 状态
   * - 矛盾的记忆必须是 accepted 状态
   * - 不能自己矛盾自己
   */
  async checkContradict(
    id: string,
    contradictedBy: string
  ): Promise<{ allowed: boolean; error?: string }> {
    if (id === contradictedBy) {
      return {
        allowed: false,
        error: "Cannot contradict memory with itself",
      };
    }

    const memory = await this.store.getById(id);
    if (!memory) {
      return { allowed: false, error: `Memory not found: ${id}` };
    }

    const contradicter = await this.store.getById(contradictedBy);
    if (!contradicter) {
      return {
        allowed: false,
        error: `Contradicting memory not found: ${contradictedBy}`,
      };
    }

    if (memory.status !== "accepted") {
      return {
        allowed: false,
        error: `Memory status must be accepted, got: ${memory.status}`,
      };
    }

    if (contradicter.status !== "accepted") {
      return {
        allowed: false,
        error: `Contradicting memory status must be accepted, got: ${contradicter.status}`,
      };
    }

    return { allowed: true };
  }

  /**
   * 检查 deduplicate 是否允许
   * 规则：
   * - 候选必须存在
   * - 候选必须是 candidate 状态
   */
  async checkDeduplicate(
    candidateId: string
  ): Promise<{ allowed: boolean; duplicates: MemoryCandidate[]; error?: string }> {
    const candidate = await this.store.getById(candidateId);
    if (!candidate) {
      return {
        allowed: false,
        duplicates: [],
        error: `Candidate not found: ${candidateId}`,
      };
    }

    if (candidate.status !== "candidate") {
      return {
        allowed: false,
        duplicates: [],
        error: `Candidate status must be candidate, got: ${candidate.status}`,
      };
    }

    // Find duplicates: same type, same scope, same normalized content
    const allMemories = await this.store.list({
      type: [candidate.type],
      scope: [candidate.scope],
    });

    const normalizedContent = this.normalizeContent(candidate.content);
    const duplicates = allMemories.filter((m) => {
      if (m.id === candidateId) return false;
      if (m.status === "rejected" || m.status === "expired") return false;

      const mNormalized = this.normalizeContent(m.content);
      return mNormalized === normalizedContent;
    });

    return {
      allowed: duplicates.length > 0,
      duplicates,
      error:
        duplicates.length === 0 ? "No duplicates found" : undefined,
    };
  }

  // === Helpers ===

  private normalizeContent(content: string): string {
    return content
      .toLowerCase()
      .replace(/\s+/g, " ")
      .trim();
  }
}
