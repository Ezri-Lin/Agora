import { describe, it, expect } from "vitest";
import { buildDispatchPreview } from "../council/buildDispatchPreview.js";
import type {
  TaskFrame,
  EngagementDecision,
  DefaultSelectionResult,
  CouncilDispatchSettings,
  RoleCandidate,
} from "@agora/shared";

function makeCandidate(roleId: string, score = 0.8): RoleCandidate {
  return {
    roleId,
    name: roleId,
    subtitle: "",
    domainId: "core",
    familyId: "default",
    tags: [],
    score,
    scoreBreakdown: { relevance: 0.8, diversity: 0.5, conflictValue: 0.3, userPreferenceFit: 0.5, groundingQuality: 0.7 },
    reason: "test",
    source: "router_recommended",
    rank: 0,
    defaultSelected: false,
  };
}

const mockTaskFrame: TaskFrame = {
  taskId: "task-1",
  userMessageId: "msg-1",
  taskType: "architecture_decision",
  userGoal: "Design the invite gate system",
  problemStatement: "How should the invite gate state machine work?",
  selectedDocs: [],
  retrievedContext: [],
  constraints: ["Must be room-level", "Must support cooldown"],
  openQuestions: ["Should fingerprint use semantic similarity?"],
  taskBriefForHost: "Design invite gate",
  taskBriefForRoles: "Design invite gate with constraints",
  evidencePolicy: { enoughContext: true, missingEvidence: [], shouldSearchMore: false },
};

const mockInviteDecision: Extract<EngagementDecision, { mode: "invite" }> = {
  mode: "invite",
  reason: "Architecture decision benefits from multiple perspectives.",
  desiredPerspectives: ["systems_architect", "skeptic_critic"],
  dispatchRisk: "low",
};

const mockSettings: CouncilDispatchSettings = {
  defaultSelectedRoleLimit: 3,
  candidateDisplayLimit: 10,
  skipConfirm: false,
  requireCriticByDefault: true,
};

describe("buildDispatchPreview", () => {
  it("preserves full rankedCandidates length", () => {
    const candidates = Array.from({ length: 8 }, (_, i) => makeCandidate(`r${i}`));
    const selectionResult: DefaultSelectionResult = {
      rankedCandidates: candidates,
      defaultSelectedRoleIds: ["r0", "r1", "r2"],
      recommendedAlternativeRoleIds: ["r3", "r4", "r5", "r6", "r7"],
    };

    const preview = buildDispatchPreview({
      roundId: "round-1",
      userMessageId: "msg-1",
      taskFrame: mockTaskFrame,
      engagementDecision: mockInviteDecision,
      selectionResult,
      settings: mockSettings,
    });

    expect(preview.rankedCandidates.length).toBe(8);
  });

  it("includes defaultSelectedRoleIds from selection result", () => {
    const selectionResult: DefaultSelectionResult = {
      rankedCandidates: [makeCandidate("a"), makeCandidate("b"), makeCandidate("c")],
      defaultSelectedRoleIds: ["a", "b"],
      recommendedAlternativeRoleIds: ["c"],
    };

    const preview = buildDispatchPreview({
      roundId: "round-1",
      userMessageId: "msg-1",
      taskFrame: mockTaskFrame,
      engagementDecision: mockInviteDecision,
      selectionResult,
      settings: mockSettings,
    });

    expect(preview.defaultSelectedRoleIds).toEqual(["a", "b"]);
  });

  it("includes recommendedAlternativeRoleIds", () => {
    const selectionResult: DefaultSelectionResult = {
      rankedCandidates: [makeCandidate("a"), makeCandidate("b"), makeCandidate("c")],
      defaultSelectedRoleIds: ["a"],
      recommendedAlternativeRoleIds: ["b", "c"],
    };

    const preview = buildDispatchPreview({
      roundId: "round-1",
      userMessageId: "msg-1",
      taskFrame: mockTaskFrame,
      engagementDecision: mockInviteDecision,
      selectionResult,
      settings: mockSettings,
    });

    expect(preview.recommendedAlternativeRoleIds).toEqual(["b", "c"]);
  });

  it("builds non-empty moderatorSummary from TaskFrame", () => {
    const selectionResult: DefaultSelectionResult = {
      rankedCandidates: [],
      defaultSelectedRoleIds: [],
      recommendedAlternativeRoleIds: [],
    };

    const preview = buildDispatchPreview({
      roundId: "round-1",
      userMessageId: "msg-1",
      taskFrame: mockTaskFrame,
      engagementDecision: mockInviteDecision,
      selectionResult,
      settings: mockSettings,
    });

    expect(preview.moderatorSummary).toContain("How should the invite gate");
    expect(preview.moderatorSummary).toContain("Design the invite gate");
  });

  it("builds councilValueReason from engagementDecision", () => {
    const selectionResult: DefaultSelectionResult = {
      rankedCandidates: [],
      defaultSelectedRoleIds: [],
      recommendedAlternativeRoleIds: [],
    };

    const preview = buildDispatchPreview({
      roundId: "round-1",
      userMessageId: "msg-1",
      taskFrame: mockTaskFrame,
      engagementDecision: mockInviteDecision,
      selectionResult,
      settings: mockSettings,
    });

    expect(preview.councilValueReason.length).toBeGreaterThan(0);
    expect(preview.councilValueReason[0]).toContain("multiple perspectives");
  });

  it("does not produce finalSelectedRoleIds", () => {
    const selectionResult: DefaultSelectionResult = {
      rankedCandidates: [makeCandidate("a")],
      defaultSelectedRoleIds: ["a"],
      recommendedAlternativeRoleIds: [],
    };

    const preview = buildDispatchPreview({
      roundId: "round-1",
      userMessageId: "msg-1",
      taskFrame: mockTaskFrame,
      engagementDecision: mockInviteDecision,
      selectionResult,
      settings: mockSettings,
    });

    // DispatchPreview should NOT have finalSelectedRoleIds
    expect((preview as any).finalSelectedRoleIds).toBeUndefined();
  });

  it("includes audit info", () => {
    const selectionResult: DefaultSelectionResult = {
      rankedCandidates: [makeCandidate("a"), makeCandidate("b")],
      defaultSelectedRoleIds: ["a"],
      recommendedAlternativeRoleIds: ["b"],
    };

    const preview = buildDispatchPreview({
      roundId: "round-1",
      userMessageId: "msg-1",
      taskFrame: mockTaskFrame,
      engagementDecision: mockInviteDecision,
      selectionResult,
      settings: mockSettings,
      audit: { routerReason: "test reason", roleSearchQueries: ["architecture"] },
    });

    expect(preview.audit.routerReason).toBe("test reason");
    expect(preview.audit.roleSearchQueries).toEqual(["architecture"]);
    expect(preview.audit.candidateCount).toBe(2);
  });
});
