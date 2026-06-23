/**
 * ContentExtractor — 从搜索结果中提取 claims
 *
 * v0.1: 简单的基于规则的提取
 * 不使用 LLM，只做 deterministic 提取
 */

import type {
  EvidenceItem,
  EvidenceClaim,
} from "./EvidenceSearchTypes.js";

// === ContentExtractor ===

export class ContentExtractor {
  /**
   * 从 EvidenceItems 中提取 claims
   */
  extract(items: EvidenceItem[]): EvidenceClaim[] {
    const claims: EvidenceClaim[] = [];

    for (const item of items) {
      const itemClaims = this.extractFromItem(item);
      claims.push(...itemClaims);
    }

    return claims;
  }

  // === Private Helpers ===

  private extractFromItem(item: EvidenceItem): EvidenceClaim[] {
    const claims: EvidenceClaim[] = [];

    // Extract sentences that look like claims
    const sentences = this.splitIntoSentences(item.snippet);

    for (const sentence of sentences) {
      if (this.isClaim(sentence)) {
        claims.push({
          id: `claim-${item.id}-${claims.length}`,
          claim: sentence.trim(),
          sourceItemIds: [item.id],
          confidence: this.assessConfidence(sentence),
        });
      }
    }

    return claims;
  }

  private splitIntoSentences(text: string): string[] {
    // Split by common sentence delimiters
    return text
      .split(/[.!?]+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 10);
  }

  private isClaim(sentence: string): boolean {
    // Filter out questions
    if (sentence.includes("?")) return false;

    // Filter out very short sentences
    if (sentence.length < 20) return false;

    // Filter out sentences that are mostly numbers
    const numberRatio =
      (sentence.match(/\d/g) || []).length / sentence.length;
    if (numberRatio > 0.3) return false;

    return true;
  }

  private assessConfidence(sentence: string): "low" | "medium" | "high" {
    // High confidence indicators
    const highConfidencePatterns = [
      /research shows/i,
      /studies indicate/i,
      /according to/i,
      /data shows/i,
      /evidence suggests/i,
      /\d+%/,
    ];

    // Low confidence indicators
    const lowConfidencePatterns = [
      /might/i,
      /maybe/i,
      /possibly/i,
      /could be/i,
      /it seems/i,
    ];

    for (const pattern of highConfidencePatterns) {
      if (pattern.test(sentence)) return "high";
    }

    for (const pattern of lowConfidencePatterns) {
      if (pattern.test(sentence)) return "low";
    }

    return "medium";
  }
}
