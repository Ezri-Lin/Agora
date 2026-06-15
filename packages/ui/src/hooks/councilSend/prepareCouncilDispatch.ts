/**
 * PrepareCouncilDispatch — orchestrate task frame → engagement → selection → preview.
 *
 * This is the core pipeline for the "task" route:
 * 1. BuildTaskFrame — analyze task + doc context
 * 2. DecideEngagement — direct / invite / clarify
 * 3. If invite: retrieve + score roles → apply default selection → build preview
 *
 * Does NOT run the council round or persist anything.
 */

import type {
  TaskFrame,
  EngagementDecision,
  DispatchPreview,
  CouncilDispatchSettings,
  InviteGateState,
  SourceRef,
  CouncilMessage,
  RoleCard,
} from "@agora/shared";
import { buildTaskFrame, decideEngagement, applyDefaultSelectionPolicy, buildDispatchPreview } from "@agora/kernel";

// Re-export for convenience
export type { DispatchPreview };

interface PrepareDispatchInput {
  userMessage: string;
  selectedDocs: SourceRef[];
  providedDocContents?: Map<string, string>;
  recentMessages: CouncilMessage[];
  allRoles: RoleCard[];
  inviteGateState?: InviteGateState;
  userInviteTrigger: boolean;
  settings: CouncilDispatchSettings;
  roomId: string;
  llm: {
    callModerator: (params: {
      roomId: string;
      task: string;
      context: string;
    }) => Promise<{ content: string }>;
  };
}

interface PrepareDispatchResult {
  taskFrame: TaskFrame;
  engagementDecision: EngagementDecision;
  dispatchPreview?: DispatchPreview;
}

/**
 * Prepare dispatch: task frame → engagement decision → (if invite) dispatch preview.
 * Returns the full result so the orchestration layer can decide what to show.
 */
export async function prepareCouncilDispatch(
  input: PrepareDispatchInput,
): Promise<PrepareDispatchResult> {
  const {
    userMessage,
    selectedDocs,
    providedDocContents,
    recentMessages,
    allRoles,
    inviteGateState,
    userInviteTrigger,
    settings,
    roomId,
    llm,
  } = input;

  // Step 1: Build task frame
  const taskFrame = await buildTaskFrame({
    userMessage,
    selectedDocs,
    providedDocContents,
    recentMessages,
    llm,
    roomId,
  });

  // Step 2: Decide engagement
  const engagementDecision = await decideEngagement({
    taskFrame,
    inviteGateState,
    userInviteTrigger,
    settings,
    llm,
    roomId,
  });

  // Step 3: If invite, build dispatch preview
  if (engagementDecision.mode === "invite") {
    // TODO: Replace with real role retrieval + scoring
    // For now, use allRoles as candidates with mock scores
    const rankedCandidates = allRoles
      .filter((r) => r.id !== "moderator")
      .map((role, i) => ({
        roleId: role.id,
        name: role.name,
        subtitle: role.subtitle,
        domainId: role.domainId || "core",
        familyId: role.familyId || "default",
        tags: role.tags,
        score: 1 - i * 0.05,
        scoreBreakdown: {
          relevance: 0.8,
          diversity: 0.5,
          conflictValue: 0.3,
          userPreferenceFit: 0.5,
          groundingQuality: 0.7,
        },
        reason: `Matched for ${taskFrame.taskType}`,
        source: "router_recommended" as const,
        rank: i,
        defaultSelected: false,
      }));

    const selectionResult = applyDefaultSelectionPolicy(rankedCandidates, settings);

    const dispatchPreview = buildDispatchPreview({
      roundId: `round-${Date.now()}`,
      userMessageId: `msg-${Date.now()}`,
      taskFrame,
      engagementDecision,
      selectionResult,
      settings,
    });

    return { taskFrame, engagementDecision, dispatchPreview };
  }

  return { taskFrame, engagementDecision };
}
