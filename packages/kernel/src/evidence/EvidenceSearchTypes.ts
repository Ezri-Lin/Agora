/**
 * EvidenceSearchTypes — Evidence Search v0.1 类型定义
 *
 * 设计原则：
 * - read-only network tool
 * - built on Tool Runtime
 * - claim must be source-bound
 * - deterministic eval with mock provider
 */

// === Evidence Packet ===

export interface EvidencePacket {
  /** 唯一标识 */
  id: string;
  /** 查询内容 */
  query: string;
  /** 搜索结果 */
  results: EvidenceItem[];
  /** 提取的声明 */
  extractedClaims: EvidenceClaim[];
  /** 不确定性等级 */
  uncertainty: "low" | "medium" | "high";
  /** 检索追踪 */
  retrievalTrace: EvidenceRetrievalTrace;
  /** 创建时间 */
  createdAt: string;
}

// === Evidence Item ===

export interface EvidenceItem {
  /** 唯一标识 */
  id: string;
  /** 标题 */
  title: string;
  /** URL 或来源引用 */
  url: string;
  /** 摘要/片段 */
  snippet: string;
  /** 来源类型 */
  sourceType: "web" | "local" | "mcp" | "fixture";
  /** 检索时间 */
  retrievedAt: string;
  /** 相关性分数 */
  score: number;
}

// === Evidence Claim ===

export interface EvidenceClaim {
  /** 唯一标识 */
  id: string;
  /** 声明内容 */
  claim: string;
  /** 来源 item IDs */
  sourceItemIds: string[];
  /** 置信度 */
  confidence: "low" | "medium" | "high";
}

// === Evidence Retrieval Trace ===

export interface EvidenceRetrievalTrace {
  /** provider 名称 */
  provider: string;
  /** 查询内容 */
  query: string;
  /** 结果数量 */
  resultCount: number;
  /** 提取的声明数量 */
  extractedClaimCount: number;
  /** 工具调用 ID */
  toolInvocationId?: string;
  /** 开始时间 */
  startedAt: string;
  /** 完成时间 */
  completedAt: string;
}

// === Search Provider ===

export interface EvidenceSearchProvider {
  /** Provider 名称 */
  name: string;

  /** 执行搜索 */
  search(query: string, limit?: number): Promise<EvidenceSearchResult[]>;
}

export interface EvidenceSearchResult {
  /** 标题 */
  title: string;
  /** URL */
  url: string;
  /** 摘要 */
  snippet: string;
  /** 来源类型 */
  sourceType: "web" | "local" | "mcp" | "fixture";
  /** 相关性分数 */
  score: number;
}

// === Search Tool Input/Output ===

export interface EvidenceSearchInput {
  /** 查询内容 */
  query: string;
  /** 结果数量限制 */
  limit?: number;
}

export interface EvidenceSearchOutput {
  /** Evidence Packet */
  packet: EvidencePacket;
}
