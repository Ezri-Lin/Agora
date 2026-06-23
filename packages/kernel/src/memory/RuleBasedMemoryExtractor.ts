/**
 * RuleBasedMemoryExtractor — 基于规则的记忆提取器
 *
 * 不调用 LLM，用确定性规则从 ConversationSummaryV1 提取记忆候选
 * 用于建立 baseline，给 eval 一个稳定下限
 */

import type {
  MemoryExtractor,
  MemoryExtractionInput,
  MemoryExtractionResult,
} from "./MemoryExtractionTypes.js";
import type {
  MemoryCandidate,
  RejectedMemoryCandidate,
  MemoryExtractionTrace,
  MemoryScope,
  MemoryType,
} from "./MemoryCandidate.js";
import type { ConversationSummaryV1 } from "../context/ConversationSummary.js";

export class RuleBasedMemoryExtractor implements MemoryExtractor {
  async extract(
    input: MemoryExtractionInput
  ): Promise<MemoryExtractionResult> {
    const startedAt = new Date().toISOString();
    const { sessionId, summary, projectId, domain } = input;

    const candidates: MemoryCandidate[] = [];
    const rejected: RejectedMemoryCandidate[] = [];

    // Extract decisions
    this.extractDecisions(summary, sessionId, candidates, rejected);

    // Extract key insights
    this.extractInsights(summary, sessionId, candidates, rejected);

    // Extract role stances
    this.extractRoleStances(summary, sessionId, candidates, rejected);

    // Apply review policy
    this.applyReviewPolicy(candidates);

    const completedAt = new Date().toISOString();

    return {
      candidates,
      rejected,
      trace: {
        extractor: "rule_based",
        startedAt,
        completedAt,
        parsedCandidateCount: candidates.length,
        validatedCandidateCount: candidates.length,
        rejectedCandidateCount: rejected.length,
        reviewAcceptedCount: candidates.filter((c) => c.status === "accepted").length,
        reviewCandidateCount: candidates.filter((c) => c.status === "candidate").length,
        validationErrors: [],
        retryCount: 0,
        fallbackUsed: false,
      },
    };
  }

  private extractDecisions(
    summary: ConversationSummaryV1,
    sessionId: string,
    candidates: MemoryCandidate[],
    rejected: RejectedMemoryCandidate[]
  ): void {
    for (const decision of summary.decisions) {
      // Check source refs
      if (decision.sourceMessageIds.length === 0) {
        rejected.push({
          content: decision.statement,
          reason: "source.messageIds must not be empty",
        });
        continue;
      }

      // Determine scope and confidence
      const scope: MemoryScope = "project";
      const confidence = decision.status === "accepted" ? 0.95 : 0.7;

      candidates.push({
        id: `mem-${decision.id}`,
        scope,
        type: "decision",
        content: decision.statement,
        source: {
          sessionId,
          messageIds: decision.sourceMessageIds,
        },
        confidence,
        status: "candidate",
        tags: [],
        createdAt: new Date().toISOString(),
      });
    }
  }

  private extractInsights(
    summary: ConversationSummaryV1,
    sessionId: string,
    candidates: MemoryCandidate[],
    rejected: RejectedMemoryCandidate[]
  ): void {
    for (const insight of summary.keyInsights) {
      // Check source refs
      if (insight.sourceMessageIds.length === 0) {
        rejected.push({
          content: insight.insight,
          reason: "source.messageIds must not be empty",
        });
        continue;
      }

      // Infer type and scope from content
      const { type, scope, confidence } = this.inferInsightType(
        insight.insight,
        insight.confidence,
        summary.evidenceRefs
      );

      candidates.push({
        id: `mem-${insight.id}`,
        scope,
        type,
        content: insight.insight,
        source: {
          sessionId,
          messageIds: insight.sourceMessageIds,
          evidenceRefs: type === "fact" ? summary.evidenceRefs : undefined,
        },
        confidence,
        status: "candidate",
        tags: [],
        createdAt: new Date().toISOString(),
      });
    }
  }

  private extractRoleStances(
    summary: ConversationSummaryV1,
    sessionId: string,
    candidates: MemoryCandidate[],
    rejected: RejectedMemoryCandidate[]
  ): void {
    for (const stance of summary.roleStances) {
      // Check source refs
      if (stance.sourceMessageIds.length === 0) {
        rejected.push({
          content: stance.stance,
          reason: "source.messageIds must not be empty",
        });
        continue;
      }

      candidates.push({
        id: `mem-stance-${stance.roleId}`,
        scope: "role_usage",
        type: "role_usage",
        content: `${stance.roleName}: ${stance.stance}`,
        source: {
          sessionId,
          messageIds: stance.sourceMessageIds,
        },
        confidence: stance.confidence === "high" ? 0.8 : stance.confidence === "medium" ? 0.6 : 0.4,
        status: "candidate",
        tags: [stance.roleId],
        createdAt: new Date().toISOString(),
      });
    }
  }

  private inferInsightType(
    content: string,
    confidenceLevel: string,
    evidenceRefs: string[]
  ): { type: MemoryType; scope: MemoryScope; confidence: number } {
    // Check if it's a user preference
    if (content.includes("用户") && content.includes("偏好")) {
      return {
        type: "preference",
        scope: "project",
        confidence: 0.9, // User explicitly stated
      };
    }

    // Check if it's a fact with evidence
    if (evidenceRefs && evidenceRefs.length > 0) {
      return {
        type: "fact",
        scope: "global",
        confidence: 0.95,
      };
    }

    // Check if it's role usage
    if (
      content.includes("Skeptic Critic") ||
      content.includes("角色") ||
      content.includes("Role")
    ) {
      return {
        type: "role_usage",
        scope: "role_usage",
        confidence: confidenceLevel === "high" ? 0.8 : confidenceLevel === "medium" ? 0.6 : 0.4,
      };
    }

    // Default to insight
    return {
      type: "insight",
      scope: "project",
      confidence: confidenceLevel === "high" ? 0.9 : confidenceLevel === "medium" ? 0.7 : 0.5,
    };
  }

  private applyReviewPolicy(candidates: MemoryCandidate[]): void {
    for (const candidate of candidates) {
      // Apply auto-accept rules
      if (this.canAutoAccept(candidate)) {
        candidate.status = "accepted";
      }
    }
  }

  private canAutoAccept(candidate: MemoryCandidate): boolean {
    // Only candidate status can be auto-accepted
    if (candidate.status !== "candidate") {
      return false;
    }

    // Type-specific rules
    switch (candidate.type) {
      case "decision":
        // Can auto-accept project-scope accepted decisions
        return (
          candidate.scope === "project" &&
          candidate.confidence >= 0.9
        );

      case "insight":
        // Can auto-accept high-confidence insights
        return candidate.confidence >= 0.95;

      case "constraint":
        // Can auto-accept high-confidence constraints
        return candidate.confidence >= 0.9;

      case "fact":
        // Can auto-accept facts with evidence
        return (
          candidate.confidence >= 0.95 &&
          candidate.source.evidenceRefs &&
          candidate.source.evidenceRefs.length > 0
        );

      default:
        // Other types need review
        return false;
    }
  }
}
