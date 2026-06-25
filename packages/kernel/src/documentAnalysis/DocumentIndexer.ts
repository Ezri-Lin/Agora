/**
 * DocumentIndexer — 构建倒排索引和 BM25 统计
 *
 * 使用 tokenizer 分词，构建完整的 BM25 数据结构
 */

import type {
  DocumentChunk,
  DocumentIndex,
  DocumentAnalysis,
  IndexMetadata,
} from "./types.js";
import { tokenize } from "./tokenizer.js";

export class DocumentIndexer {
  build(chunks: DocumentChunk[], analysis: DocumentAnalysis): DocumentIndex {
    const chunksById = new Map<string, DocumentChunk>();
    const invertedIndex = new Map<string, string[]>();
    const termFrequencies = new Map<string, Map<string, number>>();
    const documentFrequencies = new Map<string, number>();
    const chunkLengths = new Map<string, number>();

    let totalLength = 0;

    for (const chunk of chunks) {
      chunksById.set(chunk.id, chunk);

      // Tokenize chunk content
      const tokens = tokenize(chunk.content);
      chunkLengths.set(chunk.id, tokens.length);
      totalLength += tokens.length;

      // Count term frequencies for this chunk
      const tf = new Map<string, number>();
      for (const token of tokens) {
        tf.set(token, (tf.get(token) ?? 0) + 1);
      }
      termFrequencies.set(chunk.id, tf);

      // Update inverted index and document frequencies
      const seenTerms = new Set<string>();
      for (const [term, count] of tf) {
        // Inverted index
        const existing = invertedIndex.get(term);
        if (existing) {
          existing.push(chunk.id);
        } else {
          invertedIndex.set(term, [chunk.id]);
        }

        // Document frequency (count each term once per document)
        if (!seenTerms.has(term)) {
          seenTerms.add(term);
          documentFrequencies.set(
            term,
            (documentFrequencies.get(term) ?? 0) + 1
          );
        }
      }
    }

    const averageChunkLength =
      chunks.length > 0 ? totalLength / chunks.length : 0;

    // Build metadata
    const metadata: IndexMetadata = {
      chunkCount: chunks.length,
      termCount: invertedIndex.size,
      hasStructuredSections: analysis.structureHints.some(
        (h) => h.type === "heading"
      ),
      hasTableContent: analysis.structureHints.some(
        (h) => h.type === "table"
      ),
      hasLogPattern: analysis.structureHints.some(
        (h) => h.type === "log_entry"
      ),
    };

    return {
      chunksById,
      invertedIndex,
      termFrequencies,
      documentFrequencies,
      chunkLengths,
      averageChunkLength,
      metadata,
    };
  }
}
