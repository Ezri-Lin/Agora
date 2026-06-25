/**
 * ResultFormatter — 格式化分析结果
 *
 * 输出语义：
 * - direct_context: contextChunks = all/first chunk, suggestedPrompt for LLM
 * - chunked_context: contextChunks = representative chunks, suggestedPrompt for LLM
 * - retrieval: contextChunks = top hits, sourceSpans = matches
 * - log_analyzer/table_analyzer: contextChunks = parsed result, sourceSpans = locations
 */

import type {
  AnalysisMode,
  AnalysisDecision,
  AnalysisResult,
  DocumentChunk,
  RetrievalResult,
  LogResult,
  TableResult,
  SourceSpan,
  ConfidenceLevel,
  DecisionTrace,
} from "./types.js";

export class ResultFormatter {
  format(params: {
    mode: AnalysisMode;
    chunks?: DocumentChunk[];
    retrievalResult?: RetrievalResult;
    logResult?: LogResult;
    tableResult?: TableResult;
    decision: AnalysisDecision;
    tokenCount: number;
    query?: string;
  }): AnalysisResult {
    const {
      mode,
      chunks = [],
      retrievalResult,
      logResult,
      tableResult,
      decision,
      tokenCount,
      query,
    } = params;

    const decisionTrace: DecisionTrace = {
      mode: decision.mode,
      reason: decision.reason,
      tokenCount,
      analyzer: decision.analyzer,
      timestamp: new Date().toISOString(),
    };

    switch (mode) {
      case "direct_context":
        return this.formatDirectContext(chunks, decisionTrace);

      case "chunked_context":
        return this.formatChunkedContext(chunks, decisionTrace);

      case "retrieval":
        return this.formatRetrieval(retrievalResult, decisionTrace);

      case "log_analyzer":
        return this.formatLogResult(logResult, chunks, decisionTrace);

      case "table_analyzer":
        return this.formatTableResult(tableResult, chunks, decisionTrace);

      default:
        return {
          mode,
          contextChunks: [],
          sourceSpans: [],
          confidence: "low",
          decisionTrace,
        };
    }
  }

  private formatDirectContext(
    chunks: DocumentChunk[],
    decisionTrace: DecisionTrace
  ): AnalysisResult {
    return {
      mode: "direct_context",
      contextChunks: chunks,
      sourceSpans: [],
      suggestedPrompt:
        "Use the provided context to answer or summarize. If the context is insufficient, say so.",
      confidence: "high",
      decisionTrace,
    };
  }

  private formatChunkedContext(
    chunks: DocumentChunk[],
    decisionTrace: DecisionTrace
  ): AnalysisResult {
    return {
      mode: "chunked_context",
      contextChunks: chunks,
      sourceSpans: [],
      suggestedPrompt:
        "Analyze these chunks progressively. Synthesize information across chunks. Note any contradictions or gaps.",
      confidence: "medium",
      decisionTrace,
    };
  }

  private formatRetrieval(
    result: RetrievalResult | undefined,
    decisionTrace: DecisionTrace
  ): AnalysisResult {
    if (!result || result.hits.length === 0) {
      return {
        mode: "retrieval",
        contextChunks: [],
        sourceSpans: [],
        confidence: "low",
        decisionTrace,
      };
    }

    const contextChunks = result.hits.map((h) => h.chunk);
    const sourceSpans = result.hits.flatMap((h) => h.literalMatches);
    const maxScore = Math.max(...result.hits.map((h) => h.score));

    return {
      mode: "retrieval",
      contextChunks,
      sourceSpans,
      suggestedPrompt: `Based on the retrieved context, answer the query: "${result.query}". Cite specific passages when possible.`,
      confidence: maxScore > 1 ? "high" : maxScore > 0.5 ? "medium" : "low",
      decisionTrace,
    };
  }

  private formatLogResult(
    result: LogResult | undefined,
    chunks: DocumentChunk[],
    decisionTrace: DecisionTrace
  ): AnalysisResult {
    if (!result) {
      return {
        mode: "log_analyzer",
        contextChunks: chunks,
        sourceSpans: [],
        confidence: "low",
        decisionTrace,
      };
    }

    // Create source spans for errors and warnings
    const sourceSpans: SourceSpan[] = result.entries
      .filter((e) => e.level === "error" || e.level === "warn")
      .map((e) => ({
        chunkId: "log",
        charRange: e.charRange,
        lineRange: e.lineRange,
        preview: e.message.slice(0, 100),
        relevance: e.level === "error" ? 1.0 : 0.7,
      }));

    const summary = [
      `Log Analysis: ${result.entries.length} entries`,
      `Errors: ${result.statistics.errorCount}`,
      `Warnings: ${result.statistics.warnCount}`,
      result.statistics.timespan
        ? `Time range: ${result.statistics.timespan.start} to ${result.statistics.timespan.end}`
        : "No timestamps found",
    ].join("; ");

    return {
      mode: "log_analyzer",
      contextChunks: chunks,
      sourceSpans,
      suggestedPrompt: `Analyze this log data. ${summary}. Focus on errors and warnings. Identify patterns and root causes.`,
      confidence: result.entries.length > 0 ? "high" : "low",
      decisionTrace,
    };
  }

  private formatTableResult(
    result: TableResult | undefined,
    chunks: DocumentChunk[],
    decisionTrace: DecisionTrace
  ): AnalysisResult {
    if (!result || result.tables.length === 0) {
      return {
        mode: "table_analyzer",
        contextChunks: chunks,
        sourceSpans: [],
        confidence: "low",
        decisionTrace,
      };
    }

    // Create source spans for each table
    const sourceSpans: SourceSpan[] = result.tables.map((t) => ({
      chunkId: "table",
      charRange: t.charRange,
      lineRange: t.lineRange,
      preview: `${t.headers.join(", ")} (${t.rows.length} rows)`,
      relevance: 1.0,
    }));

    return {
      mode: "table_analyzer",
      contextChunks: chunks,
      sourceSpans,
      suggestedPrompt: `Analyze this table data. ${result.summary}. Identify patterns, anomalies, or insights.`,
      confidence: "high",
      decisionTrace,
    };
  }
}
