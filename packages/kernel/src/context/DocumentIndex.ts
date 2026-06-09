/**
 * DocumentIndex interface — abstraction over document storage and search.
 *
 * InMemoryDocumentIndex: keyword-scoring MVP (PR-6B)
 * SqliteDocumentIndex: FTS5-backed (PR-6C, future)
 */

import type { DocumentMap, TextChunk } from "./documentTypes.js";
import type { RetrievalQuery, RetrievalResult } from "./types.js";

export interface ParsedDocumentInput {
  document: DocumentMap;
  chunks: TextChunk[];
}

export interface DocumentIndex {
  upsertDocument(input: ParsedDocumentInput): Promise<void>;
  removeDocument(docId: string): Promise<void>;
  search(query: RetrievalQuery): Promise<RetrievalResult>;
  /** Remove all documents from the index. */
  clear(): Promise<void>;
}
