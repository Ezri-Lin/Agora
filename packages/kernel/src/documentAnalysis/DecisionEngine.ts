/**
 * DecisionEngine — 决定使用哪种分析模式
 *
 * 决策优先级 (结构化格式优先于 token 阈值):
 * 1. hasLogPattern → log_analyzer
 * 2. hasTableContent → table_analyzer
 * 3. hasQuery → retrieval
 * 4. tokenCount < 4000 → direct_context
 * 5. else → chunked_context
 */

import type {
  DocumentAnalysis,
  IndexMetadata,
  AnalysisDecision,
  AnalysisMode,
} from "./types.js";
import { DEFAULT_POLICY } from "./constants.js";

export class DecisionEngine {
  decide(
    analysis: DocumentAnalysis,
    indexMetadata: IndexMetadata,
    query?: string
  ): AnalysisDecision {
    // Priority 1: Log pattern detected
    if (indexMetadata.hasLogPattern) {
      return {
        mode: "log_analyzer",
        reason: "Log pattern detected in document",
        confidence: 0.9,
        analyzer: "LogAnalyzer",
      };
    }

    // Priority 2: Table content detected
    if (indexMetadata.hasTableContent) {
      return {
        mode: "table_analyzer",
        reason: "Table structure detected in document",
        confidence: 0.85,
        analyzer: "TableAnalyzer",
      };
    }

    // Priority 3: Query exists → retrieval
    if (query && query.trim().length > 0) {
      return {
        mode: "retrieval",
        reason: "Query provided, using retrieval for targeted search",
        confidence: 0.8,
      };
    }

    // Priority 4: Short text → direct_context
    if (analysis.tokenCount < DEFAULT_POLICY.directThresholdTokens) {
      return {
        mode: "direct_context",
        reason: `Short text (${analysis.tokenCount} tokens < ${DEFAULT_POLICY.directThresholdTokens}), direct context`,
        confidence: 0.9,
      };
    }

    // Priority 5: Long text without query → chunked_context
    return {
      mode: "chunked_context",
      reason: `Long text (${analysis.tokenCount} tokens), chunked context`,
      confidence: 0.7,
    };
  }
}
