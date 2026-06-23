/**
 * LocalMemoryRetriever — keyword/filter memory retrieval
 *
 * 设计原则：
 * - keyword/filter retrieval only
 * - deterministic scoring
 * - budget control
 * - terminal statuses excluded by default
 */

import type {
  MemoryRetriever,
  MemoryRetrievalQuery,
  MemoryRetrievalResult,
  RetrievedMemory,
  MemoryRetrievalTrace,
  MemoryRetrievalBudget,
  MatchType,
} from "./MemoryRetrievalTypes.js";
import { DEFAULT_RETRIEVAL_BUDGET } from "./MemoryRetrievalTypes.js";
import type { MemoryStore } from "./MemoryStoreTypes.js";
import type { MemoryCandidate } from "./MemoryCandidate.js";

// === Scoring Weights ===

const SCORE_WEIGHTS = {
  keyword: 5,
  tag: 3,
  type: 2,
  scope: 2,
  recent: 1,
  accepted: 3,
  candidate: -5,
} as const;

// === Terminal Statuses ===

const TERMINAL_STATUSES: MemoryCandidate["status"][] = [
  "rejected",
  "expired",
  "superseded",
  "contradicted",
];

// === LocalMemoryRetriever ===

export class LocalMemoryRetriever implements MemoryRetriever {
  private store: MemoryStore;
  private budget: MemoryRetrievalBudget;

  constructor(
    store: MemoryStore,
    budget: Partial<MemoryRetrievalBudget> = {}
  ) {
    this.store = store;
    this.budget = { ...DEFAULT_RETRIEVAL_BUDGET, ...budget };
  }

  async retrieve(query: MemoryRetrievalQuery): Promise<MemoryRetrievalResult> {
    const startedAt = new Date().toISOString();

    // Build store query
    const storeQuery = this.buildStoreQuery(query);

    // Get all matching memories from store
    const allMemories = await this.store.list(storeQuery);
    const totalScanned = allMemories.length;

    // Score and filter
    const scored: RetrievedMemory[] = [];

    for (const candidate of allMemories) {
      const { score, matchedBy } = this.scoreCandidate(candidate, query);

      // If text query is provided, only include memories that match the keyword
      if (query.text) {
        if (matchedBy.includes("keyword")) {
          scored.push({ candidate, score, matchedBy });
        }
      } else {
        // No text query, include all memories with any match
        if (matchedBy.length > 0) {
          scored.push({ candidate, score, matchedBy });
        }
      }
    }

    // Sort by score descending
    scored.sort((a, b) => b.score - a.score);

    // Apply budget
    const budgetApplied =
      scored.length > this.budget.maxItems ||
      this.calculateContentChars(scored) > this.budget.maxContentChars;

    const trimmed = this.applyBudget(scored);

    const trace: MemoryRetrievalTrace = {
      query,
      totalScanned,
      totalMatched: scored.length,
      returned: trimmed.length,
      budgetApplied,
      createdAt: startedAt,
    };

    return {
      memories: trimmed,
      trace,
    };
  }

  // === Private Helpers ===

  private buildStoreQuery(query: MemoryRetrievalQuery) {
    // Determine status filter
    let status = query.status;
    if (!query.includeTerminalStatuses && !status) {
      // Default: exclude terminal statuses
      status = ["accepted", "candidate"];
    }

    return {
      status,
      scope: query.scope,
      type: query.type,
      tags: query.tags,
      sessionId: query.sessionId,
      limit: undefined, // We'll apply budget later
    };
  }

  private scoreCandidate(
    candidate: MemoryCandidate,
    query: MemoryRetrievalQuery
  ): { score: number; matchedBy: MatchType[] } {
    let score = 0;
    const matchedBy: MatchType[] = [];

    // Keyword match
    if (query.text) {
      const textLower = query.text.toLowerCase();
      const contentLower = candidate.content.toLowerCase();

      if (contentLower.includes(textLower)) {
        score += SCORE_WEIGHTS.keyword;
        matchedBy.push("keyword");
      }

      // Also check tags for keyword match
      for (const tag of candidate.tags) {
        if (tag.toLowerCase().includes(textLower)) {
          score += SCORE_WEIGHTS.tag;
          if (!matchedBy.includes("tag")) {
            matchedBy.push("tag");
          }
          break;
        }
      }
    }

    // Tag match
    if (query.tags && query.tags.length > 0) {
      const queryTags = new Set(query.tags.map((t) => t.toLowerCase()));
      const hasTagMatch = candidate.tags.some((t) =>
        queryTags.has(t.toLowerCase())
      );
      if (hasTagMatch) {
        score += SCORE_WEIGHTS.tag;
        if (!matchedBy.includes("tag")) {
          matchedBy.push("tag");
        }
      }
    }

    // Type match
    if (query.type && query.type.includes(candidate.type)) {
      score += SCORE_WEIGHTS.type;
      matchedBy.push("type");
    }

    // Scope match
    if (query.scope && query.scope.includes(candidate.scope)) {
      score += SCORE_WEIGHTS.scope;
      matchedBy.push("scope");
    }

    // Session match
    if (query.sessionId && candidate.source.sessionId === query.sessionId) {
      score += 1;
      matchedBy.push("session");
    }

    // Status scoring
    if (candidate.status === "accepted") {
      score += SCORE_WEIGHTS.accepted;
      matchedBy.push("status");
    } else if (candidate.status === "candidate") {
      score += SCORE_WEIGHTS.candidate;
    }

    // Recency bonus (within last 7 days)
    const createdAt = new Date(candidate.createdAt);
    const now = new Date();
    const daysDiff =
      (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24);
    if (daysDiff <= 7) {
      score += SCORE_WEIGHTS.recent;
    }

    return { score, matchedBy };
  }

  private calculateContentChars(memories: RetrievedMemory[]): number {
    return memories.reduce(
      (total, m) => total + m.candidate.content.length,
      0
    );
  }

  private applyBudget(memories: RetrievedMemory[]): RetrievedMemory[] {
    let result = memories;
    let totalChars = 0;
    const limited: RetrievedMemory[] = [];

    for (const memory of result) {
      if (limited.length >= this.budget.maxItems) break;

      const contentChars = memory.candidate.content.length;
      if (totalChars + contentChars > this.budget.maxContentChars) break;

      limited.push(memory);
      totalChars += contentChars;
    }

    return limited;
  }
}
