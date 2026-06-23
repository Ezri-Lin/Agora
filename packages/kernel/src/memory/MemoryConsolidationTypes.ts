/**
 * MemoryConsolidationTypes — Memory Consolidator v0.3c 类型定义
 *
 * 设计原则：
 * - deterministic/policy-based only
 * - no LLM merge
 * - no semantic dedupe
 * - append-only status transitions
 * - audit events for every transition
 */

// === Consolidation Action ===

export type ConsolidationAction =
  | "supersede"
  | "expire"
  | "contradict"
  | "deduplicate"
  | "noop";

// === Consolidation Input ===

export interface SupersedeInput {
  oldId: string;
  newId: string;
  reason: string;
  actor: "policy" | "user" | "system";
  dryRun?: boolean;
}

export interface ExpireInput {
  id: string;
  reason: string;
  actor: "policy" | "user" | "system";
  dryRun?: boolean;
}

export interface ContradictInput {
  id: string;
  contradictedBy: string;
  reason: string;
  actor: "policy" | "user" | "system";
  dryRun?: boolean;
}

export interface DeduplicateInput {
  candidateId: string;
  dryRun?: boolean;
}

// === Consolidation Result ===

export interface MemoryConsolidationResult {
  action: ConsolidationAction;
  affectedMemoryIds: string[];
  auditEventIds: string[];
  trace: MemoryConsolidationTrace;
}

export interface MemoryConsolidationTrace {
  startedAt: string;
  completedAt: string;
  scanned: number;
  matched: number;
  action: ConsolidationAction;
  reason: string;
  dryRun: boolean;
}

// === Consolidator Interface ===

export interface MemoryConsolidator {
  /** 新记忆替代旧记忆 */
  supersede(input: SupersedeInput): Promise<MemoryConsolidationResult>;

  /** 标记记忆为过期 */
  expire(input: ExpireInput): Promise<MemoryConsolidationResult>;

  /** 标记记忆被矛盾 */
  contradict(input: ContradictInput): Promise<MemoryConsolidationResult>;

  /** 去重候选记忆 */
  deduplicate(input: DeduplicateInput): Promise<MemoryConsolidationResult>;
}
