/**
 * DocumentAnalysis Constants — 策略常量
 */

import type { DocumentFormat, ChunkingPolicy, DocumentAnalysisPolicy } from "./types.js";

export const DEFAULT_POLICY: DocumentAnalysisPolicy = {
  maxInputChars: 2_000_000,
  directThresholdTokens: 4_000,
  chunkingThresholdTokens: 32_000,
  maxChunks: 2_000,
  topK: 5,
};

export const DEFAULT_CHUNKING_POLICY: Record<DocumentFormat, ChunkingPolicy> = {
  text: {
    maxCharsPerChunk: 4000,
    overlapChars: 800,
    preserveLineBoundary: false,
    preserveRecordBoundary: false,
  },
  markdown: {
    maxCharsPerChunk: 4000,
    overlapChars: 800,
    preserveLineBoundary: false,
    preserveRecordBoundary: false,
  },
  log: {
    maxCharsPerChunk: 4000,
    overlapChars: 0,
    preserveLineBoundary: true,
    preserveRecordBoundary: true,
  },
  csv: {
    maxCharsPerChunk: 4000,
    overlapChars: 0,
    preserveLineBoundary: true,
    preserveRecordBoundary: true,
  },
  json: {
    maxCharsPerChunk: 4000,
    overlapChars: 0,
    preserveLineBoundary: true,
    preserveRecordBoundary: false,
  },
  jsonl: {
    maxCharsPerChunk: 4000,
    overlapChars: 0,
    preserveLineBoundary: true,
    preserveRecordBoundary: true,
  },
};
