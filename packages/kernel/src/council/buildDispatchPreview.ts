/**
 * BuildDispatchPreview — assemble dispatch preview for UI.
 *
 * Pure assemble: no LLM, no retrieval, no mutation.
 * Produces the data structure the Dispatch Gate needs to render.
 */

import type {
  TaskFrame,
  EngagementDecision,
  DefaultSelectionResult,
  CouncilDispatchSettings,
  DispatchPreview,
} from "@agora/shared";

interface BuildDispatchPreviewInput {
  roundId: string;
  userMessageId: string;
  taskFrame: TaskFrame;
  engagementDecision: Extract<EngagementDecision, { mode: "invite" }>;
  selectionResult: DefaultSelectionResult;
  settings: CouncilDispatchSettings;
  audit?: {
    routerReason?: string;
    roleSearchQueries?: string[];
    generatedAt?: string;
  };
}

/**
 * Build a DispatchPreview from task frame + engagement decision + selection result.
 *
 * Hard rules:
 * - MUST preserve full rankedCandidates
 * - MUST NOT cap candidates
 * - MUST NOT mutate selectionResult
 * - MUST NOT call LLM
 * - MUST NOT decide finalSelectedRoleIds
 */
export function buildDispatchPreview(input: BuildDispatchPreviewInput): DispatchPreview {
  const {
    roundId,
    userMessageId,
    taskFrame,
    engagementDecision,
    selectionResult,
    settings,
    audit,
  } = input;

  return {
    roundId,
    userMessageId,
    taskFrameId: taskFrame.taskId,
    moderatorSummary: buildModeratorSummary(taskFrame),
    councilValueReason: buildCouncilValueReason(engagementDecision),
    rankedCandidates: selectionResult.rankedCandidates,
    defaultSelectedRoleIds: selectionResult.defaultSelectedRoleIds,
    recommendedAlternativeRoleIds: selectionResult.recommendedAlternativeRoleIds,
    settings: {
      defaultSelectedRoleLimit: settings.defaultSelectedRoleLimit,
      candidateDisplayLimit: settings.candidateDisplayLimit,
      skipConfirm: settings.skipConfirm,
      requireCriticByDefault: settings.requireCriticByDefault,
    },
    audit: {
      routerReason: audit?.routerReason || engagementDecision.reason,
      roleSearchQueries: audit?.roleSearchQueries || [],
      candidateCount: selectionResult.rankedCandidates.length,
      generatedAt: audit?.generatedAt || new Date().toISOString(),
    },
  };
}

function buildModeratorSummary(taskFrame: TaskFrame): string {
  const parts = [
    `**Task**: ${taskFrame.problemStatement}`,
    `**Goal**: ${taskFrame.userGoal}`,
  ];

  if (taskFrame.constraints.length > 0) {
    parts.push(`**Constraints**: ${taskFrame.constraints.join("; ")}`);
  }

  if (taskFrame.openQuestions.length > 0) {
    parts.push(`**Open questions**: ${taskFrame.openQuestions.join("; ")}`);
  }

  return parts.join("\n");
}

function buildCouncilValueReason(decision: Extract<EngagementDecision, { mode: "invite" }>): string[] {
  const reasons: string[] = [decision.reason];

  if (decision.desiredPerspectives.length > 0) {
    reasons.push(`Desired perspectives: ${decision.desiredPerspectives.join(", ")}`);
  }

  if (decision.dispatchRisk !== "low") {
    reasons.push(`Dispatch risk: ${decision.dispatchRisk}`);
  }

  return reasons;
}
