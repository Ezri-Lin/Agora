import { describe, it, expect } from "vitest";
import { parseTailCompact } from "../compact/parseTailCompact.js";
import { stripTailCompact } from "../compact/stripTailCompact.js";
import { buildRoundCompact } from "../compact/buildRoundCompact.js";
import type { MessageCompact } from "../compact/types.js";

const MSG_ID = "msg_1";
const SPEAKER = "analyst";
const PHASE = "opening" as const;

describe("parseTailCompact", () => {
  it("parses XML compact block", () => {
    const content = `Here is my analysis.

<compact>
{
  "stance": "pro-migration",
  "keyClaims": ["Microservices improve scalability"],
  "risks": ["Increased operational complexity"],
  "agreements": [{ "with": "architect", "point": "Need monitoring" }],
  "disagreements": [{ "with": "skeptic", "point": "Cost is manageable" }],
  "openQuestions": ["What about team size?"],
  "memoryCandidate": null
}
</compact>`;

    const result = parseTailCompact({ content, messageId: MSG_ID, speakerId: SPEAKER, phase: PHASE });

    expect(result.compact).not.toBeNull();
    expect(result.compact!.summary).toBe("pro-migration");
    expect(result.compact!.summary).toBe("pro-migration");
    expect(result.compact!.keyClaims).toEqual(["Microservices improve scalability"]);
    expect(result.compact!.risks).toEqual(["Increased operational complexity"]);
    expect(result.compact!.agreements).toHaveLength(1);
    expect(result.compact!.agreements[0].with).toBe("architect");
    expect(result.compact!.disagreements).toHaveLength(1);
    expect(result.compact!.disagreements[0].with).toBe("skeptic");
    expect(result.compact!.openQuestions).toEqual(["What about team size?"]);
    expect(result.compact!.memoryCandidate).toBeNull();
    expect(result.visibleContent).toContain("Here is my analysis.");
    expect(result.visibleContent).not.toContain("<compact>");
  });

  it("strips compact from visible content", () => {
    const content = `My opening statement.

<compact>
{ "keyClaims": ["claim1"] }
</compact>`;

    const result = parseTailCompact({ content, messageId: MSG_ID, speakerId: SPEAKER, phase: PHASE });

    expect(result.visibleContent).toBe("My opening statement.");
    expect(result.visibleContent).not.toContain("<compact>");
  });

  it("parses fallback bare JSON with compact key", () => {
    const content = `Analysis complete.

{ "compact": { "stance": "neutral", "keyClaims": ["A", "B"] } }`;

    const result = parseTailCompact({ content, messageId: MSG_ID, speakerId: SPEAKER, phase: PHASE });

    expect(result.compact).not.toBeNull();
    expect(result.compact!.summary).toBe("neutral");
    expect(result.compact!.keyClaims).toEqual(["A", "B"]);
    expect(result.visibleContent).toBe("Analysis complete.");
  });

  it("normalizes missing arrays to empty arrays", () => {
    const content = `<compact>
{ "stance": "x" }
</compact>`;

    const result = parseTailCompact({ content, messageId: MSG_ID, speakerId: SPEAKER, phase: PHASE });

    expect(result.compact).not.toBeNull();
    expect(result.compact!.keyClaims).toEqual([]);
    expect(result.compact!.risks).toEqual([]);
    expect(result.compact!.agreements).toEqual([]);
    expect(result.compact!.disagreements).toEqual([]);
    expect(result.compact!.openQuestions).toEqual([]);
    expect(result.compact!.memoryCandidate).toBeNull();
  });

  it("does not throw on malformed JSON", () => {
    const content = `My response.

<compact>
{ this is not valid json
</compact>`;

    const result = parseTailCompact({ content, messageId: MSG_ID, speakerId: SPEAKER, phase: PHASE });

    expect(result.compact).toBeNull();
    expect(result.parseError).toBeUndefined(); // XML parse silently fails
    expect(result.visibleContent).toBe(content); // returns full content
  });

  it("returns original content when no compact found", () => {
    const content = "Just a plain response without any compact block.";

    const result = parseTailCompact({ content, messageId: MSG_ID, speakerId: SPEAKER, phase: PHASE });

    expect(result.compact).toBeNull();
    expect(result.visibleContent).toBe(content);
  });

  it("uses last compact block when multiple exist", () => {
    const content = `First thought.

<compact>
{ "stance": "first" }
</compact>

More text.

<compact>
{ "stance": "second", "keyClaims": ["final claim"] }
</compact>`;

    const result = parseTailCompact({ content, messageId: MSG_ID, speakerId: SPEAKER, phase: PHASE });

    expect(result.compact).not.toBeNull();
    expect(result.compact!.summary).toBe("second");
    expect(result.compact!.keyClaims).toEqual(["final claim"]);
  });

  it("normalizes string keyClaims to array", () => {
    const content = `<compact>
{ "keyClaims": "single claim as string" }
</compact>`;

    const result = parseTailCompact({ content, messageId: MSG_ID, speakerId: SPEAKER, phase: PHASE });

    expect(result.compact!.keyClaims).toEqual(["single claim as string"]);
  });

  it("preserves memoryCandidate null", () => {
    const content = `<compact>
{ "keyClaims": ["x"], "memoryCandidate": null }
</compact>`;

    const result = parseTailCompact({ content, messageId: MSG_ID, speakerId: SPEAKER, phase: PHASE });

    expect(result.compact!.memoryCandidate).toBeNull();
  });

  it("preserves memoryCandidate string value", () => {
    const content = `<compact>
{ "keyClaims": ["x"], "memoryCandidate": "Key decision about migration" }
</compact>`;

    const result = parseTailCompact({ content, messageId: MSG_ID, speakerId: SPEAKER, phase: PHASE });

    expect(result.compact!.memoryCandidate).toBe("Key decision about migration");
  });

  it("sets metadata fields correctly", () => {
    const content = `<compact>{ "stance": "x" }</compact>`;

    const result = parseTailCompact({
      content,
      messageId: "msg_42",
      speakerId: "engineer",
      phase: "cross_exam",
    });

    expect(result.compact!.messageId).toBe("msg_42");
    expect(result.compact!.speakerId).toBe("engineer");
    expect(result.compact!.phase).toBe("cross_exam");
  });

  it("normalizes interaction arrays with alternative field names", () => {
    const content = `<compact>
{
  "agreements": [{ "persona": "dev", "claim": "Good point" }],
  "disagreements": [{ "id": "pm", "text": "Wrong" }]
}
</compact>`;

    const result = parseTailCompact({ content, messageId: MSG_ID, speakerId: SPEAKER, phase: PHASE });

    expect(result.compact!.agreements[0]).toEqual({ with: "dev", point: "Good point" });
    expect(result.compact!.disagreements[0]).toEqual({ with: "pm", point: "Wrong" });
  });

  it("filters out malformed interaction entries", () => {
    const content = `<compact>
{
  "agreements": [
    { "with": "a", "point": "valid" },
    { "with": "", "point": "" },
    "not an object"
  ]
}
</compact>`;

    const result = parseTailCompact({ content, messageId: MSG_ID, speakerId: SPEAKER, phase: PHASE });

    expect(result.compact!.agreements).toHaveLength(1);
    expect(result.compact!.agreements[0].with).toBe("a");
  });
});

describe("stripTailCompact", () => {
  it("returns visible content without compact block", () => {
    const content = `My analysis here.

<compact>
{ "stance": "pro" }
</compact>`;

    expect(stripTailCompact(content)).toBe("My analysis here.");
  });

  it("returns original content when no compact", () => {
    const content = "No compact here.";
    expect(stripTailCompact(content)).toBe(content);
  });
});

describe("buildRoundCompact", () => {
  it("flattens disagreements from all messages", () => {
    const compacts: MessageCompact[] = [
      makeCompact({ disagreements: [{ with: "b", point: "wrong about X" }] }),
      makeCompact({ disagreements: [{ with: "a", point: "wrong about Y" }] }),
    ];

    const result = buildRoundCompact({
      roundId: "r1",
      userQuestion: "Q?",
      selectedPersonas: ["a", "b"],
      messageCompacts: compacts,
    });

    expect(result.disagreements).toHaveLength(2);
    expect(result.disagreements[0].point).toBe("wrong about X");
    expect(result.disagreements[1].point).toBe("wrong about Y");
  });

  it("flattens open questions from all messages", () => {
    const compacts: MessageCompact[] = [
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

function makeCompact(overrides: Partial<MessageCompact> = {}): MessageCompact {
  return {
    messageId: "msg_test",
    speakerId: "test",
    phase: "opening",
    summary: "",
    keyClaims: [],
    risks: [],
    agreements: [],
    disagreements: [],
    openQuestions: [],
    ...overrides,
  };
}
