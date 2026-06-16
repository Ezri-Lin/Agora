/**
 * DecideEngagement — direct / invite / clarify with policy engine.
 *
 * v1 policy skeleton:
 * - LLM recommendation (optional seam)
 * - Policy rules override LLM when confident
 * - Cooldown gate for repeat invites
 */

import type {
  TaskFrame,
  EngagementDecision,
  InviteGateState,
  CouncilDispatchSettings,
} from "@agora/shared";
import { buildTaskFingerprint, isSameTaskThread } from "../council/taskFingerprint.js";

interface DecideEngagementInput {
  taskFrame: TaskFrame;
  inviteGateState?: InviteGateState;
  userInviteTrigger: boolean;
  settings: CouncilDispatchSettings;
  llm?: {
    callModerator: (params: {
      roomId: string;
      task: string;
      context: string;
    }) => Promise<{ content: string }>;
  };
  roomId?: string;
}

// === Explicit invite triggers ===

const INVITE_TRIGGER_PATTERNS = [
  /拉.*人/i,
  /邀请/i,
  /一起讨论/i,
  /多人/i,
  /多角色/i,
  /多视角/i,
  /council/i,
  /讨论一下/i,
  /帮我找.*人/i,
];

function hasExplicitInviteTrigger(taskFrame: TaskFrame): boolean {
  const text = taskFrame.userGoal + " " + taskFrame.problemStatement;
  return INVITE_TRIGGER_PATTERNS.some((p) => p.test(text));
}

// === Simple task detection ===

const SIMPLE_TASK_TYPES = new Set<string>(["other"]);

function isSimpleTask(taskFrame: TaskFrame): boolean {
  // Short problem statement with no constraints = likely simple
  if (taskFrame.problemStatement.length < 30 && taskFrame.constraints.length === 0) {
    return true;
  }
  // Task type "other" with no docs = likely simple
  if (SIMPLE_TASK_TYPES.has(taskFrame.taskType) && taskFrame.selectedDocs.length === 0) {
    return true;
  }
  return false;
}

// === High council value detection ===

const HIGH_VALUE_TASK_TYPES = new Set<string>([
  "design_discussion",
  "architecture_decision",
  "spec_draft",
  "implementation_planning",
]);

function hasHighCouncilValue(taskFrame: TaskFrame): boolean {
  if (HIGH_VALUE_TASK_TYPES.has(taskFrame.taskType)) return true;
  // Multiple constraints or open questions = complex
  if (taskFrame.constraints.length >= 2 || taskFrame.openQuestions.length >= 2) return true;
  // Has document context = richer discussion possible
  if (taskFrame.selectedDocs.length > 0) return true;
  return false;
}

// === Cooldown check ===

function checkSameTaskThread(
  taskFrame: TaskFrame,
  inviteGateState?: InviteGateState,
): boolean {
  if (!inviteGateState?.lastInviteTaskFingerprint) return false;
  const currentFingerprint = buildTaskFingerprint(taskFrame);
  return isSameTaskThread(inviteGateState.lastInviteTaskFingerprint, currentFingerprint);
}

// === Main decision function ===

export async function decideEngagement(input: DecideEngagementInput): Promise<EngagementDecision> {
  const { taskFrame, inviteGateState, userInviteTrigger, settings } = input;

  // 1. Explicit user invite trigger → always invite
  const explicitTrigger = userInviteTrigger || hasExplicitInviteTrigger(taskFrame);
  if (explicitTrigger) {
    return {
      mode: "invite",
      reason: "User explicitly requested multi-role discussion.",
      desiredPerspectives: inferDesiredPerspectives(taskFrame),
      dispatchRisk: "low",
    };
  }

  // 2. Cooldown gate: same task thread, no user trigger → prefer direct
  if (inviteGateState?.status === "cooldown" && checkSameTaskThread(taskFrame, inviteGateState)) {
    return {
      mode: "direct",
      reason: "Similar task was recently discussed. User can explicitly request council if needed.",
    };
  }

  // 3. Simple task → direct
  if (isSimpleTask(taskFrame)) {
    return {
      mode: "direct",
      reason: "Simple task, no multi-perspective analysis needed.",
    };
  }

  // 4. High council value → invite
  if (hasHighCouncilValue(taskFrame)) {
    return {
      mode: "invite",
      reason: `Task type '${taskFrame.taskType}' benefits from multiple perspectives.`,
      desiredPerspectives: inferDesiredPerspectives(taskFrame),
      dispatchRisk: "low",
    };
  }

  // 5. Default: direct (conservative)
  return {
    mode: "direct",
    reason: "Task can be addressed without multi-role discussion.",
  };
}

// === Helper: infer desired perspectives from task type ===

function inferDesiredPerspectives(taskFrame: TaskFrame): string[] {
  switch (taskFrame.taskType) {
    case "design_discussion":
      return ["ux_research_lens", "systems_architect", "skeptic_critic"];
    case "architecture_decision":
      return ["systems_architect", "implementation_reviewer", "skeptic_critic"];
    case "spec_draft":
      return ["product_strategist", "systems_architect", "writing_editor"];
    case "implementation_planning":
      return ["implementation_reviewer", "systems_architect", "skeptic_critic"];
    case "doc_review":
      return ["evidence_reviewer", "writing_editor"];
    case "research":
      return ["research_librarian", "evidence_reviewer"];
    case "writing":
      return ["writing_editor", "knowledge_synthesizer"];
    default:
      return ["skeptic_critic"];
  }
}
