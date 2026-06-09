import { describe, it, expect } from "vitest";
import { compilePersonaPrompt } from "../prompt/compilePersonaPrompt.js";
import { renderPersonaContract } from "../prompt/renderPersonaContract.js";
import { getPhaseInstructions } from "../prompt/phaseInstructions.js";
import type { PersonaContract, PersonaCompactField } from "@agora/shared";
import type { CompilePersonaPromptInput, PromptRoomContext } from "../prompt/types.js";

function makeContract(overrides: Partial<PersonaContract> = {}): PersonaContract {
  return {
    id: "test_persona",
    name: "Test Persona",
    nameCN: "测试角色",
    subtitle: "A test persona",
    domainId: "core",
    familyId: "test",
    mission: "Test mission for validation",
    responsibilities: {
      must: ["Must do X"],
      should: ["Should do Y"],
      mustNot: ["Must not do Z"],
    },
    decisionRights: {
      may: ["May decide A"],
      mustNot: ["Must not decide B"],
    },
    analysisFrameworks: ["Framework 1"],
    evidencePolicy: {
      groundingRules: ["Ground claims in evidence"],
      uncertaintyRules: ["State uncertainty explicitly"],
    },
    collaborationRules: ["Collaborate with others"],
    voice: {
      tone: "analytical",
      styleRules: ["Be precise"],
    },
    outputSchema: {
      format: "markdown",
      template: "## Analysis\n...",
    },
    compactSchema: {
      format: "json",
      fields: [
        { key: "insight", description: "Core insight", required: true },
        { key: "risk", description: "Identified risk", required: false },
      ],
    },
    routing: {
      aliases: ["test"],
      tags: ["testing"],
      triggerSituations: ["When testing"],
    },
    boundaries: ["Never fabricate data"],
    ...overrides,
  };
}

const ROOM_CTX: PromptRoomContext = {
  topic: "Should we adopt microservices?",
  userMessage: "Analyze the tradeoffs of migrating to microservices.",
  participants: [
    { id: "test_persona", name: "Test Persona" },
    { id: "other_persona", name: "Other Persona" },
  ],
};

describe("compilePersonaPrompt", () => {
  it("returns system prompt containing identity and mission", () => {
    const result = compilePersonaPrompt({
      personaContract: makeContract(),
      phase: "opening",
      roomContext: ROOM_CTX,
    });

    expect(result.system).toContain("Test Persona");
    expect(result.system).toContain("测试角色");
    expect(result.system).toContain("Test mission for validation");
    expect(result.system).toContain("core");
    expect(result.system).toContain("test");
  });

  it("includes responsibilities in system prompt", () => {
    const result = compilePersonaPrompt({
      personaContract: makeContract(),
      phase: "opening",
      roomContext: ROOM_CTX,
    });

    expect(result.system).toContain("Must do X");
    expect(result.system).toContain("Should do Y");
    expect(result.system).toContain("Must not do Z");
  });

  it("includes collaboration rules in system prompt", () => {
    const result = compilePersonaPrompt({
      personaContract: makeContract(),
      phase: "opening",
      roomContext: ROOM_CTX,
    });

    expect(result.system).toContain("Collaborate with others");
  });

  it("includes opening phase instructions", () => {
    const result = compilePersonaPrompt({
      personaContract: makeContract(),
      phase: "opening",
      roomContext: ROOM_CTX,
    });

    expect(result.system).toContain("Opening Statement");
    expect(result.system).toContain("opening statement");
  });

  it("includes cross-exam phase instructions", () => {
    const result = compilePersonaPrompt({
      personaContract: makeContract(),
      phase: "cross_exam",
      roomContext: ROOM_CTX,
    });

    expect(result.system).toContain("Cross-Examination");
    expect(result.system).toContain("reference at least one other persona");
  });

  it("includes compact schema in system prompt", () => {
    const result = compilePersonaPrompt({
      personaContract: makeContract(),
      phase: "opening",
      roomContext: ROOM_CTX,
    });

    expect(result.system).toContain("compact");
    expect(result.system).toContain("insight");
    expect(result.system).toContain("risk");
    expect(result.system).toContain("Core insight");
  });

  it("returns expectedCompactSchema matching contract fields", () => {
    const contract = makeContract();
    const result = compilePersonaPrompt({
      personaContract: contract,
      phase: "opening",
      roomContext: ROOM_CTX,
    });

    expect(result.expectedCompactSchema).toEqual(contract.compactSchema.fields);
    expect(result.expectedCompactSchema.length).toBe(2);
    expect(result.expectedCompactSchema[0].key).toBe("insight");
    expect(result.expectedCompactSchema[0].required).toBe(true);
  });

  it("returns messages array with system and user roles", () => {
    const result = compilePersonaPrompt({
      personaContract: makeContract(),
      phase: "opening",
      roomContext: ROOM_CTX,
    });

    expect(result.messages.length).toBe(2);
    expect(result.messages[0].role).toBe("system");
    expect(result.messages[1].role).toBe("user");
    expect(result.messages[1].content).toBe(ROOM_CTX.userMessage);
  });

  it("promptText equals system text", () => {
    const result = compilePersonaPrompt({
      personaContract: makeContract(),
      phase: "opening",
      roomContext: ROOM_CTX,
    });

    expect(result.promptText).toBe(result.system);
  });

  it("includes room context topic and user message", () => {
    const result = compilePersonaPrompt({
      personaContract: makeContract(),
      phase: "opening",
      roomContext: ROOM_CTX,
    });

    expect(result.system).toContain("microservices");
    expect(result.system).toContain("tradeoffs");
  });

  it("includes moderator framing when provided", () => {
    const result = compilePersonaPrompt({
      personaContract: makeContract(),
      phase: "opening",
      roomContext: {
        ...ROOM_CTX,
        moderatorFraming: "Focus on cost analysis.",
      },
    });

    expect(result.system).toContain("Focus on cost analysis");
  });

  it("includes existing context when provided", () => {
    const result = compilePersonaPrompt({
      personaContract: makeContract(),
      phase: "opening",
      roomContext: ROOM_CTX,
      existingContext: "Previous round summary: ...",
    });

    expect(result.system).toContain("Previous round summary");
  });

  it("lists participants in phase instructions", () => {
    const result = compilePersonaPrompt({
      personaContract: makeContract(),
      phase: "opening",
      roomContext: ROOM_CTX,
    });

    expect(result.system).toContain("Test Persona");
    expect(result.system).toContain("Other Persona");
  });
});

describe("renderPersonaContract", () => {
  it("renders all major sections", () => {
    const contract = makeContract();
    const rendered = renderPersonaContract(contract);

    expect(rendered).toContain("## Identity");
    expect(rendered).toContain("## Responsibilities");
    expect(rendered).toContain("## Decision Rights");
    expect(rendered).toContain("## Analysis Frameworks");
    expect(rendered).toContain("## Evidence Policy");
    expect(rendered).toContain("## Collaboration Rules");
    expect(rendered).toContain("## Voice");
    expect(rendered).toContain("## Output Schema");
    expect(rendered).toContain("## Compact Schema");
    expect(rendered).toContain("## Boundaries");
  });

  it("renders nameCN when present", () => {
    const rendered = renderPersonaContract(makeContract());
    expect(rendered).toContain("中文名: 测试角色");
  });

  it("omits nameCN section when not present", () => {
    const rendered = renderPersonaContract(makeContract({ nameCN: undefined }));
    expect(rendered).not.toContain("中文名");
  });

  it("renders memory hooks when present", () => {
    const contract = makeContract({
      memoryHooks: [{ trigger: "test trigger", candidateType: "decision_memory" }],
    });
    const rendered = renderPersonaContract(contract);
    expect(rendered).toContain("## Memory Hooks");
    expect(rendered).toContain("test trigger");
    expect(rendered).toContain("decision_memory");
  });
});

describe("getPhaseInstructions", () => {
  const fields: PersonaCompactField[] = [
    { key: "insight", description: "Core insight", required: true },
  ];

  it("opening phase includes opening statement instruction", () => {
    const instructions = getPhaseInstructions("opening", ROOM_CTX, fields);
    expect(instructions).toContain("Opening Statement");
    expect(instructions).toContain("opening statement");
  });

  it("cross-exam phase includes cross-examination instruction", () => {
    const instructions = getPhaseInstructions("cross_exam", ROOM_CTX, fields);
    expect(instructions).toContain("Cross-Examination");
    expect(instructions).toContain("reference at least one other persona");
  });

  it("both phases include compact block format", () => {
    const opening = getPhaseInstructions("opening", ROOM_CTX, fields);
    const crossExam = getPhaseInstructions("cross_exam", ROOM_CTX, fields);

    expect(opening).toContain("```compact");
    expect(crossExam).toContain("```compact");
    expect(opening).toContain("insight");
    expect(crossExam).toContain("insight");
  });

  it("lists participants when provided", () => {
    const instructions = getPhaseInstructions("opening", ROOM_CTX, fields);
    expect(instructions).toContain("Council Participants");
    expect(instructions).toContain("Test Persona");
  });

  it("omits participants section when not provided", () => {
    const ctxNoParticipants = { ...ROOM_CTX, participants: undefined };
    const instructions = getPhaseInstructions("opening", ctxNoParticipants, fields);
    expect(instructions).not.toContain("Council Participants");
  });
});
