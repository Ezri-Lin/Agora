/**
 * CompactCommand — /compact 命令处理
 */

import type { ContextCompressionController } from "../context/ContextCompressionController.js";
import type { ContextCompressionPolicy, ContextMessage } from "../context/ContextCompressionPolicy.js";
import type { ContextCompressor } from "../context/ContextCompressor.js";
import type { ConversationSummaryV1 } from "../context/ConversationSummary.js";

export interface CompactCommandInput {
  sessionId: string;
  mode: "single" | "council";
  transcript: string;
  recentMessages: ContextMessage[];
  latestUserMessage?: ContextMessage;
  policy: ContextCompressionPolicy;
  compressor: ContextCompressor;
  previousSummary?: ConversationSummaryV1;
  messagesSinceLastCompression?: number;
}

export interface CompactCommandResult {
  success: boolean;
  message: string;
  summary?: ConversationSummaryV1;
  retainedCount: number;
}

export class CompactCommand {
  private controller: ContextCompressionController;

  constructor(controller: ContextCompressionController) {
    this.controller = controller;
  }

  async execute(input: CompactCommandInput): Promise<CompactCommandResult> {
    const {
      sessionId,
      mode,
      transcript,
      recentMessages,
      latestUserMessage,
      policy,
      compressor,
      previousSummary,
      messagesSinceLastCompression,
    } = input;

    // Determine executor based on mode
    const executedBy =
      mode === "single"
        ? { type: "assistant" as const }
        : { type: "moderator" as const, roleId: "moderator" };

    // Execute compression
    const result = await this.controller.maybeCompress({
      sessionId,
      mode,
      requestedBy: { type: "user", command: "/compact" },
      executedBy,
      transcript,
      recentMessages,
      latestUserMessage,
      policy,
      compressor,
      previousSummary,
      messagesSinceLastCompression,
    });

    if (result.compressed && result.summary) {
      // Build success message
      const summary = result.summary;
      const parts: string[] = ["已压缩当前会话上下文："];

      if (summary.decisions.length > 0) {
        parts.push(`- 保留 ${summary.decisions.length} 个决策`);
      }

      if (summary.actionItems.length > 0) {
        parts.push(`- 保留 ${summary.actionItems.length} 个行动项`);
      }

      if (summary.openQuestions.length > 0) {
        parts.push(`- 保留 ${summary.openQuestions.length} 个未解决问题`);
      }

      if (summary.keyInsights.length > 0) {
        parts.push(`- 保留 ${summary.keyInsights.length} 个关键洞察`);
      }

      if (summary.roleStances.length > 0) {
        parts.push(`- 保留 ${summary.roleStances.length} 个角色立场`);
      }

      parts.push(`- 保留最近 ${result.retainedRecentMessages.length} 条原始消息`);

      return {
        success: true,
        message: parts.join("\n"),
        summary: result.summary,
        retainedCount: result.retainedRecentMessages.length,
      };
    } else {
      // Compression not performed or failed
      return {
        success: false,
        message: `未执行压缩：${result.reason}`,
        retainedCount: result.retainedRecentMessages.length,
      };
    }
  }
}

/**
 * Check if a message is a compact command
 */
export function isCompactCommand(content: string): boolean {
  const trimmed = content.trim().toLowerCase();
  return trimmed === "/compact" || trimmed === "/compress";
}
