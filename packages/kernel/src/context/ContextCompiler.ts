/**
 * ContextCompiler v0 — converts RetrievalResult into a structured ContextPackage.
 *
 * Thin transformation layer. Does not call LLM or do any retrieval itself.
 */

import type { RetrievalResult, ReadMode } from "./types.js";

export interface ContextPackage {
  task: string;
  mode: ReadMode;
  relevantDocs: Array<{
    sourceId: string;
    title?: string;
    path?: string;
    headingPath?: string[];
    excerpt: string;
    summary?: string;
    relevanceReason?: string;
  }>;
  constraints: string[];
}

/**
 * Compile a retrieval result into a structured context package
 * ready for prompt injection.
 */
export function compileContextPackage(args: {
  task: string;
  retrievalResult: RetrievalResult;
  constraints?: string[];
}): ContextPackage {
  const { task, retrievalResult, constraints = [] } = args;

  const relevantDocs = retrievalResult.chunks.map((chunk) => ({
    sourceId: chunk.sourceId,
    title: chunk.title,
    path: chunk.path,
    headingPath: chunk.headingPath,
    excerpt: chunk.excerpt,
    summary: chunk.summary,
    relevanceReason: chunk.reason,
  }));

  return {
    task,
    mode: retrievalResult.query.mode,
    relevantDocs,
    constraints,
  };
}
