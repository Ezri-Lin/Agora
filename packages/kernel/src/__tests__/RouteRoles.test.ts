import { describe, it, expect } from "vitest";
import { routeRolesLocal, selectRoles } from "../routing/routeRoles.js";
import type { RoleCard, RoleRoutingSettings } from "@agora/shared";
import { DEFAULT_ROLE_ROUTING_SETTINGS, normalizeRoleRoutingSettings } from "@agora/shared";

// Rich test roles with full data for scoring
const ROLES: RoleCard[] = [
  { id: "moderator", name: "Moderator", nameCN: "主持人", subtitle: "Facilitates discussion", subtitleCN: "主持讨论", type: "moderator", systemPrompt: "You are the moderator.", tags: ["facilitation"] },
  { id: "critic", name: "Critic", nameCN: "批评者", subtitle: "Challenges assumptions", subtitleCN: "质疑假设", type: "critic", systemPrompt: "You challenge assumptions and find weaknesses.", tags: ["criticism", "risk", "assumption"] },
  { id: "architect", name: "Architect", nameCN: "架构师", subtitle: "System design and scalability", subtitleCN: "系统设计与可扩展性", type: "architect", systemPrompt: "You design scalable systems and evaluate architecture trade-offs.", tags: ["architecture", "system_design", "scalability", "infrastructure"] },
  { id: "ux", name: "UX Research", nameCN: "UX研究", subtitle: "Usability and user research", subtitleCN: "可用性与用户研究", type: "lens", systemPrompt: "You evaluate usability, cognitive load, and user comprehension.", tags: ["ux", "usability", "design", "user_research", "friction"] },
  { id: "legal", name: "Legal", nameCN: "法律", subtitle: "Legal risk and compliance", subtitleCN: "法律风险与合规", type: "lens", systemPrompt: "You identify legal risks, compliance requirements, and contractual obligations.", tags: ["legal", "compliance", "contract", "privacy", "risk"] },
  { id: "strategist", name: "Strategist", nameCN: "策略师", subtitle: "Product strategy and market", subtitleCN: "产品策略与市场", type: "strategist", systemPrompt: "You evaluate product decisions through market analysis and strategic positioning.", tags: ["product", "strategy", "market", "prioritization"] },
  { id: "security", name: "Security", nameCN: "安全", subtitle: "Threat modeling", subtitleCN: "威胁建模", type: "lens", systemPrompt: "You identify security threats, vulnerabilities, and recommend protective measures.", tags: ["security", "threat", "vulnerability", "attack"] },
  { id: "growth", name: "Growth", nameCN: "增长", subtitle: "Growth marketing", subtitleCN: "增长营销", type: "lens", systemPrompt: "You apply growth frameworks for acquisition, activation, and retention.", tags: ["growth", "marketing", "acquisition", "retention", "funnel"] },
];

// Use lower threshold for local-only testing
const TEST_SETTINGS: RoleRoutingSettings = {
  ...DEFAULT_ROLE_ROUTING_SETTINGS,
  relevanceThreshold: 0.15,
  suggestionThreshold: 0.08,
};

describe("routeRolesLocal", () => {
  it("caps active entrants at maxActiveRolesPerRound", () => {
    const d = routeRolesLocal(ROLES, "优化产品体验", TEST_SETTINGS);
    expect(d.activeEntrants.length).toBeLessThanOrEqual(TEST_SETTINGS.maxActiveRolesPerRound);
  });

  it("returns new_entrants_only for explicit perspective request", () => {
    const d = routeRolesLocal(ROLES, "引入法律视角看看", TEST_SETTINGS, {
      previousSpeakerIds: ["critic", "strategist", "architect"],
      existingActiveRoleIds: ROLES.map(r => r.id),
    });
    expect(d.participationPolicy).toBe("new_entrants_only");
    expect(d.intent).toBe("introduce_perspective");
    expect(d.activeEntrants.some(r => r.domainId === "legal_compliance")).toBe(true);
  });

  it("matches @UX mention", () => {
    const d = routeRolesLocal(ROLES, "@UX 看看这个交互", TEST_SETTINGS, {
      previousSpeakerIds: ["critic", "strategist"],
      existingActiveRoleIds: ROLES.map(r => r.id),
    });
    expect(d.participationPolicy).toBe("new_entrants_only");
    expect(d.activeEntrants.some(r => r.domainId === "design")).toBe(true);
  });

  it("respects family cap", () => {
    const settings = normalizeRoleRoutingSettings({ maxPersonasPerRoleFamily: 1, relevanceThreshold: 0.15, suggestionThreshold: 0.08 });
    const d = routeRolesLocal(ROLES, "ux usability design user_research friction", settings);
    const familyCounts = new Map<string, number>();
    for (const r of d.activeEntrants) {
      familyCounts.set(r.familyId!, (familyCounts.get(r.familyId!) ?? 0) + 1);
    }
    for (const count of familyCounts.values()) {
      expect(count).toBeLessThanOrEqual(1);
    }
  });

  it("penalizes already-spoken roles", () => {
    const d = routeRolesLocal(ROLES, "product strategy market analysis", TEST_SETTINGS, {
      previousSpeakerIds: ["strategist"],
      existingActiveRoleIds: ROLES.map(r => r.id),
    });
    const score = d.scores.find(s => s.personaId === "strategist");
    expect(score).toBeDefined();
    // Already spoken should have lower score than if not spoken
    const d2 = routeRolesLocal(ROLES, "product strategy market analysis", TEST_SETTINGS, {
      previousSpeakerIds: [],
      existingActiveRoleIds: ROLES.map(r => r.id),
    });
    const score2 = d2.scores.find(s => s.personaId === "strategist");
    expect(score!.finalScore).toBeLessThan(score2!.finalScore);
  });
});

describe("selectRoles (backward compat)", () => {
  it("returns RoleSelectionResult shape with correct structure", () => {
    const result = selectRoles(ROLES, "architecture scalability system design", {
      roleCount: 3, maxActiveRolesPerRound: 6, maxAutoInviteLenses: 2,
      autoInviteLensThreshold: 3, allowAutoInviteLenses: true, allowInviteDuringRunning: false,
    });
    // Verify shape is preserved (count depends on scoring vs threshold)
    expect(result).toHaveProperty("activeRoles");
    expect(result).toHaveProperty("suggestedRoles");
    expect(Array.isArray(result.activeRoles)).toBe(true);
    expect(Array.isArray(result.suggestedRoles)).toBe(true);
    if (result.activeRoles.length > 0) {
      expect(result.activeRoles[0]).toHaveProperty("roleId");
      expect(result.activeRoles[0]).toHaveProperty("name");
      expect(result.activeRoles[0]).toHaveProperty("source");
    }
  });
});
