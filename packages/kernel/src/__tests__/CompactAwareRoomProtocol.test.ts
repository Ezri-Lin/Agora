import { describe, it, expect } from "vitest";
import { buildRoundCompact } from "../compact/buildRoundCompact.js";
import { formatCompactsForPrompt } from "../compact/formatCompactsForPrompt.js";
import type { MessageCompact } from "../compact/types.js";

function makeCompact(overrides: Partial<MessageCompact> = {}): MessageCompact {
  return {
    messageId: "msg_test",
    speakerId: "analyst",
    phase: "opening",
    summary: "Pro-migration stance",
    keyClaims: ["Microservices improve scalability"],
    risks: ["Increased complexity"],
    agreements: [],
    disagreements: [],
    openQuestions: [],
    ...overrides,
  };
}

describe("buildRoundCompact", () => {
  it("aggregates disagreements from all messages", () => {
    const compacts = [
      makeCompact({ disagreements: [{ with: "skeptic", point: "Cost too high" }] }),
      makeCompact({ disagreements: [{ with: "analyst", point: "Wrong assumption" }] }),
    ];

    const result = buildRoundCompact({
      roundId: "r1",
      userQuestion: "Q?",
      selectedPersonas: ["analyst", "skeptic"],
      messageCompacts: compacts,
    });

    expect(result.disagreements).toHaveLength(2);
    expect(result.disagreements[0].point).toBe("Cost too high");
    expect(result.disagreements[1].point).toBe("Wrong assumption");
  });

  it("aggregates open questions from all messages", () => {
    const compacts = [
      makeCompact({ openQuestions: ["Q1?", "Q2?"] }),
      makeCompact({ openQuestions: ["Q3?"] }),
    ];

    const result = buildRoundCompact({
      roundId: "r1",
      userQuestion: "Q?",
      selectedPersonas: ["a", "b"],
      messageCompacts: compacts,
    });

    expect(result.openQuestions).toEqual(["Q1?", "Q2?", "Q3?"]);
  });

  it("preserves messageCompacts", () => {
    const compacts = [makeCompact(), makeCompact({ speakerId: "skeptic" })];

    const result = buildRoundCompact({
      roundId: "r1",
      userQuestion: "Q?",
      selectedPersonas: ["analyst", "skeptic"],
      messageCompacts: compacts,
    });

    expect(result.messageCompacts).toHaveLength(2);
    expect(result.messageCompacts).toBe(compacts);
  });

  it("extracts memoryCandidates", () => {
    const compacts = [
      makeCompact({ memoryCandidate: "Key decision about migration" }),
      makeCompact({ memoryCandidate: null }),
      makeCompact({ memoryCandidate: "Cost analysis result" }),
    ];

    const result = buildRoundCompact({
      roundId: "r1",
      userQuestion: "Q?",
      selectedPersonas: ["a"],
      messageCompacts: compacts,
    });

    expect(result.memoryCandidates).toEqual([
      "Key decision about migration",
      "Cost analysis result",
    ]);
  });

  it("docWriteCandidates is empty in MVP", () => {
    const result = buildRoundCompact({
      roundId: "r1",
      userQuestion: "Q?",
      selectedPersonas: ["a"],
      messageCompacts: [],
    });

    expect(result.docWriteCandidates).toEqual([]);
  });

  it("consensus is empty in MVP", () => {
    const result = buildRoundCompact({
      roundId: "r1",
      userQuestion: "Q?",
      selectedPersonas: ["a"],
      messageCompacts: [],
    });

    expect(result.consensus).toEqual([]);
  });

  it("preserves metadata fields", () => {
    const result = buildRoundCompact({
      roundId: "r_123",
      userQuestion: "Should we migrate?",
      moderatorFraming: "Focus on cost.",
      selectedPersonas: ["a", "b"],
      messageCompacts: [],
    });

    expect(result.roundId).toBe("r_123");
    expect(result.userQuestion).toBe("Should we migrate?");
    expect(result.moderatorFraming).toBe("Focus on cost.");
    expect(result.selectedPersonas).toEqual(["a", "b"]);
  });
});

describe("formatCompactsForPrompt", () => {
  it("returns empty string for no compacts", () => {
    expect(formatCompactsForPrompt([])).toBe("");
  });

  it("includes speaker attribution", () => {
    const compacts = [makeCompact({ speakerId: "architect" })];
    const result = formatCompactsForPrompt(compacts);

    expect(result).toContain("### architect");
  });

  it("includes summary as stance", () => {
    const compacts = [makeCompact({ summary: "Pro-migration stance" })];
    const result = formatCompactsForPrompt(compacts);

    expect(result).toContain("Stance: Pro-migration stance");
  });

  it("includes key claims", () => {
    const compacts = [makeCompact({ keyClaims: ["Claim A", "Claim B"] })];
    const result = formatCompactsForPrompt(compacts);

    expect(result).toContain("Key claims:");
    expect(result).toContain("- Claim A");
    expect(result).toContain("- Claim B");
  });

  it("includes risks", () => {
    const compacts = [makeCompact({ risks: ["Risk 1", "Risk 2"] })];
    const result = formatCompactsForPrompt(compacts);

    expect(result).toContain("Risks:");
    expect(result).toContain("- Risk 1");
  });

  it("includes disagreements with attribution", () => {
    const compacts = [makeCompact({
      disagreements: [{ with: "skeptic", point: "Wrong about cost" }],
    })];
    const result = formatCompactsForPrompt(compacts);

    expect(result).toContain("Disagreements:");
    expect(result).toContain("- with skeptic: Wrong about cost");
  });

  it("includes agreements with attribution", () => {
    const compacts = [makeCompact({
      agreements: [{ with: "engineer", point: "Monitoring is critical" }],
    })];
    const result = formatCompactsForPrompt(compacts);

    expect(result).toContain("Agreements:");
    expect(result).toContain("- with engineer: Monitoring is critical");
  });

  it("includes open questions", () => {
    const compacts = [makeCompact({ openQuestions: ["How to handle data?"] })];
    const result = formatCompactsForPrompt(compacts);

    expect(result).toContain("Open questions:");
    expect(result).toContain("- How to handle data?");
  });

  it("includes memory candidate when present", () => {
    const compacts = [makeCompact({ memoryCandidate: "Key insight" })];
    const result = formatCompactsForPrompt(compacts);

    expect(result).toContain("Memory candidate: Key insight");
  });

  it("omits empty sections", () => {
    const compacts = [makeCompact({
      summary: "Stance",
      keyClaims: [],
      risks: [],
      agreements: [],
      disagreements: [],
      openQuestions: [],
      memoryCandidate: null,
    })];
    const result = formatCompactsForPrompt(compacts);

    expect(result).toContain("Stance: Stance");
    expect(result).not.toContain("Key claims:");
    expect(result).not.toContain("Risks:");
    expect(result).not.toContain("Agreements:");
    expect(result).not.toContain("Disagreements:");
    expect(result).not.toContain("Open questions:");
    expect(result).not.toContain("Memory candidate:");
  });

  it("renders multiple speakers", () => {
    const compacts = [
      makeCompact({ speakerId: "architect", summary: "Pro" }),
      makeCompact({ speakerId: "skeptic", summary: "Con" }),
    ];
    const result = formatCompactsForPrompt(compacts);

    expect(result).toContain("### architect");
    expect(result).toContain("### skeptic");
    expect(result).toContain("Stance: Pro");
    expect(result).toContain("Stance: Con");
  });
});
