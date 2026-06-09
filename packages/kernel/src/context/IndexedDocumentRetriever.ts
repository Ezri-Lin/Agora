/**
 * IndexedDocumentRetriever — adapts DocumentIndex to RetrievalEngine.
 *
 * Thin adapter that delegates to the index's search method.
 */

import type { RetrievalEngine, RetrievalQuery, RetrievalResult } from "./types.js";
import type { DocumentIndex } from "./DocumentIndex.js";

export class IndexedDocumentRetriever implements RetrievalEngine {
  constructor(private readonly index: DocumentIndex) {}

  async retrieve(query: RetrievalQuery): Promise<RetrievalResult> {
    return this.index.search(query);
  }
}
