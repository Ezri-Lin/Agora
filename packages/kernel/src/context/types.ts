/**
 * RetrievalEngine types — formal abstraction over document retrieval.
 *
 * Decouples "how we find relevant content" from "how we compile context packs".
 * PR-5 defines the interface + keyword adapter; PR-6 adds SQLite FTS5.
 */

/** How deeply to read a document. */
export type ReadMode =
  | "lookup"     // exact match, minimal context
  | "skim"       // headings + keyword-matched sections
  | "deep_read"  // full relevant sections with surrounding context
  | "synthesize"; // full document for cross-document reasoning

/** A single retrieved chunk of context. */
export interface RetrievedContextChunk {
  id: string;
  sourceId: string;
  title?: string;
  path?: string;
  headingPath?: string[];
  excerpt: string;
  summary?: string;
  score: number;
  reason?: string;
}

/** Query sent to a RetrievalEngine. */
export interface RetrievalQuery {
  query: string;
  mode: ReadMode;
  limit?: number;
  scope?: {
    paths?: string[];
    tags?: string[];
  };
}

/** Result returned by a RetrievalEngine. */
export interface RetrievalResult {
  query: RetrievalQuery;
  chunks: RetrievedContextChunk[];
  warnings?: string[];
}

/** Formal retrieval interface — all document access goes through here. */
export interface RetrievalEngine {
  retrieve(query: RetrievalQuery): Promise<RetrievalResult>;
}
