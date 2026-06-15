import { describe, it, expect } from "vitest";
import type { RoleCard, RolePersona, RoleRoutingSettings, ExplicitRoleRequest, CandidateRecallResult, AIRoleScore } from "@agora/shared";
import { normalizeRoleRoutingSettings, toRoleRoutingSettings, DEFAULT_ROLE_ROUTING_SETTINGS } from "@agora/shared";
import { recallCandidates, scoreCandidate, buildRetrievalDoc } from "../routing/candidateRecall.js";
import { applyHardCaps } from "../routing/applyRoleCaps.js";
import { parseExplicitRequests } from "../routing/explicitRequests.js";
import { rerankRoles } from "../routing/aiRoleRerank.js";
import { routeRolesLocal, selectRoles } from "../routing/routeRoles.js";
import { roleCardToPersona, roleCardsToPersonas } from "../routing/roleCardToPersona.js";

// ── Test fixtures ──

function makeRoleCard(overrides: Partial<RoleCard> = {}): RoleCard {
  return {
    id: "test_role",
    name: "Test Role",
    nameCN: "测试角色",
    subtitle: "A test role",
    subtitleCN: "测试角色",
    type: "critic",
    systemPrompt: "You are a test role.",
    tags: ["testing", "analysis"],
    ...overrides,
  };
}

function makePersona(overrides: Partial<RolePersona> = {}): RolePersona {
  return {
    id: "test_persona",
    domainId: "core",
    familyId: "critic",
    name: "Test Persona",
    subtitle: "A test persona",
    mission: "Test mission",
    whenToUse: ["testing"],
    capabilities: ["analysis"],
    deliverables: [],
    exampleQueries: [],
    tags: ["testing", "analysis"],
    prompt: "You are a test persona.",
    ...overrides,
  };
}

function makeSettings(overrides: Partial<RoleRoutingSettings> = {}): RoleRoutingSettings {
  return { ...DEFAULT_ROLE_ROUTING_SETTINGS, ...overrides };
}

function makeCandidate(overrides: Partial<CandidateRecallResult> = {}): CandidateRecallResult {
  return {
    personaId: "test_persona",
    metadataScore: 0.8,
    localScore: 0.8,
    matchedSignals: ["retrieval_doc"],
    ...overrides,
  };
}

// ── Settings normalization ──

describe("settings normalization", () => {
  it("clamps maxActiveRolesPerRound to [1, 12]", () => {
    expect(normalizeRoleRoutingSettings({ maxActiveRolesPerRound: 0 }).maxActiveRolesPerRound).toBe(1);
    expect(normalizeRoleRoutingSettings({ maxActiveRolesPerRound: 100 }).maxActiveRolesPerRound).toBe(12);
    expect(normalizeRoleRoutingSettings({ maxActiveRolesPerRound: 5 }).maxActiveRolesPerRound).toBe(5);
  });

  it("clamps maxNewEntrantsPerRound to [0, maxActive]", () => {
    const s = normalizeRoleRoutingSettings({ maxActiveRolesPerRound: 3, maxNewEntrantsPerRound: 10 });
    expect(s.maxNewEntrantsPerRound).toBe(3);
    expect(normalizeRoleRoutingSettings({ maxNewEntrantsPerRound: -1 }).maxNewEntrantsPerRound).toBe(0);
  });

  it("clamps maxPersonasPerRoleFamily to [1, 3]", () => {
    expect(normalizeRoleRoutingSettings({ maxPersonasPerRoleFamily: 0 }).maxPersonasPerRoleFamily).toBe(1);
    expect(normalizeRoleRoutingSettings({ maxPersonasPerRoleFamily: 99 }).maxPersonasPerRoleFamily).toBe(3);
  });

  it("clamps relevanceThreshold to [0, 1]", () => {
    expect(normalizeRoleRoutingSettings({ relevanceThreshold: -0.5 }).relevanceThreshold).toBe(0);
    expect(normalizeRoleRoutingSettings({ relevanceThreshold: 1.5 }).relevanceThreshold).toBe(1);
  });

  it("suggestionThreshold <= relevanceThreshold", () => {
    const s = normalizeRoleRoutingSettings({ relevanceThreshold: 0.4, suggestionThreshold: 0.9 });
    expect(s.suggestionThreshold).toBeLessThanOrEqual(s.relevanceThreshold);
  });

  it("empty arrays preserve defaults (use all)", () => {
    const s = normalizeRoleRoutingSettings({ enabledDomainIds: [], enabledRoleFamilyIds: [] });
    expect(s.enabledDomainIds).toEqual([]);
    expect(s.enabledRoleFamilyIds).toEqual([]);
  });

  it("toRoleRoutingSettings maps maxActiveRolesPerRound from CouncilRoleSettings", () => {
    const s = toRoleRoutingSettings({ roleCount: 4, maxActiveRolesPerRound: 3 } as any);
    expect(s.maxActiveRolesPerRound).toBe(3);
  });
});

// ── Candidate recall boundaries ──

describe("candidate recall boundaries", () => {
  it("disabled domain excludes personas", () => {
    const personas = [
      makePersona({ id: "p1", domainId: "design" }),
      makePersona({ id: "p2", domainId: "core" }),
    ];
    const result = recallCandidates({
      queryText: "test topic",
      enabledDomainIds: ["core"],
      enabledFamilyIds: [],
      personas,
      previousSpeakerIds: new Set(),
      explicitRequests: [],
    });
    expect(result.map((c) => c.personaId)).toEqual(["p2"]);
  });

  it("empty enabledDomainIds uses all domains (not disable all)", () => {
    const personas = [
      makePersona({ id: "p1", domainId: "design" }),
      makePersona({ id: "p2", domainId: "core" }),
    ];
    const result = recallCandidates({
      queryText: "test topic",
      enabledDomainIds: [],
      enabledFamilyIds: [],
      personas,
      previousSpeakerIds: new Set(),
      explicitRequests: [],
    });
    expect(result).toHaveLength(2);
  });

  it("explicit request boost fires for persona target", () => {
    const persona = makePersona({ id: "boosted", tags: ["unrelated"] });
    const input = {
      queryText: "xyz",
      enabledDomainIds: [],
      enabledFamilyIds: [],
      personas: [persona],
      previousSpeakerIds: new Set<string>(),
      explicitRequests: [{ targetType: "persona" as const, targetId: "boosted", confidence: 0.9, rawText: "@boosted" }],
    };
    const result = recallCandidates(input);
    expect(result[0].matchedSignals).toContain("explicit_request");
  });

  it("already-spoken persona gets recency + alreadySpoken penalty", () => {
    const persona = makePersona({ id: "spoke", tags: ["test"] });
    const result = scoreCandidate(persona, "test", {
      queryText: "test",
      enabledDomainIds: [],
      enabledFamilyIds: [],
      personas: [persona],
      previousSpeakerIds: new Set(["spoke"]),
      explicitRequests: [],
    });
    // Should have lower score than a fresh persona with same data
    const freshResult = scoreCandidate(makePersona({ id: "fresh", tags: ["test"] }), "test", {
      queryText: "test",
      enabledDomainIds: [],
      enabledFamilyIds: [],
      personas: [],
      previousSpeakerIds: new Set(),
      explicitRequests: [],
    });
    expect(result.localScore).toBeLessThan(freshResult.localScore);
  });
});

// ── Hard caps ──

describe("hard caps", () => {
  it("enforces round cap", () => {
    const personas = Array.from({ length: 10 }, (_, i) => makePersona({ id: `p${i}`, familyId: `fam${i}` }));
    const candidates = personas.map((p) => makeCandidate({ personaId: p.id, localScore: 0.9 }));
    const decision = applyHardCaps({
      intent: "continue_discussion",
      participationPolicy: "all_selected",
      candidates,
      personas,
      settings: makeSettings({ maxActiveRolesPerRound: 3, relevanceThreshold: 0 }),
      previousSpeakerIds: [],
      existingActiveRoleIds: [],
    });
    expect(decision.activeEntrants).toHaveLength(3);
  });

  it("enforces family cap", () => {
    const personas = [
      makePersona({ id: "p1", familyId: "same_family" }),
      makePersona({ id: "p2", familyId: "same_family" }),
      makePersona({ id: "p3", familyId: "other_family" }),
    ];
    const candidates = personas.map((p) => makeCandidate({ personaId: p.id, localScore: 0.9 }));
    const decision = applyHardCaps({
      intent: "continue_discussion",
      participationPolicy: "all_selected",
      candidates,
      personas,
      settings: makeSettings({ maxPersonasPerRoleFamily: 1, relevanceThreshold: 0 }),
      previousSpeakerIds: [],
      existingActiveRoleIds: [],
    });
    const familyIds = decision.activeEntrants.map((e) => e.familyId);
    const sameFamilyCount = familyIds.filter((f) => f === "same_family").length;
    expect(sameFamilyCount).toBeLessThanOrEqual(1);
  });

  it("enforces new entrant cap", () => {
    const personas = Array.from({ length: 5 }, (_, i) => makePersona({ id: `p${i}`, familyId: `fam${i}` }));
    const candidates = personas.map((p) => makeCandidate({ personaId: p.id, localScore: 0.9 }));
    const decision = applyHardCaps({
      intent: "continue_discussion",
      participationPolicy: "all_selected",
      candidates,
      personas,
      settings: makeSettings({ maxNewEntrantsPerRound: 2, maxActiveRolesPerRound: 10, relevanceThreshold: 0 }),
      previousSpeakerIds: [],
      existingActiveRoleIds: [],
    });
    // All are new entrants (none in existingActiveRoleIds), so max 2
    expect(decision.activeEntrants.length).toBeLessThanOrEqual(2);
  });

  it("new_entrants_only policy blocks already-spoken roles", () => {
    const personas = [
      makePersona({ id: "old" }),
      makePersona({ id: "new" }),
    ];
    const candidates = personas.map((p) => makeCandidate({ personaId: p.id, localScore: 0.9 }));
    const decision = applyHardCaps({
      intent: "introduce_perspective",
      participationPolicy: "new_entrants_only",
      candidates,
      personas,
      settings: makeSettings({ relevanceThreshold: 0 }),
      previousSpeakerIds: ["old"],
      existingActiveRoleIds: ["old"],
    });
    expect(decision.activeEntrants.map((e) => e.roleId)).not.toContain("old");
    expect(decision.activeEntrants.map((e) => e.roleId)).toContain("new");
  });

  it("below threshold goes to suggestedPerspectives if above suggestionThreshold", () => {
    const personas = [makePersona({ id: "low" })];
    const candidates = [makeCandidate({ personaId: "low", localScore: 0.55 })];
    const decision = applyHardCaps({
      intent: "continue_discussion",
      participationPolicy: "all_selected",
      candidates,
      personas,
      settings: makeSettings({ relevanceThreshold: 0.68, suggestionThreshold: 0.50 }),
      previousSpeakerIds: [],
      existingActiveRoleIds: [],
    });
    expect(decision.activeEntrants).toHaveLength(0);
    expect(decision.suggestedPerspectives).toHaveLength(1);
    expect(decision.suggestedPerspectives[0].personaId).toBe("low");
  });
});

// ── AI rerank boundaries ──

describe("ai rerank boundaries", () => {
  const candidates = [
    makeCandidate({ personaId: "p1", localScore: 0.8 }),
    makeCandidate({ personaId: "p2", localScore: 0.6 }),
  ];
  const personas = [
    makePersona({ id: "p1" }),
    makePersona({ id: "p2" }),
  ];

  it("disabled mode returns local fallback scores", async () => {
    const result = await rerankRoles(candidates, personas, { latestUserMessage: "", roomSummary: "", recentTranscriptSummary: "" }, "disabled");
    expect(result).toHaveLength(2);
    expect(result[0].score).toBe(candidates[0].localScore);
  });

  it("no caller returns local fallback scores", async () => {
    const result = await rerankRoles(candidates, personas, { latestUserMessage: "", roomSummary: "", recentTranscriptSummary: "" }, "enabled", undefined);
    expect(result[0].reason).toContain("local");
  });

  it("malformed AI output (unknown personaId) is discarded", async () => {
    const caller = async () => [
      { personaId: "unknown", score: 0.9, shouldEnter: true, suggestedOnly: false, reason: "ai" },
      { personaId: "p1", score: 0.7, shouldEnter: true, suggestedOnly: false, reason: "ai" },
    ];
    const result = await rerankRoles(candidates, personas, { latestUserMessage: "", roomSummary: "", recentTranscriptSummary: "" }, "enabled", caller);
    // "unknown" should be discarded, p1 should have AI score, p2 should fallback
    const p1 = result.find((r) => r.personaId === "p1");
    const p2 = result.find((r) => r.personaId === "p2");
    expect(p1?.score).toBe(0.7);
    expect(p2?.reason).toContain("local fallback");
  });

  it("out-of-range AI score is discarded", async () => {
    const caller = async () => [
      { personaId: "p1", score: 1.5, shouldEnter: true, suggestedOnly: false, reason: "ai" },
    ];
    const result = await rerankRoles(candidates, personas, { latestUserMessage: "", roomSummary: "", recentTranscriptSummary: "" }, "fallback_local", caller);
    // 1.5 is out of range, should fall back entirely
    expect(result[0].reason).toContain("local");
  });

  it("duplicate personaId in AI output — first wins", async () => {
    const caller = async () => [
      { personaId: "p1", score: 0.9, shouldEnter: true, suggestedOnly: false, reason: "first" },
      { personaId: "p1", score: 0.3, shouldEnter: false, suggestedOnly: false, reason: "second" },
    ];
    const result = await rerankRoles(candidates, personas, { latestUserMessage: "", roomSummary: "", recentTranscriptSummary: "" }, "enabled", caller);
    expect(result[0].score).toBe(0.9);
  });

  it("fallback_local with empty AI results falls back to local", async () => {
    const caller = async () => [];
    const result = await rerankRoles(candidates, personas, { latestUserMessage: "", roomSummary: "", recentTranscriptSummary: "" }, "fallback_local", caller);
    expect(result[0].reason).toContain("local");
  });
});

// ── Explicit requests ──

describe("explicit requests", () => {
  it("@UX mention maps to design domain", () => {
    const reqs = parseExplicitRequests("@UX please review this");
    expect(reqs.some((r) => r.targetType === "domain" && r.targetId === "design")).toBe(true);
  });

  it("引入法律视角 maps to legal_compliance domain", () => {
    const reqs = parseExplicitRequests("引入法律视角来分析这个问题");
    expect(reqs.some((r) => r.targetType === "domain" && r.targetId === "legal_compliance")).toBe(true);
  });

  it("generic @mention creates persona-level request", () => {
    const reqs = parseExplicitRequests("@custom_role do something");
    expect(reqs.some((r) => r.targetType === "persona" && r.targetId === "custom_role")).toBe(true);
  });

  it("empty text returns empty array", () => {
    expect(parseExplicitRequests("")).toEqual([]);
  });

  it("chip requests merged with text-parsed requests", () => {
    const personas = [
      makePersona({ id: "chip_target", tags: [] }),
      makePersona({ id: "text_target", domainId: "design", tags: [] }),
    ];
    const decision = routeRolesLocal(
      personas.map((p) => makeRoleCard({ id: p.id, personaId: p.id, domainId: p.domainId, tags: p.tags })),
      "@UX analyze this",
      makeSettings({ relevanceThreshold: 0 }),
      {
        explicitRoleRequests: [{ targetType: "persona", targetId: "chip_target", confidence: 1.0, rawText: "+Chip" }],
      },
    );
    // Both chip_target and text_target (via @UX → design domain) should be boosted
    expect(decision.scores.length).toBeGreaterThan(0);
  });
});

// ── roleCardToPersona adapter ──

describe("roleCardToPersona adapter", () => {
  it("prefers personaId over id", () => {
    const card = makeRoleCard({ id: "card_id", personaId: "persona_id" });
    const persona = roleCardToPersona(card);
    expect(persona.id).toBe("persona_id");
  });

  it("falls back to id when personaId is undefined", () => {
    const card = makeRoleCard({ id: "card_id" });
    const persona = roleCardToPersona(card);
    expect(persona.id).toBe("card_id");
  });

  it("infers domain from tags", () => {
    expect(roleCardToPersona(makeRoleCard({ tags: ["ux", "design"] })).domainId).toBe("design");
    expect(roleCardToPersona(makeRoleCard({ tags: ["security", "threat"] })).domainId).toBe("security");
    expect(roleCardToPersona(makeRoleCard({ tags: ["legal", "compliance"] })).domainId).toBe("legal_compliance");
  });

  it("falls back to type-based domain", () => {
    expect(roleCardToPersona(makeRoleCard({ type: "critic", tags: [] })).domainId).toBe("core");
    expect(roleCardToPersona(makeRoleCard({ type: "strategist", tags: [] })).domainId).toBe("product_strategy");
  });
});

// ── Backward compatibility ──

describe("backward compatibility", () => {
  it("selectRoles returns correct RoleSelectionResult shape", () => {
    const roles = [
      makeRoleCard({ id: "critic", type: "critic", tags: ["test"] }),
      makeRoleCard({ id: "historian", type: "historian", tags: ["test"] }),
    ];
    const result = selectRoles(roles, "test topic", { roleCount: 2, maxActiveRolesPerRound: 5, maxAutoInviteLenses: 0, allowAutoInviteLenses: false, autoInviteLensThreshold: 2 } as any);
    expect(result).toHaveProperty("activeRoles");
    expect(result).toHaveProperty("suggestedRoles");
    expect(Array.isArray(result.activeRoles)).toBe(true);
    expect(Array.isArray(result.suggestedRoles)).toBe(true);
  });

  it("toRoleRoutingSettings maps legacy fields", () => {
    const s = toRoleRoutingSettings({ roleCount: 3, maxActiveRolesPerRound: 4 } as any);
    expect(s.maxActiveRolesPerRound).toBe(4);
    expect(s).toHaveProperty("relevanceThreshold");
    expect(s).toHaveProperty("suggestionThreshold");
  });
});
