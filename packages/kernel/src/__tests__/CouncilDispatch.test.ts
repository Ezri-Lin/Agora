import { describe, it, expect } from "vitest";
import { prepareCouncilDispatch } from "../council/prepareCouncilDispatch.js";
import type { RoleCard, CouncilRoom, CouncilMessage } from "@agora/shared";

// Minimal test fixtures
const TEST_ROOM: CouncilRoom = {
  id: "room_test",
  title: "Test Room",
  workspaceId: "ws_test",
  sourceRefs: [],
  participants: [],
  settings: {
    roleCount: 4,
    maxMessagesPerRoleBeforeUserReply: 3,
    allowAutoDocs: false,
    allowCrossExamination: false,
    generationMode: "multi_call_cached",
    contextMode: "full_doc",
  },
  visibility: "private",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const TEST_MESSAGE: CouncilMessage = {
  id: "msg_user_1",
  roomId: "room_test",
  senderType: "user",
  senderId: "user_1",
  content: "Should we migrate to microservices architecture?",
  status: "ok",
  createdAt: new Date().toISOString(),
};

function makeRole(
  id: string,
  name: string,
  opts: { type?: RoleCard["type"]; subtitle?: string; tags?: string[]; prompt?: string } = {},
): RoleCard {
  return {
    id,
    name,
    nameCN: name,
    subtitle: opts.subtitle ?? name,
    type: opts.type ?? "architect",
    systemPrompt: opts.prompt ?? `You are ${name}. ${opts.subtitle ?? name}.`,
    tags: opts.tags ?? [],
  };
}

const ROLES: RoleCard[] = [
  makeRole("architect", "Architect", {
    type: "architect",
    subtitle: "System architecture and microservices design expert",
    tags: ["architecture", "design", "system", "microservices", "migration"],
    prompt: "You are a system architect specializing in microservices migration and distributed systems design.",
  }),
  makeRole("cost_analyst", "Cost Analyst", {
    type: "strategist",
    subtitle: "Infrastructure cost analysis and budget optimization",
    tags: ["cost", "budget", "pricing", "infrastructure", "cloud"],
    prompt: "You analyze cloud infrastructure costs and optimize budgets for technology projects.",
  }),
  makeRole("security", "Security Expert", {
    type: "critic",
    subtitle: "Security analysis and threat modeling for architecture decisions",
    tags: ["security", "authentication", "threat", "architecture"],
    prompt: "You perform security analysis and threat modeling for system architecture decisions.",
  }),
  makeRole("pm", "Product Manager", {
    type: "strategist",
    subtitle: "Product roadmap and feature prioritization",
    tags: ["product", "roadmap", "features", "stakeholder"],
    prompt: "You manage product roadmaps and prioritize features based on stakeholder needs.",
  }),
];

// Lower threshold for test data which has minimal persona metadata
const LOW_THRESHOLD = {
  relevanceThreshold: 0.1,
  suggestionThreshold: 0.05,
};

describe("prepareCouncilDispatch", () => {
  it("returns routingDecision", async () => {
    const preview = await prepareCouncilDispatch({
      room: TEST_ROOM,
      topic: "microservices architecture",
      userMessage: TEST_MESSAGE,
      availableRoles: ROLES,
      routingSettings: LOW_THRESHOLD,
    });

    expect(preview.routingDecision).toBeDefined();
    expect(preview.routingDecision.activeEntrants).toBeDefined();
    expect(Array.isArray(preview.routingDecision.activeEntrants)).toBe(true);
  });

  it("returns defaultSelectedRoleIds", async () => {
    const preview = await prepareCouncilDispatch({
      room: TEST_ROOM,
      topic: "microservices architecture",
      userMessage: TEST_MESSAGE,
      availableRoles: ROLES,
      routingSettings: LOW_THRESHOLD,
    });

    expect(Array.isArray(preview.defaultSelectedRoleIds)).toBe(true);
    expect(preview.defaultSelectedRoleIds.length).toBeGreaterThan(0);
    expect(preview.defaultSelectedRoleIds.length).toBeLessThanOrEqual(5);
  });

  it("returns alternativeRoleIds", async () => {
    const preview = await prepareCouncilDispatch({
      room: TEST_ROOM,
      topic: "microservices architecture",
      userMessage: TEST_MESSAGE,
      availableRoles: ROLES,
      routingSettings: LOW_THRESHOLD,
    });

    expect(Array.isArray(preview.alternativeRoleIds)).toBe(true);
    // Alternatives should not overlap with default selected
    for (const id of preview.defaultSelectedRoleIds) {
      expect(preview.alternativeRoleIds).not.toContain(id);
    }
  });

  it("includes deterministic moderatorSummary", async () => {
    const preview = await prepareCouncilDispatch({
      room: TEST_ROOM,
      topic: "microservices architecture",
      userMessage: TEST_MESSAGE,
      availableRoles: ROLES,
      routingSettings: LOW_THRESHOLD,
    });

    expect(preview.moderatorSummary).toBeDefined();
    expect(preview.moderatorSummary.length).toBeGreaterThan(0);
    expect(preview.moderatorSummary).toContain("本轮议题");
    expect(preview.moderatorSummary).toContain("你可以调整参与者后继续");
  });

  it("moderatorSummary includes selected role names", async () => {
    const preview = await prepareCouncilDispatch({
      room: TEST_ROOM,
      topic: "microservices architecture",
      userMessage: TEST_MESSAGE,
      availableRoles: ROLES,
      routingSettings: LOW_THRESHOLD,
    });

    const roleNames = ROLES.map((r) => r.name);
    const hasAnyRoleName = roleNames.some((name) =>
      preview.moderatorSummary.includes(name),
    );
    expect(hasAnyRoleName).toBe(true);
  });

  it("uses contextPackage when provided", async () => {
    const mockContext = {
      task: "microservices architecture",
      mode: "synthesize" as const,
      relevantDocs: [{
        sourceId: "doc1",
        path: "/docs/arch.md",
        excerpt: "Architecture notes",
      }],
      constraints: [],
    };

    const preview = await prepareCouncilDispatch({
      room: TEST_ROOM,
      topic: "microservices architecture",
      userMessage: TEST_MESSAGE,
      availableRoles: ROLES,
      contextPackage: mockContext,
    });

    expect(preview.contextPackage).toBe(mockContext);
  });

  it("retrieves context when retrievalEngine provided", async () => {
    let retrieveCalled = false;

    const mockRetrievalEngine = {
      retrieve: async () => {
        retrieveCalled = true;
        return {
          query: { query: "test", mode: "synthesize" as const },
          chunks: [],
        };
      },
    };

    await prepareCouncilDispatch({
      room: TEST_ROOM,
      topic: "microservices architecture",
      userMessage: TEST_MESSAGE,
      availableRoles: ROLES,
      retrievalEngine: mockRetrievalEngine,
    });

    expect(retrieveCalled).toBe(true);
  });

  it("sessionRunningBrief passed through", async () => {
    const brief = {
      topic: "Previous discussion",
      currentConsensus: ["Agreed on cloud-first", "Budget approved"],
      currentDisagreements: [],
      unresolvedQuestions: [],
      personaStances: [],
      importantDecisions: [],
      memoryCandidates: [],
      docWriteCandidates: [],
      roundCount: 2,
      updatedAt: new Date().toISOString(),
    };

    const preview = await prepareCouncilDispatch({
      room: TEST_ROOM,
      topic: "microservices architecture",
      userMessage: TEST_MESSAGE,
      availableRoles: ROLES,
      sessionRunningBrief: brief,
    });

    expect(preview.sessionRunningBrief).toBe(brief);
    expect(preview.moderatorSummary).toContain("已有共识");
  });

  it("explicitRoleRequests influence dispatch preview", async () => {
    const preview = await prepareCouncilDispatch({
      room: TEST_ROOM,
      topic: "microservices architecture",
      userMessage: TEST_MESSAGE,
      availableRoles: ROLES,
      explicitRoleRequests: [{
        targetType: "persona",
        targetId: "security",
        confidence: 0.9,
        rawText: "@security",
      }],
    });

    expect(preview.routingDecision).toBeDefined();
  });

  it("userMessageId matches input", async () => {
    const preview = await prepareCouncilDispatch({
      room: TEST_ROOM,
      topic: "microservices architecture",
      userMessage: TEST_MESSAGE,
      availableRoles: ROLES,
    });

    expect(preview.userMessageId).toBe("msg_user_1");
  });

  it("topic passed through", async () => {
    const preview = await prepareCouncilDispatch({
      room: TEST_ROOM,
      topic: "database migration strategy",
      userMessage: TEST_MESSAGE,
      availableRoles: ROLES,
    });

    expect(preview.topic).toBe("database migration strategy");
  });
});

describe("runCouncilRound with selectedRoleIds", () => {
  it("selectedRoleIds field accepted in input type", () => {
    const input: import("../council/CouncilRunner.js").RunCouncilRoundInput = {
      room: TEST_ROOM,
      topic: "test",
      userMessage: TEST_MESSAGE,
      availableRoles: ROLES,
      llm: {
        callModerator: async () => ({ content: "[]" }),
        callRole: async () => ({ roleId: "architect", content: "response" }),
      },
      selectedRoleIds: ["architect", "pm"],
    };

    expect(input.selectedRoleIds).toEqual(["architect", "pm"]);
  });
});
