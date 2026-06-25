/**
 * DocumentAnalysis — public API exports
 */

export { DocumentAnalysisTool, documentAnalysisManifest } from "./DocumentAnalysisTool.js";
export { DocumentDetector } from "./DocumentDetector.js";
export { DocumentChunker } from "./DocumentChunker.js";
export { DocumentIndexer } from "./DocumentIndexer.js";
export { RetrievalEngine } from "./RetrievalEngine.js";
export { DecisionEngine } from "./DecisionEngine.js";
export { ResultFormatter } from "./ResultFormatter.js";
export { LogAnalyzer } from "./Analyzers/LogAnalyzer.js";
export { TableAnalyzer } from "./Analyzers/TableAnalyzer.js";
export { tokenize, tokenizeQuery } from "./tokenizer.js";

export type {
  // Range
  CharRange,
  LineRange,
  // Format
  DocumentFormat,
  // Detection
  StructureHint,
  StructureHintType,
  DocumentAnalysis,
  DetectionResult,
  // Chunking
  ChunkType,
  DocumentChunk,
  ChunkingPolicy,
  // Index
  IndexMetadata,
  DocumentIndex,
  // Retrieval
  SourceSpan,
  RetrievalHit,
  RetrievalResult,
  // Analyzers
  LogLevel,
  LogEntry,
  LogResult,
  TableFormat,
  TableData,
  TableResult,
  // Decision
  AnalysisMode,
  AnalyzerName,
  AnalysisDecision,
  // Result
  ConfidenceLevel,
  DecisionTrace,
  AnalysisResult,
  // Error
  DocumentAnalysisErrorCode,
  DocumentAnalysisError,
  // Tool
  DocumentAnalysisToolOutput,
  // Policy
  DocumentAnalysisPolicy,
} from "./types.js";

export {
  DEFAULT_POLICY,
  DEFAULT_CHUNKING_POLICY,
} from "./constants.js";
