/**
 * DocumentAnalysis Types — v1 类型定义
 *
 * 设计原则：
 * - kernel tool 只做 deterministic context extraction
 * - 不隐式调用 LLM
 * - Range 规范: char 0-based half-open, line 1-based inclusive
 */

// === Range Types ===

export interface CharRange {
  start: number;  // 0-based inclusive
  end: number;    // 0-based exclusive
}

export interface LineRange {
  start: number;  // 1-based inclusive
  end: number;    // 1-based inclusive
}

// === Document Format ===

export type DocumentFormat =
  | "text"
  | "markdown"
  | "csv"
  | "json"
  | "jsonl"
  | "log";

// === Structure Detection ===

export type StructureHintType =
  | "heading"
  | "table"
  | "list"
  | "code_block"
  | "log_entry";

export interface StructureHint {
  type: StructureHintType;
  count: number;
  confidence: number;
}

export interface DocumentAnalysis {
  type: DocumentFormat;
  tokenCount: number;
  structureHints: StructureHint[];
  lineCount: number;
}

export interface DetectionResult extends DocumentAnalysis {
  detectedBy: "format_hint" | "content_pattern" | "fallback";
  confidence: number;
}

// === Chunking ===

export type ChunkType = "text" | "table" | "code" | "log";

export interface DocumentChunk {
  id: string;
  content: string;
  charRange: CharRange;
  lineRange: LineRange;
  section?: string;
  type: ChunkType;
  tokenCount: number;
}

export interface ChunkingPolicy {
  maxCharsPerChunk: number;
  overlapChars: number;
  preserveLineBoundary: boolean;
  preserveRecordBoundary: boolean;
}

// === Index ===

export interface IndexMetadata {
  chunkCount: number;
  termCount: number;
  hasStructuredSections: boolean;
  hasTableContent: boolean;
  hasLogPattern: boolean;
}

export interface DocumentIndex {
  chunksById: Map<string, DocumentChunk>;
  invertedIndex: Map<string, string[]>;
  termFrequencies: Map<string, Map<string, number>>;
  documentFrequencies: Map<string, number>;
  chunkLengths: Map<string, number>;
  averageChunkLength: number;
  metadata: IndexMetadata;
}

// === Retrieval ===

export interface SourceSpan {
  chunkId: string;
  charRange: CharRange;
  lineRange: LineRange;
  preview: string;
  relevance: number;
}

export interface RetrievalHit {
  chunk: DocumentChunk;
  score: number;
  matchedTerms: string[];
  literalMatches: SourceSpan[];
}

export interface RetrievalResult {
  query: string;
  hits: RetrievalHit[];
}

// === Analyzer Results ===

export type LogLevel = "error" | "warn" | "info" | "debug";

export interface LogEntry {
  timestamp?: string;
  level: LogLevel;
  message: string;
  charRange: CharRange;
  lineRange: LineRange;
}

export interface LogResult {
  entries: LogEntry[];
  statistics: {
    errorCount: number;
    warnCount: number;
    timespan?: { start: string; end: string };
  };
}

export type TableFormat = "csv" | "markdown" | "tsv";

export interface TableData {
  headers: string[];
  rows: string[][];
  charRange: CharRange;
  lineRange: LineRange;
  format: TableFormat;
}

export interface TableResult {
  tables: TableData[];
  summary: string;
}

// === Decision ===

export type AnalysisMode =
  | "direct_context"
  | "chunked_context"
  | "retrieval"
  | "log_analyzer"
  | "table_analyzer";

export type AnalyzerName = "LogAnalyzer" | "TableAnalyzer";

export interface AnalysisDecision {
  mode: AnalysisMode;
  reason: string;
  confidence: number;
  analyzer?: AnalyzerName;
}

// === Decision Trace ===

export interface DecisionTrace {
  mode: AnalysisMode;
  reason: string;
  tokenCount: number;
  analyzer?: AnalyzerName;
  timestamp: string;
}

// === Analysis Result ===

export type ConfidenceLevel = "high" | "medium" | "low";

export interface AnalysisResult {
  mode: AnalysisMode;
  contextChunks: DocumentChunk[];
  sourceSpans: SourceSpan[];
  suggestedPrompt?: string;
  confidence: ConfidenceLevel;
  decisionTrace: DecisionTrace;
}

// === Error Model ===

export type DocumentAnalysisErrorCode =
  | "UNSUPPORTED_FORMAT"
  | "CONTENT_TOO_LARGE"
  | "EMPTY_CONTENT"
  | "INDEX_BUILD_FAILED"
  | "NO_RELEVANT_CHUNKS"
  | "ANALYZER_FAILED";

export interface DocumentAnalysisError {
  code: DocumentAnalysisErrorCode;
  message: string;
  recoverable: boolean;
  details?: Record<string, unknown>;
}

// === Tool Output ===

export type DocumentAnalysisToolOutput =
  | { ok: true; result: AnalysisResult }
  | { ok: false; error: DocumentAnalysisError; decisionTrace?: DecisionTrace };

// === Policy ===

export interface DocumentAnalysisPolicy {
  maxInputChars: number;
  directThresholdTokens: number;
  chunkingThresholdTokens: number;
  maxChunks: number;
  topK: number;
}
