/**
 * TokenBudgeter — re-exports existing token budget utilities
 * with a thin convenience wrapper for the RetrievalEngine pipeline.
 */

import { estimateTokens, truncateToTokens } from "./tokenBudget.js";

export { estimateTokens, truncateToTokens };

export interface TokenBudget {
  maxTokens: number;
  reservedForSystem?: number;
  reservedForPersona?: number;
  reservedForTranscript?: number;
  reservedForDocs?: number;
}

/**
 * Truncate text to fit within a token budget.
 * Uses existing estimateTokens + truncateToTokens under the hood.
 */
export function fitToBudget(text: string, budget: TokenBudget): string {
  const currentTokens = estimateTokens(text);
  const available = budget.maxTokens
    - (budget.reservedForSystem ?? 0)
    - (budget.reservedForPersona ?? 0)
    - (budget.reservedForTranscript ?? 0);
  const maxForDocs = budget.reservedForDocs ?? available;

  if (currentTokens <= maxForDocs) return text;
  return truncateToTokens(text, maxForDocs);
}
