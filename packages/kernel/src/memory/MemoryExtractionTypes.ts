/**
 * MemoryExtractionTypes — 记忆提取类型定义
 */

import type { ConversationSummaryV1 } from "../context/ConversationSummary.js";
import type {
  MemoryCandidate,
  RejectedMemoryCandidate,
  MemoryExtractionTrace,
  MemoryScope,
  MemoryType,
} from "./MemoryCandidate.js";

export interface MemoryExtractionInput {
  sessionId: string;
  summary: ConversationSummaryV1;
  projectId?: string;
  domain?: string;
  existingMemoryRefs?: string[];
}

export interface MemoryExtractionResult {
  candidates: MemoryCandidate[];
  rejected: RejectedMemoryCandidate[];
  trace: MemoryExtractionTrace;
}

export interface MemoryExtractor {
  extract(input: MemoryExtractionInput): Promise<MemoryExtractionResult>;
}
