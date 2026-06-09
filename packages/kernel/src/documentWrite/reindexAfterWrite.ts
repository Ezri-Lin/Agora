/**
 * reindexAfterWrite — optional callback for DocumentWriter.
 *
 * PR-12: Parses written content and upserts into DocumentIndex.
 * No-op if no index provided.
 */

import { parseDocument } from "../context/DocumentParser.js";
import type { DocumentIndex } from "../context/DocumentIndex.js";

export interface ReindexAfterWriteArgs {
  path: string;
  content: string;
  hash: string;
  index?: DocumentIndex;
}

/**
 * Create an onWriteApplied callback that reindexes after successful writes.
 *
 * Usage:
 *   new DocumentWriter({ ..., onWriteApplied: createReindexCallback(index) })
 */
export function createReindexCallback(index?: DocumentIndex) {
  if (!index) return undefined;

  return async (args: { path: string; content: string; hash: string }) => {
    const { document, chunks } = parseDocument({ path: args.path, content: args.content });
    await index.upsertDocument({ document, chunks });
  };
}
