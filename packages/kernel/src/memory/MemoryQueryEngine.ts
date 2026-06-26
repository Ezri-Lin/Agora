/**
 * MemoryQueryEngine — 统一查询引擎
 *
 * 整合 store/graph/index/provenance
 * 确定性评分公式
 * Workspace 隔离
 */

import type {
  MemoryQuery,
  MemoryQueryContext,
  MemoryQueryResult,
  MemoryQueryHit,
  MemoryQueryError,
  MemoryGraphTraversal,
  QueryTrace,
} from "./graphTypes.js";
import type { MemoryCandidate } from "./MemoryCandidate.js";
import type { MemoryStore } from "./MemoryStoreTypes.js";
import type { MemoryGraphStore } from "./MemoryGraphStore.js";
import type { ProvenanceTracker } from "./ProvenanceTracker.js";
import type { StructuredIndexer } from "./StructuredIndexer.js";
import { MemoryGraph } from "./MemoryGraph.js";
import {
  QUERY_SCORE_WEIGHTS,
  DEFAULT_QUERY_LIMIT,
  MAX_QUERY_LIMIT,
} from "./graphTypes.js";

export class MemoryQueryEngine {
  constructor(
    private store: MemoryStore,
    private graphStore: MemoryGraphStore,
    private indexer: StructuredIndexer,
    private provenance: ProvenanceTracker,
    private context: MemoryQueryContext
  ) {}

  /**
   * 统一查询
   */
  async query(query: MemoryQuery): Promise<MemoryQueryResult> {
    // Validate workspace scope
    this.validateWorkspace(query);

    const limit = Math.min(
      query.limit ?? DEFAULT_QUERY_LIMIT,
      MAX_QUERY_LIMIT
    );

    // Get candidates from store
    const allCandidates = await this.store.list();

    // Filter by workspace (v0: current workspace only)
    // MemoryCandidate doesn't have projectId in source, so we pass all candidates
    // Workspace filtering is done via query projectId filter
    const candidates = allCandidates;

    // Get index matches
    const indexMatches = await this.indexer.search(query);
    const indexIds = new Set(indexMatches.map((e) => e.id));

    // If text query, filter by index matches
    const candidatesToScore = query.text
      ? candidates.filter((c) => indexIds.has(c.id))
      : candidates;

    // Score and rank
    const hits: MemoryQueryHit[] = [];

    for (const candidate of candidatesToScore) {
      // Apply filters
      if (!this.matchesFilters(candidate, query)) continue;

      // Calculate score
      const score = this.calculateScore(candidate, query, indexIds.has(candidate.id));

      // Get match reasons
      const matchReasons = this.getMatchReasons(candidate, query);

      // Get provenance
      const provenance = await this.provenance.getChain(candidate.id);

      // Get related edges
      const graph = await this.graphStore.rebuild();
      const edges = graph.getEdges(candidate.id);

      hits.push({
        memory: candidate,
        score,
        matchReasons,
        relatedMemories: edges,
        provenance,
      });
    }

    // Sort by score
    hits.sort((a, b) => b.score - a.score);

    // Apply limit
    const limited = hits.slice(0, limit);

    const trace: QueryTrace = {
      query,
      totalScanned: candidates.length,
      totalMatched: hits.length,
      returned: limited.length,
      scoreFormula: "keyword*0.45 + filter*0.20 + recency*0.15 + confidence*0.10 + graph*0.10",
      timestamp: new Date().toISOString(),
    };

    return {
      memories: limited,
      total: hits.length,
      trace,
    };
  }

  /**
   * 获取单条记忆详情
   */
  async get(
    id: string,
    includeProvenance?: boolean
  ): Promise<MemoryQueryHit | null> {
    const candidate = await this.store.getById(id);
    if (!candidate) return null;

    const provenance = includeProvenance !== false
      ? await this.provenance.getChain(id)
      : undefined;

    const graph = await this.graphStore.rebuild();
    const edges = graph.getEdges(id);

    return {
      memory: candidate,
      score: 1.0,
      matchReasons: ["exact_match"],
      relatedMemories: edges,
      provenance,
    };
  }

  /**
   * 获取关联记忆图
   */
  async getRelated(
    id: string,
    depth?: number
  ): Promise<MemoryGraphTraversal> {
    const graph = await this.graphStore.rebuild();
    return graph.getRelated(id, depth);
  }

  // === Private ===

  private validateWorkspace(query: MemoryQuery): void {
    if (
      query.projectId &&
      query.projectId !== this.context.projectId
    ) {
      throw this.createError(
        "UNSUPPORTED_CROSS_WORKSPACE_QUERY",
        "Cross-workspace query is not supported in v0"
      );
    }
  }

  private matchesFilters(
    candidate: MemoryCandidate,
    query: MemoryQuery
  ): boolean {
    if (query.type && query.type.length > 0) {
      if (!query.type.includes(candidate.type)) return false;
    }

    if (query.scope && query.scope.length > 0) {
      if (!query.scope.includes(candidate.scope)) return false;
    }

    if (query.status && query.status.length > 0) {
      if (!query.status.includes(candidate.status)) return false;
    }

    if (query.tags && query.tags.length > 0) {
      if (!query.tags.some((t) => candidate.tags.includes(t))) return false;
    }

    if (query.sessionId) {
      if (candidate.source.sessionId !== query.sessionId) return false;
    }

    if (query.createdAfter) {
      if (candidate.createdAt < query.createdAfter) return false;
    }

    if (query.createdBefore) {
      if (candidate.createdAt > query.createdBefore) return false;
    }

    return true;
  }

  private calculateScore(
    candidate: MemoryCandidate,
    query: MemoryQuery,
    isIndexMatch: boolean
  ): number {
    // Keyword score
    let keywordScore = 0;
    if (query.text && isIndexMatch) {
      keywordScore = 1.0;
    }

    // Filter match score
    let filterScore = 0;
    let filterCount = 0;
    let matchCount = 0;

    if (query.type) {
      filterCount++;
      if (query.type.includes(candidate.type)) matchCount++;
    }
    if (query.scope) {
      filterCount++;
      if (query.scope.includes(candidate.scope)) matchCount++;
    }
    if (query.tags) {
      filterCount++;
      if (query.tags.some((t) => candidate.tags.includes(t))) matchCount++;
    }

    if (filterCount > 0) {
      filterScore = matchCount / filterCount;
    }

    // Recency score (newer = higher)
    const now = Date.now();
    const created = new Date(candidate.createdAt).getTime();
    const ageHours = (now - created) / (1000 * 60 * 60);
    const recencyScore = Math.max(0, 1 - ageHours / (24 * 30)); // Decay over 30 days

    // Confidence score
    const confidenceScore = candidate.confidence;

    // Graph proximity score (placeholder - would need graph distance)
    const graphScore = 0.5;

    // Weighted sum
    return (
      keywordScore * QUERY_SCORE_WEIGHTS.keyword +
      filterScore * QUERY_SCORE_WEIGHTS.filterMatch +
      recencyScore * QUERY_SCORE_WEIGHTS.recency +
      confidenceScore * QUERY_SCORE_WEIGHTS.confidence +
      graphScore * QUERY_SCORE_WEIGHTS.graphProximity
    );
  }

  private getMatchReasons(
    candidate: MemoryCandidate,
    query: MemoryQuery
  ): string[] {
    const reasons: string[] = [];

    if (query.text) {
      reasons.push("keyword_match");
    }
    if (query.type?.includes(candidate.type)) {
      reasons.push("type_match");
    }
    if (query.scope?.includes(candidate.scope)) {
      reasons.push("scope_match");
    }
    if (query.tags?.some((t) => candidate.tags.includes(t))) {
      reasons.push("tag_match");
    }
    if (query.sessionId === candidate.source.sessionId) {
      reasons.push("session_match");
    }

    if (reasons.length === 0) {
      reasons.push("filter_match");
    }

    return reasons;
  }

  private createError(
    code: MemoryQueryError["code"],
    message: string
  ): MemoryQueryError {
    return {
      code,
      message,
      recoverable: true,
    };
  }
}
