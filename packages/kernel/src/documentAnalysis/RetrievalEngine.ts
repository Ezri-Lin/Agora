/**
 * RetrievalEngine — BM25 检索 + 关键词定位
 *
 * BM25 参数: k1=1.2, b=0.75
 */

import type {
  DocumentIndex,
  RetrievalResult,
  RetrievalHit,
  SourceSpan,
  CharRange,
  LineRange,
} from "./types.js";
import { DEFAULT_POLICY } from "./constants.js";
import { tokenizeQuery, tokenize } from "./tokenizer.js";

const BM25_K1 = 1.2;
const BM25_B = 0.75;

export class RetrievalEngine {
  search(
    query: string,
    index: DocumentIndex,
    topK?: number
  ): RetrievalResult {
    const k = topK ?? DEFAULT_POLICY.topK;
    const queryTokens = tokenizeQuery(query);

    if (queryTokens.length === 0) {
      return { query, hits: [] };
    }

    // Calculate BM25 scores for each chunk
    const scores = new Map<string, number>();
    const matchedTermsMap = new Map<string, Set<string>>();

    for (const term of queryTokens) {
      const chunkIds = index.invertedIndex.get(term) ?? [];
      const df = index.documentFrequencies.get(term) ?? 0;
      const N = index.chunksById.size;

      // IDF component
      const idf = Math.log((N - df + 0.5) / (df + 0.5) + 1);

      for (const chunkId of chunkIds) {
        const tf = index.termFrequencies.get(chunkId)?.get(term) ?? 0;
        const dl = index.chunkLengths.get(chunkId) ?? 0;
        const avgdl = index.averageChunkLength;

        // TF component with length normalization
        const tfNorm =
          (tf * (BM25_K1 + 1)) /
          (tf + BM25_K1 * (1 - BM25_B + BM25_B * (dl / avgdl)));

        const score = idf * tfNorm;

        scores.set(chunkId, (scores.get(chunkId) ?? 0) + score);

        // Track matched terms
        const matched = matchedTermsMap.get(chunkId) ?? new Set();
        matched.add(term);
        matchedTermsMap.set(chunkId, matched);
      }
    }

    // Sort by score and take top-k
    const sorted = [...scores.entries()]
      .sort(([, a], [, b]) => b - a)
      .slice(0, k);

    // Build hits with literal matches
    const hits: RetrievalHit[] = sorted.map(([chunkId, score]) => {
      const chunk = index.chunksById.get(chunkId)!;
      const matchedTerms = [...(matchedTermsMap.get(chunkId) ?? [])];
      const literalMatches = this.findLiteralMatches(
        chunk.content,
        queryTokens,
        chunkId,
        chunk.charRange.start,
        chunk.lineRange.start
      );

      return {
        chunk,
        score,
        matchedTerms,
        literalMatches,
      };
    });

    return { query, hits };
  }

  private findLiteralMatches(
    content: string,
    queryTokens: string[],
    chunkId: string,
    charOffset: number,
    lineOffset: number
  ): SourceSpan[] {
    const spans: SourceSpan[] = [];
    const lower = content.toLowerCase();

    for (const token of queryTokens) {
      if (token.length < 2) continue; // Skip very short tokens

      let searchFrom = 0;
      while (searchFrom < lower.length) {
        const idx = lower.indexOf(token, searchFrom);
        if (idx === -1) break;

        // Calculate line number at this position
        const beforeMatch = content.slice(0, idx);
        const lineNum = beforeMatch.split("\n").length;

        // Get preview context (50 chars before and after)
        const previewStart = Math.max(0, idx - 50);
        const previewEnd = Math.min(content.length, idx + token.length + 50);
        const preview = content.slice(previewStart, previewEnd);

        const charRange: CharRange = {
          start: charOffset + idx,
          end: charOffset + idx + token.length,
        };

        const lineRange: LineRange = {
          start: lineOffset + lineNum - 1,
          end: lineOffset + lineNum - 1,
        };

        spans.push({
          chunkId,
          charRange,
          lineRange,
          preview,
          relevance: 1.0,
        });

        searchFrom = idx + token.length;
      }
    }

    return spans;
  }
}
