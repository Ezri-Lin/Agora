import type { ContextMode, SourceRefImportance } from "@agora/shared";

/** Rough token estimation: ~4 chars per token for mixed CJK/English */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

export function truncateToTokens(text: string, maxTokens: number): string {
  const maxChars = maxTokens * 4;
  if (text.length <= maxChars) return text;
  return text.slice(0, maxChars) + "\n...[truncated]";
}

export interface ContextBudget {
  totalChars: number;
  /** Budget for user-explicit (primary) docs */
  primaryDocChars: number;
  /** Budget for auto-added (supporting) docs */
  supportingDocChars: number;
  /** Budget for memory docs */
  memoryDocChars: number;
  /** Budget for background docs */
  backgroundDocChars: number;
  /** Number of recent messages to include */
  historyMessages: number;
  /** Max chars per history message */
  historyMessageChars: number;
}

export const CONTEXT_BUDGETS: Record<ContextMode, ContextBudget> = {
  quick: {
    totalChars: 6_000,
    primaryDocChars: 2_000,
    supportingDocChars: 800,
    memoryDocChars: 400,
    backgroundDocChars: 200,
    historyMessages: 6,
    historyMessageChars: 300,
  },
  standard: {
    totalChars: 18_000,
    primaryDocChars: 6_000,
    supportingDocChars: 2_000,
    memoryDocChars: 1_000,
    backgroundDocChars: 500,
    historyMessages: 10,
    historyMessageChars: 500,
  },
  deep: {
    totalChars: 50_000,
    primaryDocChars: 15_000,
    supportingDocChars: 5_000,
    memoryDocChars: 3_000,
    backgroundDocChars: 1_500,
    historyMessages: 16,
    historyMessageChars: 800,
  },
  full_doc: {
    totalChars: 100_000,
    primaryDocChars: 40_000,
    supportingDocChars: 8_000,
    memoryDocChars: 5_000,
    backgroundDocChars: 2_000,
    historyMessages: 20,
    historyMessageChars: 1_000,
  },
};

/** Get budget for a doc based on its importance */
export function getDocBudget(
  importance: SourceRefImportance | undefined,
  budget: ContextBudget,
): number {
  switch (importance ?? "primary") {
    case "primary": return budget.primaryDocChars;
    case "supporting": return budget.supportingDocChars;
    case "memory": return budget.memoryDocChars;
    case "background": return budget.backgroundDocChars;
  }
}
