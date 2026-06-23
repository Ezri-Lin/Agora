/**
 * MemoryStoreTypes — Memory Store v0.3a 类型定义
 *
 * 设计原则：
 * - append-only 持久化
 * - 审计日志
 * - 状态分离存储
 * - 本地优先
 */

import type { MemoryCandidate } from "./MemoryCandidate.js";

// === Store Interface ===

export interface MemoryStore {
  /** 追加候选记忆 */
  appendCandidate(candidate: MemoryCandidate): Promise<void>;

  /** 批量追加候选记忆 */
  appendCandidates(candidates: MemoryCandidate[]): Promise<void>;

  /** 更新记忆状态（追加式） */
  updateStatus(input: MemoryStatusUpdate): Promise<void>;

  /** 按 ID 获取记忆 */
  getById(id: string): Promise<MemoryCandidate | null>;

  /** 列出记忆 */
  list(query?: MemoryListQuery): Promise<MemoryCandidate[]>;

  /** 追加审计事件 */
  appendAuditEvent(event: MemoryAuditEvent): Promise<void>;

  /** 获取审计日志 */
  getAuditLog(memoryId?: string): Promise<MemoryAuditEvent[]>;
}

// === Status Update ===

export interface MemoryStatusUpdate {
  id: string;
  status: MemoryCandidateStatus;
  reason: string;
  decidedBy: "policy" | "user" | "system";
  decidedAt: string;
}

export type MemoryCandidateStatus =
  | "candidate"
  | "accepted"
  | "rejected"
  | "superseded"
  | "expired"
  | "contradicted";

// === List Query ===

export interface MemoryListQuery {
  status?: MemoryCandidateStatus[];
  scope?: string[];
  type?: string[];
  tags?: string[];
  sessionId?: string;
  limit?: number;
}

// === Audit Event ===

export interface MemoryAuditEvent {
  id: string;
  memoryId: string;
  event: MemoryAuditEventType;
  reason?: string;
  actor: "policy" | "user" | "system";
  createdAt: string;
  metadata?: Record<string, unknown>;
}

export type MemoryAuditEventType =
  | "candidate_created"
  | "status_changed"
  | "memory_rejected"
  | "memory_accepted"
  | "memory_superseded"
  | "memory_expired";

// === Store Config ===

export interface LocalMemoryStoreConfig {
  /** 数据目录，默认 .agora/memory */
  dataDir: string;
  /** 是否启用审计日志，默认 true */
  enableAudit: boolean;
  /** 最大审计日志条数，默认 10000 */
  maxAuditEntries: number;
}

export const DEFAULT_STORE_CONFIG: LocalMemoryStoreConfig = {
  dataDir: ".agora/memory",
  enableAudit: true,
  maxAuditEntries: 10000,
};
