/**
 * EvidenceRanker — 对搜索结果进行排序
 *
 * v0.1: 基于简单规则的排序
 * - 标题/关键词匹配
 * - 原始分数
 * - 来源类型权重
 */

import type {
  EvidenceItem,
  EvidenceClaim,
} from "./EvidenceSearchTypes.js";

// === EvidenceRanker ===

export class EvidenceRanker {
  /**
   * 对 EvidenceItems 进行排序
   */
  rank(items: EvidenceItem[], query: string): EvidenceItem[] {
    const scored = items.map((item) => ({
      item,
      finalScore: this.calculateScore(item, query),
    }));

    // Sort by final score descending
    scored.sort((a, b) => b.finalScore - a.finalScore);

    return scored.map((s) => ({
      ...s.item,
      score: s.finalScore,
    }));
  }

  /**
   * 对 EvidenceClaims 进行排序
   */
  rankClaims(claims: EvidenceClaim[]): EvidenceClaim[] {
    const confidenceWeight = { high: 3, medium: 2, low: 1 };

    return [...claims].sort(
      (a, b) =>
        confidenceWeight[b.confidence] - confidenceWeight[a.confidence]
    );
  }

  // === Private Helpers ===

  private calculateScore(item: EvidenceItem, query: string): number {
    let score = item.score; // Base score from provider

    // Title match bonus
    if (this.matchesQuery(item.title, query)) {
      score += 0.2;
    }

    // Snippet match bonus
    if (this.matchesQuery(item.snippet, query)) {
      score += 0.1;
    }

    // Source type weight
    const sourceWeight = this.getSourceTypeWeight(item.sourceType);
    score *= sourceWeight;

    // Cap at 1.0
    return Math.min(score, 1.0);
  }

  private matchesQuery(text: string, query: string): boolean {
    const textLower = text.toLowerCase();
    const queryLower = query.toLowerCase();
    const queryWords = queryLower.split(/\s+/).filter((w) => w.length > 2);

    // Check if any query word appears in text
    return queryWords.some((word) => textLower.includes(word));
  }

  private getSourceTypeWeight(sourceType: string): number {
    switch (sourceType) {
      case "web":
        return 1.0;
      case "local":
        return 0.9;
      case "mcp":
        return 0.85;
      case "fixture":
        return 0.8;
      default:
        return 0.5;
    }
  }
}
