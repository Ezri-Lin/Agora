/**
 * ContextCompressionIntegration — 将压缩集成到 CouncilRunner
 */

import type { CouncilMessage } from "@agora/shared";
import type { ContextCompressionController } from "../context/ContextCompressionController.js";
import type {
  ContextCompressionPolicy,
  ContextMessage,
  CompressionExecutedBy,
} from "../context/ContextCompressionPolicy.js";
import type { ContextCompressor } from "../context/ContextCompressor.js";
import type { ConversationSummaryV1 } from "../context/ConversationSummary.js";

export interface BeforeRoundInput {
  sessionId: string;
  mode: "single" | "council";
  moderatorRoleId: string;
  recentMessages: CouncilMessage[];
  latestUserMessage: CouncilMessage;
  transcript: string;
  policy: ContextCompressionPolicy;
  compressor: ContextCompressor;
  previousSummary?: ConversationSummaryV1;
  messagesSinceLastCompression?: number;
}

export interface BeforeRoundResult {
  compressed: boolean;
  summary?: ConversationSummaryV1;
  retainedRecentMessages: CouncilMessage[];
  latestUserMessage: CouncilMessage;
  reason: string;
}

export async function beforeRoundCompression(
  input: BeforeRoundInput,
  controller: ContextCompressionController
): Promise<BeforeRoundResult> {
  const {
    sessionId,
    mode,
    moderatorRoleId,
    recentMessages,
    latestUserMessage,
    transcript,
    policy,
    compressor,
    previousSummary,
    messagesSinceLastCompression,
  } = input;

  // Convert CouncilMessage to ContextMessage
  const contextMessages: ContextMessage[] = recentMessages.map((m) => ({
    id: m.id,
    senderType: m.senderType,
    senderId: m.senderId,
    content: m.content,
    createdAt: m.createdAt,
  }));

  const contextLatestUserMessage: ContextMessage = {
    id: latestUserMessage.id,
    senderType: latestUserMessage.senderType,
    senderId: latestUserMessage.senderId,
    content: latestUserMessage.content,
    createdAt: latestUserMessage.createdAt,
  };

  // Determine executor
  const executedBy: CompressionExecutedBy =
    mode === "single"
      ? { type: "assistant" }
      : { type: "moderator", roleId: moderatorRoleId };

  // Call controller
  const result = await controller.maybeCompress({
    sessionId,
    mode,
    requestedBy: { type: "system", reason: "token_budget" },
    executedBy,
    transcript,
    recentMessages: contextMessages,
    latestUserMessage: contextLatestUserMessage,
    policy,
    compressor,
    previousSummary,
    messagesSinceLastCompression,
  });

  // Convert back to CouncilMessage
  const retainedCouncilMessages: CouncilMessage[] = result.retainedRecentMessages.map((m) => ({
    id: m.id,
    roomId: sessionId,
    senderType: m.senderType,
    senderId: m.senderId,
    content: m.content,
    createdAt: m.createdAt,
  }));

  return {
    compressed: result.compressed,
    summary: result.summary,
    retainedRecentMessages: retainedCouncilMessages,
    latestUserMessage,
    reason: result.reason,
  };
}

/**
 * Build compressed context for all roles
 */
export function buildCompressedContext(
  previousSummary: ConversationSummaryV1 | undefined,
  latestSummary: ConversationSummaryV1 | undefined,
  retainedRecentMessages: CouncilMessage[],
  latestUserMessage: CouncilMessage,
  evidenceRefs: string[],
  memoryRefs: string[]
): string {
  const parts: string[] = [];

  // Previous summary
  if (previousSummary) {
    parts.push(`## Previous Context Summary\n${previousSummary.summaryText}`);
  }

  // Latest summary
  if (latestSummary) {
    parts.push(`## Latest Context Summary\n${latestSummary.summaryText}`);

    // Decisions
    if (latestSummary.decisions.length > 0) {
      parts.push("### Decisions");
      for (const d of latestSummary.decisions) {
        parts.push(`- ${d.statement} (${d.status})`);
      }
    }

    // Action items
    if (latestSummary.actionItems.length > 0) {
      parts.push("### Action Items");
      for (const a of latestSummary.actionItems) {
        parts.push(`- ${a.text} [${a.status}]`);
      }
    }

    // Open questions
    if (latestSummary.openQuestions.length > 0) {
      parts.push("### Open Questions");
      for (const q of latestSummary.openQuestions) {
        parts.push(`- ${q.question}${q.blocking ? " (blocking)" : ""}`);
      }
    }

    // Role stances
    if (latestSummary.roleStances.length > 0) {
      parts.push("### Role Stances");
      for (const s of latestSummary.roleStances) {
        parts.push(`- ${s.roleName}: ${s.stance}`);
      }
    }
  }

  // Retained recent messages
  if (retainedRecentMessages.length > 0) {
    parts.push("## Recent Messages");
    for (const m of retainedRecentMessages) {
      parts.push(`[${m.senderType}/${m.senderId}]: ${m.content}`);
    }
  }

  // Latest user message (always raw)
  parts.push("## Current User Message");
  parts.push(`[user/${latestUserMessage.senderId}]: ${latestUserMessage.content}`);

  // Evidence refs
  if (evidenceRefs.length > 0) {
    parts.push("## Evidence References");
    for (const ref of evidenceRefs) {
      parts.push(`- ${ref}`);
    }
  }

  // Memory refs
  if (memoryRefs.length > 0) {
    parts.push("## Memory References");
    for (const ref of memoryRefs) {
      parts.push(`- ${ref}`);
    }
  }

  return parts.join("\n\n");
}

/**
 * Deduplicate messages by ID
 */
export function deduplicateMessages(messages: CouncilMessage[]): CouncilMessage[] {
  const seen = new Set<string>();
  const result: CouncilMessage[] = [];

  for (const msg of messages) {
    if (!seen.has(msg.id)) {
      seen.add(msg.id);
      result.push(msg);
    }
  }

  return result;
}
