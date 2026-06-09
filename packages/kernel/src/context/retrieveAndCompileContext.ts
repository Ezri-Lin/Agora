/**
 * retrieveAndCompileContext — convenience helper that retrieves chunks
 * and compiles them into a ContextPackage in one call.
 *
 * Used by CouncilRunner when a RetrievalEngine is provided.
 */

import type { RetrievalEngine, ReadMode } from "./types.js";
import { compileContextPackage, type ContextPackage } from "./ContextCompiler.js";

export interface RetrieveAndCompileInput {
  task: string;
  query: string;
  retrievalEngine: RetrievalEngine;
  mode?: ReadMode;
  constraints?: string[];
  limit?: number;
}

/**
 * Retrieve relevant chunks and compile into a ContextPackage.
 *
 * Returns null if retrieval fails (graceful degradation).
 */
export async function retrieveAndCompileContext(
  input: RetrieveAndCompileInput,
): Promise<ContextPackage | null> {
  const { task, query, retrievalEngine, mode = "synthesize", constraints, limit = 6 } = input;

  try {
    const retrievalResult = await retrievalEngine.retrieve({
      query,
      mode,
      limit,
    });

    return compileContextPackage({
      task,
      retrievalResult,
      constraints,
    });
  } catch {
    // Retrieval failure should not break the caller
    return null;
  }
}
