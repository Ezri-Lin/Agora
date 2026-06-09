import { describe, it, expect } from "vitest";
import { buildSessionRunningBrief } from "../compact/buildSessionRunningBrief.js";
import { formatSessionBriefForPrompt } from "../compact/formatSessionBriefForPrompt.js";
import type { CouncilRoundCompact, SessionRunningBrief } from "../compact/types.js";

function makeRoundCompact(overrides: Partial<CouncilRoundCompact> = {}): CouncilRoundCompact {
  return {
    roundId: "r1",
    userQuestion: "Should we migrate to microservices?",
    selectedPersonas: ["architect", "skeptic"],
    messageCompacts: [
      {
        messageId: "msg_1",
        speakerId: "architect",
        phase: "opening",
        summary: "Pro-migration for scalability",
        keyClaims: ["Microservices improve scalability"],
        risks: ["Increased operational complexity"],
        agreements: [],
        disagreements: [{ with: "skeptic", point: "Cost is manageable" }],
        openQuestions: ["How to handle data migration?"],
        memoryCandidate: "Decision to adopt strangler fig pattern",
      },
      {
        messageId: "msg_2",
        speakerId: "skeptic",
        phase: "opening",
        summary: "Against migration due to cost",
        keyClaims: ["Migration cost is underestimated"],
        risks: ["Team lacks distributed systems expertise"],
        agreements: [],
        disagreements: [{ with: "architect", point: "Scalability benefits overstated" }],
        openQuestions: ["What is the rollback plan?"],
      },
    ],
    consensus: [],
    disagreements: [
      { with: "skeptic", point: "Cost is manageable" },
      { with: "architect", point: "Scalability benefits overstated" },
    ],
    openQuestions: ["How to handle data migration?", "What is the rollback plan?"],
    memoryCandidates: ["Decision to adopt strangler fig pattern"],
    docWriteCandidates: [],
    ...overrides,
  };
}

describe("buildSessionRunningBrief", () => {
  it("builds brief from one round compact", () => {
    const round = makeRoundCompact();
    const brief = buildSessionRunningBrief({
      roundCompact: round,
      topic: "Microservices migration",
    });

    expect(brief.topic).toBe("Microservices migration");
    expect(brief.roundCount).toBe(1);
    expect(brief.currentDisagreements.length).toBe(2);
    expect(brief.unresolvedQuestions.length).toBe(2);
    expect(brief.memoryCandidates).toEqual(["Decision to adopt strangler fig pattern"]);
    expect(brief.personaStances.length).toBe(2);
  });

  it("merges with previous brief", () => {
    const round1 = makeRoundCompact({ roundId: "r1" });
    const brief1 = buildSessionRunningBrief({
      roundCompact: round1,
      topic: "Microservices migration",
    });

    const round2 = makeRoundCompact({
      roundId: "r2",
      openQuestions: ["New question about monitoring?"],
      disagreements: [{ with: "architect", point: "Monitoring is critical" }],
      messageCompacts: [{
        messageId: "msg_3",
        speakerId: "architect",
        phase: "opening",
        summary: "Revised: monitoring is essential",
        keyClaims: ["Observability is non-negotiable"],
        risks: [],
        agreements: [],
        disagreements: [],
        openQuestions: [],
      }],
    });

    const brief2 = buildSessionRunningBrief({
      previous: brief1,
      roundCompact: round2,
      topic: "Microservices migration",
    });

    expect(brief2.roundCount).toBe(2);
    expect(brief2.unresolvedQuestions.length).toBeGreaterThan(2);
    expect(brief2.currentDisagreements.length).toBeGreaterThan(2);
    expect(brief2.memoryCandidates).toEqual(["Decision to adopt strangler fig pattern"]);
  });

  it("dedupes disagreements", () => {
    const round = makeRoundCompact();
    const brief1 = buildSessionRunningBrief({
      roundCompact: round,
      topic: "test",
    });

    // Same round again — should not duplicate
    const brief2 = buildSessionRunningBrief({
      previous: brief1,
      roundCompact: round,
      topic: "test",
    });

    // Should be deduped
    const uniqueDisagreements = new Set(
      brief2.currentDisagreements.map((d) => `${d.with}:${d.point}`),
    );
    expect(brief2.currentDisagreements.length).toBe(uniqueDisagreements.size);
  });

  it("dedupes questions", () => {
    const round = makeRoundCompact();
    const brief1 = buildSessionRunningBrief({
      roundCompact: round,
      topic: "test",
    });

    const brief2 = buildSessionRunningBrief({
      previous: brief1,
      roundCompact: round,
      topic: "test",
    });

    const unique = new Set(brief2.unresolvedQuestions.map((q) => q.toLowerCase()));
    expect(brief2.unresolvedQuestions.length).toBe(unique.size);
  });

  it("caps list length", () => {
    // Create a round with many items
    const manyQuestions = Array.from({ length: 20 }, (_, i) => `Question ${i}?`);
    const round = makeRoundCompact({ openQuestions: manyQuestions });

    const brief = buildSessionRunningBrief({
      roundCompact: round,
      topic: "test",
    });

    expect(brief.unresolvedQuestions.length).toBeLessThanOrEqual(8);
  });

  it("builds persona stance from message compact", () => {
    const round = makeRoundCompact();
    const brief = buildSessionRunningBrief({
      roundCompact: round,
      topic: "test",
    });

    const architect = brief.personaStances.find((s) => s.personaId === "architect");
    expect(architect).toBeDefined();
    expect(architect!.currentPosition).toBe("Pro-migration for scalability");
    expect(architect!.strongestClaim).toBe("Microservices improve scalability");
    expect(architect!.concerns).toEqual(["Increased operational complexity"]);
    expect(architect!.disagreements).toHaveLength(1);
    expect(architect!.disagreements[0].withPersonaId).toBe("skeptic");
  });

  it("latest persona stance wins", () => {
    const round1 = makeRoundCompact();
    const brief1 = buildSessionRunningBrief({
      roundCompact: round1,
      topic: "test",
    });

    const round2 = makeRoundCompact({
      messageCompacts: [{
        messageId: "msg_new",
        speakerId: "architect",
        phase: "opening",
        summary: "Changed mind: monolith is better",
        keyClaims: ["Simplicity wins"],
        risks: [],
        agreements: [],
        disagreements: [],
        openQuestions: [],
      }],
    });

    const brief2 = buildSessionRunningBrief({
      previous: brief1,
      roundCompact: round2,
      topic: "test",
    });

    const architect = brief2.personaStances.find((s) => s.personaId === "architect");
    expect(architect!.currentPosition).toBe("Changed mind: monolith is better");
    expect(architect!.strongestClaim).toBe("Simplicity wins");
  });

  it("preserves memory candidates across rounds", () => {
    const round1 = makeRoundCompact({
      memoryCandidates: ["Memory from round 1"],
    });
    const brief1 = buildSessionRunningBrief({
      roundCompact: round1,
      topic: "test",
    });

    const round2 = makeRoundCompact({
      memoryCandidates: ["Memory from round 2"],
    });
    const brief2 = buildSessionRunningBrief({
      previous: brief1,
      roundCompact: round2,
      topic: "test",
    });

    expect(brief2.memoryCandidates).toContain("Memory from round 1");
    expect(brief2.memoryCandidates).toContain("Memory from round 2");
  });

  it("preserves activeGoal and latestUserIntent", () => {
    const round = makeRoundCompact();
    const brief = buildSessionRunningBrief({
      roundCompact: round,
      topic: "test",
      activeGoal: "Find best architecture",
      latestUserIntent: "Compare monolith vs microservices",
    });

    expect(brief.activeGoal).toBe("Find best architecture");
    expect(brief.latestUserIntent).toBe("Compare monolith vs microservices");
  });

  it("updates activeGoal from previous", () => {
    const round = makeRoundCompact();
    const brief1 = buildSessionRunningBrief({
      roundCompact: round,
      topic: "test",
      activeGoal: "Old goal",
    });

    const brief2 = buildSessionRunningBrief({
      previous: brief1,
      roundCompact: round,
      topic: "test",
      activeGoal: "New goal",
    });

    expect(brief2.activeGoal).toBe("New goal");
  });
});

describe("formatSessionBriefForPrompt", () => {
  it("includes topic", () => {
    const brief = makeBrief({ topic: "Architecture decisions" });
    const result = formatSessionBriefForPrompt(brief);
    expect(result).toContain("Topic: Architecture decisions");
  });

  it("includes speaker attribution in stances", () => {
    const brief = makeBrief({
      personaStances: [{
        personaId: "architect",
        currentPosition: "Pro-migration",
        concerns: ["Complexity"],
        agreements: [],
        disagreements: [],
      }],
    });
    const result = formatSessionBriefForPrompt(brief);
    expect(result).toContain("### architect");
    expect(result).toContain("Position: Pro-migration");
  });

  it("includes disagreements with attribution", () => {
    const brief = makeBrief({
      currentDisagreements: [{ with: "skeptic", point: "Too expensive" }],
    });
    const result = formatSessionBriefForPrompt(brief);
    expect(result).toContain("Current disagreements:");
    expect(result).toContain("- skeptic: Too expensive");
  });

  it("includes unresolved questions", () => {
    const brief = makeBrief({
      unresolvedQuestions: ["How to rollback?", "What about monitoring?"],
    });
    const result = formatSessionBriefForPrompt(brief);
    expect(result).toContain("Unresolved questions:");
    expect(result).toContain("- How to rollback?");
  });

  it("includes memory candidates", () => {
    const brief = makeBrief({
      memoryCandidates: ["Key decision about strangler fig"],
    });
    const result = formatSessionBriefForPrompt(brief);
    expect(result).toContain("Memory candidates:");
    expect(result).toContain("- Key decision about strangler fig");
  });

  it("includes round count", () => {
    const brief = makeBrief({ roundCount: 3 });
    const result = formatSessionBriefForPrompt(brief);
    expect(result).toContain("Rounds completed: 3");
  });

  it("includes active goal when present", () => {
    const brief = makeBrief({ activeGoal: "Find best approach" });
    const result = formatSessionBriefForPrompt(brief);
    expect(result).toContain("Active goal: Find best approach");
  });

  it("omits empty sections", () => {
    const brief = makeBrief({
      currentConsensus: [],
      currentDisagreements: [],
      unresolvedQuestions: [],
      personaStances: [],
      memoryCandidates: [],
    });
    const result = formatSessionBriefForPrompt(brief);
    expect(result).not.toContain("Current consensus:");
    expect(result).not.toContain("Current disagreements:");
    expect(result).not.toContain("Unresolved questions:");
    expect(result).not.toContain("Persona stances:");
    expect(result).not.toContain("Memory candidates:");
  });
});

function makeBrief(overrides: Partial<SessionRunningBrief> = {}): SessionRunningBrief {
  return {
    topic: "Test topic",
    currentConsensus: [],
    currentDisagreements: [],
    unresolvedQuestions: [],
    personaStances: [],
    importantDecisions: [],
    memoryCandidates: [],
    docWriteCandidates: [],
    roundCount: 1,
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}
