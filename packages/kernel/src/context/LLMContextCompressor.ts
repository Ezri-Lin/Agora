/**
 * LLMContextCompressor — 使用 LLM 进行上下文压缩
 */

import type {
  ContextCompressor,
  ContextCompressionInput,
  ContextCompressionResult,
  CompressionTrace,
} from "./ContextCompressor.js";
import type { ConversationSummaryV1 } from "./ConversationSummary.js";
import { buildCompressionPrompt, buildRepairPrompt } from "./compressionPrompt.js";
import { validateConversationSummary } from "./validateConversationSummary.js";

function estimateTokens(text: string): number {
  // v0.1: simple word count estimation
  return text.split(/\s+/).filter(Boolean).length;
}

export interface LLMCallInput {
  prompt: string;
  temperature?: number;
  maxTokens?: number;
}

export interface LLMCallOutput {
  content: string;
  tokenUsage: { input: number; output: number };
}

export interface LLMProvider {
  call(input: LLMCallInput): Promise<LLMCallOutput>;
}

export interface LLMContextCompressorOptions {
  llm: LLMProvider;
  maxRetries?: number;
  temperature?: number;
  maxTokens?: number;
}

export class LLMContextCompressor implements ContextCompressor {
  private llm: LLMProvider;
  private maxRetries: number;
  private temperature: number;
  private maxTokens: number;

  constructor(options: LLMContextCompressorOptions) {
    this.llm = options.llm;
    this.maxRetries = options.maxRetries ?? 2;
    this.temperature = options.temperature ?? 0;
    this.maxTokens = options.maxTokens ?? 4096;
  }

  async compress(
    input: ContextCompressionInput
  ): Promise<ContextCompressionResult> {
    const startedAt = new Date().toISOString();
    const trace: CompressionTrace = {
      compressor: "llm",
      startedAt,
      completedAt: "",
      inputTokenEstimate: estimateTokens(input.transcript),
      outputTokenEstimate: 0,
      fallbackUsed: false,
      validationErrors: [],
      retryCount: 0,
    };

    let lastErrors: string[] = [];
    let lastOutput: string = "";

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        // Build prompt
        const prompt =
          attempt === 0
            ? buildCompressionPrompt(input.transcript)
            : buildRepairPrompt(lastOutput, lastErrors);

        // Call LLM
        const result = await this.llm.call({
          prompt,
          temperature: this.temperature,
          maxTokens: this.maxTokens,
        });

        lastOutput = result.content;
        trace.outputTokenEstimate = result.tokenUsage.output;

        // Parse JSON
        let parsed: unknown;
        try {
          parsed = JSON.parse(result.content);
        } catch (parseError) {
          lastErrors = [`Invalid JSON: ${parseError}`];
          trace.validationErrors = lastErrors;
          trace.retryCount = attempt + 1;
          continue;
        }

        // Validate
        const validation = validateConversationSummary(
          parsed,
          input.transcript
        );

        if (validation.valid) {
          trace.completedAt = new Date().toISOString();
          trace.retryCount = attempt;

          return {
            summary: parsed as ConversationSummaryV1,
            trace,
          };
        }

        lastErrors = validation.errors;
        trace.validationErrors = lastErrors;
        trace.retryCount = attempt + 1;
      } catch (error) {
        lastErrors = [
          `LLM call failed: ${error instanceof Error ? error.message : String(error)}`,
        ];
        trace.validationErrors = lastErrors;
        trace.retryCount = attempt + 1;
      }
    }

    // All retries exhausted, use fallback
    trace.fallbackUsed = true;
    trace.completedAt = new Date().toISOString();

    const fallbackSummary = this.buildFallbackSummary(input);

    return {
      summary: fallbackSummary,
      trace,
    };
  }

  private buildFallbackSummary(
    input: ContextCompressionInput
  ): ConversationSummaryV1 {
    // Build a minimal valid summary from the transcript
    const sessionId = input.sessionId;
    const now = new Date().toISOString();

    // Extract first 500 chars as summary
    const summaryText = input.transcript
      .substring(0, 500)
      .replace(/\n/g, " ")
      .trim() + "...";

    return {
      sessionId,
      compressedAt: now,
      summaryText,
      decisions: [],
      actionItems: [],
      openQuestions: [],
      keyInsights: [],
      roleStances: [],
      evidenceRefs: input.evidenceRefs ?? [],
      rawTranscriptRefs: [`${sessionId}.md`],
    };
  }
}
