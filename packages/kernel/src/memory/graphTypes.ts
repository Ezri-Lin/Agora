/**
 * Memory Graph Types — v0 类型定义
 *
 * 设计原则：
 * - 基于现有 MemoryCandidate 扩展，不修改现有类型
 * - Provenance 作为旁路索引，不侵入 MemoryCandidate
 * - Append-only graph, tombstone deletion
 * - Deterministic query scoring
 */

import type { MemoryCandidate, MemoryType, MemoryScope } from "./MemoryCandidate.js";
import type { MemoryCandidateStatus } from "./MemoryStoreTypes.js";

// === Edge Types ===

/**
 * Edge direction rule:
 * from = active / newer / asserting memory
 * to = referenced / older / target memory
 *
 * Examples:
 * - A derived_from B: A is derived from B
 * - A supports B: A supports B
 * - A contradicts B: A contradicts B
 * - A supersedes B: A replaces B
 * - A rejected_alternative B: A is a rejected alternative to B
 */
export type MemoryEdgeType =
  | "derived_from"
  | "supports"
  | "contradicts"
  | "supersedes"
  | "related_to"
  | "rejected_alternative";

export interface MemoryEdge {
  id: string;
  from: string;  // memory id (active/newer/asserting)
  to: string;    // memory id (referenced/older/target)
  type: MemoryEdgeType;
  weight: number;  // 0-1
  createdAt: string;
}

// Append-only edge record with tombstone support
export interface MemoryEdgeRecord {
  id: string;
  edge: MemoryEdge;
  status: "active" | "deleted" | "superseded";
  createdAt: string;
  updatedAt: string;
}

// === Provenance Types ===

export type ProvenanceStatus = "complete" | "partial" | "missing_legacy";

export type TrustLevel = "user_provided" | "workspace" | "external" | "generated";

export interface ProvenanceSource {
  type: "message" | "document" | "external";
  ref: string;  // message id, doc path, URL
  excerpt: string;
  timestamp: string;

  // Source span for traceability
  sourceSpan?: {
    charRange?: { start: number; end: number };
    lineRange?: { start: number; end: number };
  };

  // Content hash for drift detection
  contentHash?: string;

  // Trust level
  trustLevel?: TrustLevel;
}

export interface RationaleStep {
  step: number;
  summary: string;  // 可审计 rationale summary, 不是 chain-of-thought
  evidenceRefs: string[];
  confidence: number;
}

export interface ProvenanceChain {
  memoryId: string;
  provenanceStatus: ProvenanceStatus;
  sources: ProvenanceSource[];
  derivedFrom: string[];  // parent memory ids
  rationaleSteps: RationaleStep[];
}

export interface ProvenanceValidation {
  valid: boolean;
  issues: string[];
}

// === Graph Traversal ===

export interface MemoryGraphNeighbor {
  memoryId: string;
  distance: number;
  edges: MemoryEdge[];
}

export interface MemoryGraphTraversal {
  root: string;
  nodes: Map<string, MemoryGraphNeighbor>;
  edges: MemoryEdge[];
  depth: number;
}

// === Query Types ===

export interface MemoryQueryContext {
  workspaceId: string;
  projectId?: string;
  sessionId?: string;
}

export interface MemoryQuery {
  // 内容搜索 (keyword, 不用 embedding)
  text?: string;

  // 结构化过滤
  type?: MemoryType[];
  scope?: MemoryScope[];
  status?: MemoryCandidateStatus[];
  tags?: string[];

  // 时间过滤
  createdAfter?: string;
  createdBefore?: string;

  // 来源过滤
  sessionId?: string;
  projectId?: string;

  // 图查询
  relatedTo?: string;
  derivedFrom?: string;

  // 排序
  sortBy?: "relevance" | "time" | "confidence";
  sortOrder?: "asc" | "desc";

  // 分页
  limit?: number;
  offset?: number;
}

export interface MemoryQueryResult {
  memories: MemoryQueryHit[];
  total: number;
  trace: QueryTrace;
}

export interface MemoryQueryHit {
  memory: MemoryCandidate;
  score: number;
  matchReasons: string[];
  relatedMemories?: MemoryEdge[];
  provenance?: ProvenanceChain;
}

export interface QueryTrace {
  query: MemoryQuery;
  totalScanned: number;
  totalMatched: number;
  returned: number;
  scoreFormula: string;
  timestamp: string;
}

// === Index Types ===

export interface MemoryIndexEntry {
  id: string;
  type: MemoryType;
  scope: MemoryScope;
  tags: string[];
  status: MemoryCandidateStatus;
  createdAt: string;
  updatedAt: string;
  contentHash: string;
  keywords: string[];
}

export interface IndexStats {
  totalEntries: number;
  byType: Record<string, number>;
  byStatus: Record<string, number>;
  byScope: Record<string, number>;
}

// === Error Types ===

export type MemoryQueryErrorCode =
  | "MEMORY_NOT_FOUND"
  | "INVALID_QUERY"
  | "UNSUPPORTED_CROSS_WORKSPACE_QUERY"
  | "PROVENANCE_MISSING"
  | "INDEX_NOT_READY"
  | "GRAPH_TRAVERSAL_LIMIT_EXCEEDED";

export interface MemoryQueryError {
  code: MemoryQueryErrorCode;
  message: string;
  recoverable: boolean;
  details?: Record<string, unknown>;
}

// === Tool Output Union ===

export type MemoryToolOutput =
  | { ok: true; result: MemoryQueryResult | MemoryQueryHit | MemoryGraphTraversal }
  | { ok: false; error: MemoryQueryError; trace?: QueryTrace };

// === Constants ===

export const MAX_RELATED_DEPTH = 3;
export const MAX_RELATED_NODES = 50;

export const QUERY_SCORE_WEIGHTS = {
  keyword: 0.45,
  filterMatch: 0.20,
  recency: 0.15,
  confidence: 0.10,
  graphProximity: 0.10,
} as const;

export const DEFAULT_QUERY_LIMIT = 10;
export const MAX_QUERY_LIMIT = 100;
