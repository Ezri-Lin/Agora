/**
 * MemoryCandidateProvenanceBinder — 绑定来源
 *
 * 从 council output 绑定 provenance，截断 excerpt
 */

import type { CouncilMessage } from "@agora/shared";
import type {
  ReviewProvenance,
  ReviewSourceSpan,
  MemoryReviewContext,
} from "./types.js";
import type { RoleToolTrace } from "../council/councilToolTypes.js";

export interface ProvenanceBindingPolicy {
  maxExcerptChars: number;
  maxSourceSpans: number;
}

export const DEFAULT_BINDING_POLICY: ProvenanceBindingPolicy = {
  maxExcerptChars: 500,
  maxSourceSpans: 20,
};

export class MemoryCandidateProvenanceBinder {
  private policy: ProvenanceBindingPolicy;

  constructor(policy?: Partial<ProvenanceBindingPolicy>) {
    this.policy = { ...DEFAULT_BINDING_POLICY, ...policy };
  }

  /**
   * 从 council output 绑定 provenance
   */
  bindFromCouncilOutput(
    context: MemoryReviewContext,
    roundId: string,
    roleId: string,
    messages: CouncilMessage[],
    toolTraces?: RoleToolTrace[]
  ): ReviewProvenance {
    const sourceSpans: ReviewSourceSpan[] = [];

    // 从消息中提取 source spans
    for (const msg of messages) {
      if (sourceSpans.length >= this.policy.maxSourceSpans) break;

      const excerpt = this.truncateExcerpt(msg.content);

      sourceSpans.push({
        sourceType: "message",
        sourceId: msg.id,
        excerpt,
        trustLevel: msg.senderType === "user" ? "user" : "generated",
        provenanceStatus: "none",
      });
    }

    // 从 tool traces 中提取 source spans
    if (toolTraces) {
      for (const trace of toolTraces) {
        for (const call of trace.calls) {
          if (sourceSpans.length >= this.policy.maxSourceSpans) break;

          sourceSpans.push({
            sourceType: "tool",
            sourceId: call.toolCallId,
            excerpt: `Tool: ${call.toolName}, ok: ${call.ok}`,
            trustLevel: "tool_untrusted",
            provenanceStatus: call.ok ? "complete" : "none",
          });
        }
      }
    }

    return {
      workspaceId: context.workspaceId,
      projectId: context.projectId,
      sessionId: context.sessionId,
      councilRoundId: roundId,
      roleId,
      messageIds: messages.map((m) => m.id),
      toolCallIds: toolTraces?.flatMap((t) => t.calls.map((c) => c.toolCallId)) ?? [],
      sourceSpans,
    };
  }

  /**
   * 从 document analysis 绑定 provenance
   */
  bindFromDocumentResult(
    context: MemoryReviewContext,
    sourceId: string,
    sourceSpans: Array<{
      excerpt: string;
      charRange?: { start: number; end: number };
      lineRange?: { start: number; end: number };
    }>
  ): ReviewProvenance {
    const spans: ReviewSourceSpan[] = sourceSpans
      .slice(0, this.policy.maxSourceSpans)
      .map((span) => ({
        sourceType: "document" as const,
        sourceId,
        excerpt: this.truncateExcerpt(span.excerpt),
        charRange: span.charRange,
        lineRange: span.lineRange,
        trustLevel: "workspace" as const,
        provenanceStatus: "complete" as const,
      }));

    return {
      workspaceId: context.workspaceId,
      projectId: context.projectId,
      sessionId: context.sessionId,
      messageIds: [],
      toolCallIds: [],
      sourceSpans: spans,
    };
  }

  /**
   * 从 memory result 绑定 provenance
   */
  bindFromMemoryResult(
    context: MemoryReviewContext,
    memoryId: string,
    content: string,
    provenanceStatus: "complete" | "partial" | "missing_legacy" = "complete"
  ): ReviewProvenance {
    return {
      workspaceId: context.workspaceId,
      projectId: context.projectId,
      sessionId: context.sessionId,
      messageIds: [],
      toolCallIds: [],
      sourceSpans: [
        {
          sourceType: "memory",
          sourceId: memoryId,
          excerpt: this.truncateExcerpt(content),
          trustLevel: "workspace",
          provenanceStatus,
        },
      ],
    };
  }

  // === Private ===

  private truncateExcerpt(text: string): string {
    if (text.length <= this.policy.maxExcerptChars) {
      return text;
    }
    return text.slice(0, this.policy.maxExcerptChars) + "...";
  }
}
