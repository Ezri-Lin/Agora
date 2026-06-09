/**
 * KeywordExcerptRetriever — adapter wrapping existing extractRelevantExcerpt.
 *
 * Implements RetrievalEngine using the current keyword-matching strategy.
 * Does NOT change extractExcerpt behavior; only adapts its I/O shape.
 */

import { extractRelevantExcerpt } from "./extractExcerpt.js";
import type {
  RetrievalEngine,
  RetrievalQuery,
  RetrievalResult,
  RetrievedContextChunk,
  ReadMode,
} from "./types.js";

interface ExistingDocInput {
  id: string;
  title?: string;
  path?: string;
  content: string;
}

const MODE_CHAR_BUDGETS: Record<ReadMode, number> = {
  lookup: 1_500,
  skim: 3_000,
  deep_read: 8_000,
  synthesize: 20_000,
};

export class KeywordExcerptRetriever implements RetrievalEngine {
  constructor(private readonly docs: ExistingDocInput[]) {}

  async retrieve(query: RetrievalQuery): Promise<RetrievalResult> {
    const { query: queryString, mode, limit = 10, scope } = query;
    const maxChars = MODE_CHAR_BUDGETS[mode];

    // Filter by scope if provided
    let candidates = this.docs;
    if (scope?.paths?.length) {
      const pathSet = new Set(scope.paths);
      candidates = candidates.filter(
        (d) => d.path && pathSet.has(d.path),
      );
    }

    // Score each document
    const scored = candidates
      .map((doc) => {
        const result = extractRelevantExcerpt(doc.content, queryString, maxChars);
        const score = computeScore(doc.content, queryString, result.wasTruncated);
        const chunk: RetrievedContextChunk = {
          id: doc.id,
          sourceId: doc.id,
          title: doc.title,
          path: doc.path,
          excerpt: result.excerpt,
          score,
          reason: result.wasTruncated ? "keyword match (truncated)" : "keyword match",
        };
        return { chunk, score };
      })
      .filter((s) => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    const warnings: string[] = [];
    if (scored.length === 0 && candidates.length > 0) {
      warnings.push("No documents matched the query keywords.");
    }
    if (candidates.length === 0) {
      warnings.push("No documents available in scope.");
    }

    return {
      query,
      chunks: scored.map((s) => s.chunk),
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  }
}

/** Simple keyword overlap score. */
function computeScore(docContent: string, query: string, wasTruncated: boolean): number {
  const keywords = query
    .split(/[\s,，。、；：！？!?.\-\n]+/)
    .filter((w) => w.length >= 2)
    .slice(0, 10);

  if (keywords.length === 0) return 0;

  const lower = docContent.toLowerCase();
  let matches = 0;
  for (const kw of keywords) {
    if (lower.includes(kw.toLowerCase())) matches++;
  }

  // Basic relevance: ratio of matched keywords
  const baseScore = matches / keywords.length;
  if (baseScore === 0) return 0;

  // Slight penalty for truncation (less complete context)
  return wasTruncated ? baseScore * 0.9 : baseScore;
}
