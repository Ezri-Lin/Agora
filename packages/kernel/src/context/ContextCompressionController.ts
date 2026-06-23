/**
 * ContextCompressionController — 上下文压缩控制器
 *
 * 职责：
 * - 检查执行权限
 * - 检查触发条件
 * - 调用 ContextCompressor
 * - 处理 fallback
 */

import type {
  ContextCompressionPolicy,
  CompressionRequestedBy,
  CompressionExecutedBy,
  ContextMessage,
  ContextCompressionResult,
} from "./ContextCompressionPolicy.js";
import type { ContextCompressor, ContextCompressionResult as CompressorResult } from "./ContextCompressor.js";
import type { ConversationSummaryV1 } from "./ConversationSummary.js";

function estimateTokens(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

export interface ContextCompressionControllerInput {
  sessionId: string;
  mode: "single" | "council";
  requestedBy: CompressionRequestedBy;
  executedBy: CompressionExecutedBy;
  transcript: string;
  recentMessages: ContextMessage[];
  latestUserMessage?: ContextMessage;
  policy: ContextCompressionPolicy;
  compressor: ContextCompressor;
  previousSummary?: ConversationSummaryV1;
  messagesSinceLastCompression?: number;
}

export class ContextCompressionController {
  async maybeCompress(
    input: ContextCompressionControllerInput
  ): Promise<ContextCompressionResult> {
    const {
      sessionId,
      mode,
      requestedBy,
      executedBy,
      transcript,
      recentMessages,
      latestUserMessage,
      policy,
      compressor,
      previousSummary,
      messagesSinceLastCompression = 0,
    } = input;

    // 1. Check executor permission (always first)
    if (!this.checkExecutorPermission(mode, executedBy)) {
      return {
        compressed: false,
        retainedRecentMessages: recentMessages,
        latestUserMessage,
        reason: `Executor not allowed: ${executedBy.type} cannot execute compression in ${mode} mode`,
      };
    }

    // 2. Check if manual trigger (skip cooldown and auto checks)
    if (requestedBy.type === "user") {
      return await this.executeCompression(input);
    }

    // 3. Check auto trigger conditions
    if (!policy.auto.enabled) {
      return {
        compressed: false,
        retainedRecentMessages: recentMessages,
        latestUserMessage,
        reason: "Auto compression disabled",
      };
    }

    // 4. Check cooldown (only for auto triggers)
    if (requestedBy.type === "system" && messagesSinceLastCompression < policy.auto.cooldownMessages) {
      return {
        compressed: false,
        retainedRecentMessages: recentMessages,
        latestUserMessage,
        reason: `Cooldown: only ${messagesSinceLastCompression} messages since last compression, need ${policy.auto.cooldownMessages}`,
      };
    }

    // 5. Check token pressure
    const transcriptTokens = estimateTokens(transcript);
    const tokenRatio = transcriptTokens / 8000; // Assume 8000 token budget

    if (tokenRatio > policy.auto.tokenThresholdRatio) {
      return await this.executeCompression(input);
    }

    // 6. Check message count
    if (recentMessages.length > policy.auto.messageCountThreshold) {
      return await this.executeCompression(input);
    }

    // 7. No trigger
    return {
      compressed: false,
      retainedRecentMessages: recentMessages,
      latestUserMessage,
      reason: "No trigger condition met",
    };
  }

  private checkExecutorPermission(
    mode: "single" | "council",
    executedBy: CompressionExecutedBy
  ): boolean {
    if (mode === "single") {
      return executedBy.type === "assistant";
    }

    if (mode === "council") {
      return executedBy.type === "moderator";
    }

    return false;
  }

  private async executeCompression(
    input: ContextCompressionControllerInput
  ): Promise<ContextCompressionResult> {
    const {
      sessionId,
      transcript,
      recentMessages,
      latestUserMessage,
      policy,
      compressor,
      previousSummary,
    } = input;

    try {
      // Build transcript for compression
      // Exclude latest user message from compression
      const transcriptToCompress = this.buildTranscriptForCompression(
        recentMessages,
        latestUserMessage
      );

      // Call compressor
      const result = await compressor.compress({
        sessionId,
        transcript: transcriptToCompress,
        previousSummary,
      });

      // Retain recent messages
      const retainedRecentMessages = recentMessages.slice(-policy.preserveRecentMessages);

      return {
        compressed: true,
        summary: result.summary,
        retainedRecentMessages,
        latestUserMessage,
        reason: "Compression triggered",
        trace: result.trace,
      };
    } catch (error) {
      // Fallback: don't compress, retain all messages
      return {
        compressed: false,
        retainedRecentMessages: recentMessages,
        latestUserMessage,
        reason: `Compression failed: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  private buildTranscriptForCompression(
    recentMessages: ContextMessage[],
    latestUserMessage?: ContextMessage
  ): string {
    // Build transcript from recent messages
    // Exclude latest user message
    const messagesToCompress = latestUserMessage
      ? recentMessages.filter((m) => m.id !== latestUserMessage.id)
      : recentMessages;

    return messagesToCompress
      .map((m) => `[${m.senderType}/${m.senderId}]: ${m.content}`)
      .join("\n\n");
  }

  private estimatePromptTokens(
    recentMessages: ContextMessage[],
    latestUserMessage?: ContextMessage
  ): number {
    const allMessages = latestUserMessage
      ? [...recentMessages, latestUserMessage]
      : recentMessages;

    const totalContent = allMessages.map((m) => m.content).join(" ");
    return estimateTokens(totalContent);
  }
}
