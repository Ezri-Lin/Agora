/**
 * DecisionLogWriter — 写入决策日志
 *
 * 提供便捷方法创建不同类型的日志条目
 */

import type {
  DecisionLogEntry,
  DecisionLogStore,
  DecisionLogEventType,
  DecisionLogActor,
  DecisionLogSourceRef,
  DecisionLogError,
} from "./types.js";
import { generateDecisionLogId } from "./types.js";

export class DecisionLogWriter {
  constructor(private store: DecisionLogStore) {}

  /**
   * 记录 memory candidate 创建
   */
  async logMemoryCandidateCreated(params: {
    workspaceId: string;
    projectId?: string;
    sessionId?: string;
    councilRoundId?: string;
    candidateId: string;
    candidateContent: string;
    sourceRefs?: DecisionLogSourceRef[];
  }): Promise<DecisionLogError | null> {
    return this.append({
      workspaceId: params.workspaceId,
      projectId: params.projectId,
      sessionId: params.sessionId,
      councilRoundId: params.councilRoundId,
      type: "memory_candidate_created",
      title: "Memory candidate created",
      summary: `New memory candidate: "${params.candidateContent.slice(0, 100)}"`,
      actor: "system",
      sourceRefs: [
        { type: "memory_review", id: params.candidateId },
        ...(params.sourceRefs ?? []),
      ],
    });
  }

  /**
   * 记录 memory candidate accepted
   */
  async logMemoryCandidateAccepted(params: {
    workspaceId: string;
    projectId?: string;
    sessionId?: string;
    councilRoundId?: string;
    reviewId: string;
    candidateId: string;
    reason: string;
    sourceRefs?: DecisionLogSourceRef[];
  }): Promise<DecisionLogError | null> {
    return this.append({
      workspaceId: params.workspaceId,
      projectId: params.projectId,
      sessionId: params.sessionId,
      councilRoundId: params.councilRoundId,
      type: "memory_candidate_accepted",
      title: "Memory candidate accepted",
      summary: `Accepted memory: ${params.reason}`,
      actor: "user",
      sourceRefs: [
        { type: "memory_review", id: params.reviewId },
        ...(params.sourceRefs ?? []),
      ],
    });
  }

  /**
   * 记录 memory candidate rejected
   */
  async logMemoryCandidateRejected(params: {
    workspaceId: string;
    projectId?: string;
    sessionId?: string;
    councilRoundId?: string;
    reviewId: string;
    candidateId: string;
    reason: string;
    decidedBy: "user" | "policy";
    sourceRefs?: DecisionLogSourceRef[];
  }): Promise<DecisionLogError | null> {
    return this.append({
      workspaceId: params.workspaceId,
      projectId: params.projectId,
      sessionId: params.sessionId,
      councilRoundId: params.councilRoundId,
      type: "memory_candidate_rejected",
      title: "Memory candidate rejected",
      summary: `Rejected: ${params.reason}`,
      actor: params.decidedBy,
      sourceRefs: [
        { type: "memory_review", id: params.reviewId },
        ...(params.sourceRefs ?? []),
      ],
    });
  }

  /**
   * 记录 council round 完成
   */
  async logCouncilRoundCompleted(params: {
    workspaceId: string;
    projectId?: string;
    sessionId?: string;
    councilRoundId: string;
    roleCount: number;
    toolCallCount: number;
    sourceRefs?: DecisionLogSourceRef[];
  }): Promise<DecisionLogError | null> {
    return this.append({
      workspaceId: params.workspaceId,
      projectId: params.projectId,
      sessionId: params.sessionId,
      councilRoundId: params.councilRoundId,
      type: "council_round_completed",
      title: "Council round completed",
      summary: `${params.roleCount} roles, ${params.toolCallCount} tool calls`,
      actor: "system",
      sourceRefs: params.sourceRefs ?? [],
    });
  }

  /**
   * 记录 role tool 使用
   */
  async logRoleToolUsed(params: {
    workspaceId: string;
    projectId?: string;
    sessionId?: string;
    councilRoundId?: string;
    roleId: string;
    toolName: string;
    ok: boolean;
    sourceRefs?: DecisionLogSourceRef[];
  }): Promise<DecisionLogError | null> {
    return this.append({
      workspaceId: params.workspaceId,
      projectId: params.projectId,
      sessionId: params.sessionId,
      councilRoundId: params.councilRoundId,
      type: "role_tool_used",
      title: `Role tool used: ${params.toolName}`,
      summary: `${params.roleId} used ${params.toolName}: ${params.ok ? "success" : "failed"}`,
      actor: "role",
      actorId: params.roleId,
      sourceRefs: params.sourceRefs ?? [],
    });
  }

  /**
   * 记录 moderator summary
   */
  async logModeratorSummaryCreated(params: {
    workspaceId: string;
    projectId?: string;
    sessionId?: string;
    councilRoundId: string;
    summary: string;
    sourceRefs?: DecisionLogSourceRef[];
  }): Promise<DecisionLogError | null> {
    return this.append({
      workspaceId: params.workspaceId,
      projectId: params.projectId,
      sessionId: params.sessionId,
      councilRoundId: params.councilRoundId,
      type: "moderator_summary_created",
      title: "Moderator summary created",
      summary: params.summary.slice(0, 200),
      actor: "moderator",
      sourceRefs: params.sourceRefs ?? [],
    });
  }

  /**
   * 记录用户决策
   */
  async logUserDecision(params: {
    workspaceId: string;
    projectId?: string;
    sessionId?: string;
    councilRoundId?: string;
    title: string;
    summary: string;
    sourceRefs?: DecisionLogSourceRef[];
  }): Promise<DecisionLogError | null> {
    return this.append({
      workspaceId: params.workspaceId,
      projectId: params.projectId,
      sessionId: params.sessionId,
      councilRoundId: params.councilRoundId,
      type: "user_decision",
      title: params.title,
      summary: params.summary,
      actor: "user",
      sourceRefs: params.sourceRefs ?? [],
    });
  }

  // === Private ===

  private async append(
    params: Omit<DecisionLogEntry, "id" | "createdAt">
  ): Promise<DecisionLogError | null> {
    const entry: DecisionLogEntry = {
      ...params,
      id: generateDecisionLogId(),
      createdAt: new Date().toISOString(),
    };

    return this.store.append(entry) ?? null;
  }
}
