/**
 * ContextCompressor — 上下文压缩器接口
 */

import type { ConversationSummaryV1 } from "./ConversationSummary.js";

export interface ContextCompressionInput {
  sessionId: string;
  transcript: string;
  previousSummary?: ConversationSummaryV1;
  evidenceRefs?: string[];
  memoryRefs?: string[];
}

export interface ContextCompressionResult {
  summary: ConversationSummaryV1;
  trace: CompressionTrace;
}

export interface CompressionTrace {
  compressor: "expected_output" | "rule_based" | "llm";
  startedAt: string;
  completedAt: string;
  inputTokenEstimate: number;
  outputTokenEstimate: number;
  fallbackUsed: boolean;
  validationErrors: string[];
  retryCount: number;
}

export interface ContextCompressor {
  compress(input: ContextCompressionInput): Promise<ContextCompressionResult>;
}
