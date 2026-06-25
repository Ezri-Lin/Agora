/**
 * DocumentAnalysisTool — Tool Runtime 注册入口
 *
 * 串联所有组件，提供统一的文档分析能力
 * riskLevel: read_only, sideEffects: []
 */

import type {
  ToolManifest,
  ToolExecutor,
} from "../tools/ToolRuntimeTypes.js";
import type {
  DocumentFormat,
  DocumentAnalysisToolOutput,
  DocumentAnalysisError,
} from "./types.js";
import { DEFAULT_POLICY } from "./constants.js";
import { DocumentDetector } from "./DocumentDetector.js";
import { DocumentChunker } from "./DocumentChunker.js";
import { DocumentIndexer } from "./DocumentIndexer.js";
import { RetrievalEngine } from "./RetrievalEngine.js";
import { DecisionEngine } from "./DecisionEngine.js";
import { ResultFormatter } from "./ResultFormatter.js";
import { LogAnalyzer } from "./Analyzers/LogAnalyzer.js";
import { TableAnalyzer } from "./Analyzers/TableAnalyzer.js";

const VALID_FORMATS: DocumentFormat[] = [
  "text",
  "markdown",
  "csv",
  "json",
  "jsonl",
  "log",
];

export const documentAnalysisManifest: ToolManifest = {
  name: "document_analysis",
  description:
    "分析已提供的文档内容，支持搜索、日志解析和基础结构化提取",
  riskLevel: "read_only",
  sideEffects: [],
  requiresApproval: false,
  inputSchema: {
    type: "object",
    properties: {
      content: { type: "string", description: "文档内容" },
      query: { type: "string", description: "搜索查询或分析目标" },
      format: {
        type: "string",
        enum: VALID_FORMATS,
        description: "文档格式提示",
      },
    },
    required: ["content"],
  },
};

export class DocumentAnalysisTool {
  private detector: DocumentDetector;
  private chunker: DocumentChunker;
  private indexer: DocumentIndexer;
  private retrieval: RetrievalEngine;
  private decision: DecisionEngine;
  private formatter: ResultFormatter;
  private logAnalyzer: LogAnalyzer;
  private tableAnalyzer: TableAnalyzer;

  constructor() {
    this.detector = new DocumentDetector();
    this.chunker = new DocumentChunker();
    this.indexer = new DocumentIndexer();
    this.retrieval = new RetrievalEngine();
    this.decision = new DecisionEngine();
    this.formatter = new ResultFormatter();
    this.logAnalyzer = new LogAnalyzer();
    this.tableAnalyzer = new TableAnalyzer();
  }

  getManifest(): ToolManifest {
    return documentAnalysisManifest;
  }

  getExecutor(): ToolExecutor {
    return async (args: unknown): Promise<DocumentAnalysisToolOutput> => {
      try {
        const input = args as {
          content: string;
          query?: string;
          format?: string;
        };

        // Validate input
        const validationError = this.validateInput(input);
        if (validationError) {
          return { ok: false, error: validationError };
        }

        const { content, query, format } = input;
        const formatHint = format as DocumentFormat | undefined;

        // 1. Detect
        const detection = this.detector.detect(content, formatHint);

        // 2. Chunk
        const chunks = this.chunker.chunk(content, detection.type);

        // 3. Build index
        const index = this.indexer.build(chunks, detection);

        // 4. Decide
        const decision = this.decision.decide(
          detection,
          index.metadata,
          query
        );

        // 5. Execute based on mode
        let result;

        switch (decision.mode) {
          case "log_analyzer": {
            const logResult = this.logAnalyzer.analyze(content);
            result = this.formatter.format({
              mode: decision.mode,
              chunks,
              logResult,
              decision,
              tokenCount: detection.tokenCount,
              query,
            });
            break;
          }

          case "table_analyzer": {
            const tableResult = this.tableAnalyzer.analyze(
              content,
              detection.type
            );
            result = this.formatter.format({
              mode: decision.mode,
              chunks,
              tableResult,
              decision,
              tokenCount: detection.tokenCount,
              query,
            });
            break;
          }

          case "retrieval": {
            const retrievalResult = this.retrieval.search(
              query!,
              index,
              DEFAULT_POLICY.topK
            );
            result = this.formatter.format({
              mode: decision.mode,
              chunks,
              retrievalResult,
              decision,
              tokenCount: detection.tokenCount,
              query,
            });
            break;
          }

          case "direct_context":
          case "chunked_context":
          default: {
            result = this.formatter.format({
              mode: decision.mode,
              chunks,
              decision,
              tokenCount: detection.tokenCount,
              query,
            });
            break;
          }
        }

        return { ok: true, result };
      } catch (error) {
        const analysisError: DocumentAnalysisError = {
          code: "ANALYZER_FAILED",
          message:
            error instanceof Error ? error.message : "Unknown error",
          recoverable: true,
          details: { originalError: String(error) },
        };
        return { ok: false, error: analysisError };
      }
    };
  }

  private validateInput(input: {
    content: string;
    query?: string;
    format?: string;
  }): DocumentAnalysisError | null {
    // Check empty content
    if (!input.content || input.content.trim().length === 0) {
      return {
        code: "EMPTY_CONTENT",
        message: "Content is empty or whitespace only",
        recoverable: false,
      };
    }

    // Check content size
    if (input.content.length > DEFAULT_POLICY.maxInputChars) {
      return {
        code: "CONTENT_TOO_LARGE",
        message: `Content exceeds maximum size (${input.content.length} > ${DEFAULT_POLICY.maxInputChars} chars)`,
        recoverable: false,
        details: {
          size: input.content.length,
          maxSize: DEFAULT_POLICY.maxInputChars,
        },
      };
    }

    // Check format hint validity
    if (input.format && !VALID_FORMATS.includes(input.format as DocumentFormat)) {
      return {
        code: "UNSUPPORTED_FORMAT",
        message: `Unsupported format: ${input.format}`,
        recoverable: false,
        details: {
          provided: input.format,
          supported: VALID_FORMATS,
        },
      };
    }

    return null;
  }
}
