/**
 * MemoryRetrievalTypes — Memory Retriever v0.3b 类型定义
 *
 * 设计原则：
 * - keyword/filter retrieval only
 * - no semantic/vector search
 * - deterministic scoring
 * - budget control
 */

import type { MemoryCandidate } from "./MemoryCandidate.js";

// === Retrieval Query ===

export interface MemoryRetrievalQuery {
  /** 关键词搜索（匹配 content） */
  text?: string;
  /** 状态过滤 */
  status?: MemoryCandidate["status"][];
  /** 范围过滤 */
  scope?: MemoryCandidate["scope"][];
  /** 类型过滤 */
  type?: MemoryCandidate["type"][];
  /** 标签过滤 */
  tags?: string[];
  /** 会话 ID 过滤 */
  sessionId?: string;
  /** 项目 ID 过滤 */
  projectId?: string;
  /** 领域过滤 */
  domain?: string;
  /** 返回数量限制 */
  limit?: number;
  /** 是否包含终态记忆（rejected/expired/superseded/contradicted） */
  includeTerminalStatuses?: boolean;
}

// === Retrieval Result ===

export interface MemoryRetrievalResult {
  /** 检索到的记忆 */
  memories: RetrievedMemory[];
  /** 检索追踪信息 */
  trace: MemoryRetrievalTrace;
}

export interface RetrievedMemory {
  /** 原始记忆候选 */
  candidate: MemoryCandidate;
  /** 相关性分数 */
  score: number;
  /** 匹配方式 */
  matchedBy: MatchType[];
}

export type MatchType =
  | "keyword"
  | "tag"
  | "scope"
  | "type"
  | "status"
  | "session"
  | "project"
  | "domain";

// === Retrieval Trace ===

export interface MemoryRetrievalTrace {
  /** 查询参数 */
  query: MemoryRetrievalQuery;
  /** 扫描总数 */
  totalScanned: number;
  /** 匹配总数 */
  totalMatched: number;
  /** 返回数量 */
  returned: number;
  /** 是否应用了预算限制 */
  budgetApplied: boolean;
  /** 创建时间 */
  createdAt: string;
}

// === Retrieval Budget ===

export interface MemoryRetrievalBudget {
  /** 最大返回条数，默认 10 */
  maxItems: number;
  /** 最大内容字符数，默认 4000 */
  maxContentChars: number;
}

export const DEFAULT_RETRIEVAL_BUDGET: MemoryRetrievalBudget = {
  maxItems: 10,
  maxContentChars: 4000,
};

// === Retriever Interface ===

export interface MemoryRetriever {
  /** 检索记忆 */
  retrieve(query: MemoryRetrievalQuery): Promise<MemoryRetrievalResult>;
}
