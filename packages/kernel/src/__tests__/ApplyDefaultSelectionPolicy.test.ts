import { describe, it, expect } from "vitest";
import { applyDefaultSelectionPolicy } from "../council/applyDefaultSelectionPolicy.js";
import type { RoleCandidate, CouncilDispatchSettings } from "@agora/shared";

function makeCandidate(overrides: Partial<RoleCandidate> & { roleId: string }): RoleCandidate {
  return {
    name: overrides.roleId,
    subtitle: "",
    domainId: "core",
    familyId: overrides.familyId || "default",
    tags: overrides.tags || [],
    score: overrides.score ?? 0.8,
    scoreBreakdown: {
      relevance: 0.8,
      diversity: 0.5,
      conflictValue: 0.3,
      userPreferenceFit: 0.5,
      groundingQuality: 0.7,
    },
    reason: "test",
    source: "router_recommended",
    rank: 0,
    defaultSelected: false,
    ...overrides,
  };
}

const defaultSettings: CouncilDispatchSettings = {
  defaultSelectedRoleLimit: 3,
  candidateDisplayLimit: 10,
  skipConfirm: false,
  requireCriticByDefault: false,
};

describe("applyDefaultSelectionPolicy", () => {
  it("selects top N candidates as default", () => {
    const candidates = [
      makeCandidate({ roleId: "a", score: 0.9 }),
      makeCandidate({ roleId: "b", score: 0.8 }),
      makeCandidate({ roleId: "c", score: 0.7 }),
      makeCandidate({ roleId: "d", score: 0.6 }),
    ];

    const result = applyDefaultSelectionPolicy(candidates, defaultSettings);

    expect(result.defaultSelectedRoleIds).toEqual(["a", "b", "c"]);
    expect(result.recommendedAlternativeRoleIds).toEqual(["d"]);
  });

  it("preserves full rankedCandidates length", () => {
    const candidates = [
      makeCandidate({ roleId: "a", score: 0.9 }),
      makeCandidate({ roleId: "b", score: 0.8 }),
      makeCandidate({ roleId: "c", score: 0.7 }),
      makeCandidate({ roleId: "d", score: 0.6 }),
      makeCandidate({ roleId: "e", score: 0.5 }),
    ];

    const result = applyDefaultSelectionPolicy(candidates, {
      ...defaultSettings,
      defaultSelectedRoleLimit: 2,
    });

    expect(result.rankedCandidates.length).toBe(5);
    expect(result.defaultSelectedRoleIds.length).toBe(2);
    expect(result.recommendedAlternativeRoleIds.length).toBe(3);
  });

  it("finalSelectedRoleIds can exceed defaultSelectedRoleLimit", () => {
    // This function doesn't limit final selection — it only sets defaults
    const candidates = Array.from({ length: 10 }, (_, i) =>
      makeCandidate({ roleId: `r${i}`, score: 1 - i * 0.05 }),
    );

    const result = applyDefaultSelectionPolicy(candidates, {
      ...defaultSettings,
      defaultSelectedRoleLimit: 3,
    });

    // Only 3 default selected
    expect(result.defaultSelectedRoleIds.length).toBe(3);
    // But all 10 are in rankedCandidates (user can pick more)
    expect(result.rankedCandidates.length).toBe(10);
    // And recommended has 7
    expect(result.recommendedAlternativeRoleIds.length).toBe(7);
  });

  it("includes critic by default when requireCriticByDefault=true", () => {
    const candidates = [
      makeCandidate({ roleId: "architect", score: 0.9, familyId: "architecture" }),
      makeCandidate({ roleId: "strategist", score: 0.85, familyId: "product_strategy" }),
      makeCandidate({
        roleId: "critic",
        score: 0.7,
        familyId: "critic",
        tags: ["criticism", "skepticism"],
      }),
      makeCandidate({ roleId: "researcher", score: 0.65, familyId: "ux_research" }),
    ];

    const result = applyDefaultSelectionPolicy(candidates, {
      ...defaultSettings,
      defaultSelectedRoleLimit: 3,
      requireCriticByDefault: true,
    });

    expect(result.defaultSelectedRoleIds).toContain("critic");
  });

  it("avoids near-duplicate roles from same family", () => {
    const candidates = [
      makeCandidate({ roleId: "architect1", score: 0.9, familyId: "architecture" }),
      makeCandidate({ roleId: "architect2", score: 0.88, familyId: "architecture" }),
      makeCandidate({ roleId: "strategist", score: 0.85, familyId: "product_strategy" }),
      makeCandidate({ roleId: "researcher", score: 0.8, familyId: "ux_research" }),
    ];

    const result = applyDefaultSelectionPolicy(candidates, {
      ...defaultSettings,
      defaultSelectedRoleLimit: 3,
    });

    // Should prefer diversity: only one from architecture family
    const selectedFamilies = result.defaultSelectedRoleIds.map(
      (id) => candidates.find((c) => c.roleId === id)?.familyId,
    );
    const familyCounts = new Map<string, number>();
    for (const f of selectedFamilies) {
      if (f) familyCounts.set(f, (familyCounts.get(f) || 0) + 1);
    }
    // architecture family should have at most 1 if alternatives exist
    expect((familyCounts.get("architecture") || 0)).toBeLessThanOrEqual(1);
  });

  it("handles empty candidates", () => {
    const result = applyDefaultSelectionPolicy([], defaultSettings);
    expect(result.defaultSelectedRoleIds).toEqual([]);
    expect(result.recommendedAlternativeRoleIds).toEqual([]);
    expect(result.rankedCandidates).toEqual([]);
  });

  it("handles fewer candidates than limit", () => {
    const candidates = [
      makeCandidate({ roleId: "a", score: 0.9 }),
      makeCandidate({ roleId: "b", score: 0.8 }),
    ];

    const result = applyDefaultSelectionPolicy(candidates, {
      ...defaultSettings,
      defaultSelectedRoleLimit: 5,
    });

    expect(result.defaultSelectedRoleIds).toEqual(["a", "b"]);
    expect(result.recommendedAlternativeRoleIds).toEqual([]);
  });
});
