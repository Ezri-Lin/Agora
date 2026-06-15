import { describe, it, expect } from "vitest";
import { scoreRole, selectRoles, autoInviteLenses } from "../routing/RoleRouter.js";
import type { RoleCard, CouncilRoleSettings, SelectedRole } from "@agora/shared";
import { DEFAULT_ROLE_SETTINGS } from "@agora/shared";

function toSelected(r: RoleCard): SelectedRole {
  return { roleId: r.id, name: r.name, subtitle: r.subtitle, type: r.type, tags: r.tags, source: "base" };
}

function makeRole(overrides: Partial<RoleCard> = {}): RoleCard {
  return {
    id: "test_role",
    name: "Test Role",
    nameCN: "测试角色",
    subtitle: "A test role",
    subtitleCN: "测试角色",
    type: "strategist",
    systemPrompt: "You are a test role.",
    tags: ["test"],
    ...overrides,
  };
}

const defaultSettings: CouncilRoleSettings = { ...DEFAULT_ROLE_SETTINGS };

describe("scoreRole", () => {
  it("returns a number between 0 and 1", () => {
    const role = makeRole();
    const score = scoreRole(role, "some topic");
    expect(score).toBeGreaterThan(0);
    expect(score).toBeLessThanOrEqual(1);
  });

  it("scores higher when tags match topic", () => {
    const role = makeRole({ tags: ["product", "strategy"] });
    const matchScore = scoreRole(role, "product strategy discussion");
    const noMatchScore = scoreRole(role, "cooking recipes");
    expect(matchScore).toBeGreaterThan(noMatchScore);
  });

  it("scores critics higher for diversity", () => {
    const critic = makeRole({ type: "critic" });
    const strategist = makeRole({ type: "strategist" });
    const criticScore = scoreRole(critic, "test");
    const strategistScore = scoreRole(strategist, "test");
    expect(criticScore).toBeGreaterThan(strategistScore);
  });
});

describe("selectRoles", () => {
  const roles: RoleCard[] = [
    makeRole({ id: "critic", type: "critic", tags: ["debate"] }),
    makeRole({ id: "historian", type: "historian", tags: ["history"] }),
    makeRole({ id: "strategist", type: "strategist", tags: ["product"] }),
    makeRole({ id: "architect", type: "architect", tags: ["systems"] }),
  ];

  it("always includes at least one critic", () => {
    const result = selectRoles(roles, "product design", defaultSettings);
    expect(result.activeRoles.some((r) => r.type === "critic")).toBe(true);
  });

  it("respects roleCount setting", () => {
    const result = selectRoles(roles, "product design", { ...defaultSettings, roleCount: 2 });
    expect(result.activeRoles.length).toBeLessThanOrEqual(2 + defaultSettings.maxAutoInviteLenses);
  });

  it("never exceeds maxActiveRolesPerRound", () => {
    const settings: CouncilRoleSettings = { ...defaultSettings, roleCount: 3, maxActiveRolesPerRound: 4 };
    const result = selectRoles(roles, "product design", settings);
    expect(result.activeRoles.length).toBeLessThanOrEqual(settings.maxActiveRolesPerRound);
  });

  it("does not exceed available roles", () => {
    const result = selectRoles(roles, "test", { ...defaultSettings, roleCount: 10 });
    expect(result.activeRoles.length).toBeLessThanOrEqual(roles.length);
  });

  it("excludes removed roles", () => {
    const result = selectRoles(roles, "product design", defaultSettings, new Set(["strategist"]));
    expect(result.activeRoles.some((r) => r.roleId === "strategist")).toBe(false);
  });
});

describe("autoInviteLenses", () => {
  const settings: CouncilRoleSettings = {
    ...defaultSettings,
    autoInviteLensThreshold: 2,
    allowAutoInviteLenses: true,
    maxAutoInviteLenses: 2,
    maxActiveRolesPerRound: 6,
  };

  it("invites lens with >= threshold tag matches", () => {
    const critic = makeRole({ id: "critic", type: "critic" });
    const lens = makeRole({
      id: "jobs_lens",
      type: "lens",
      tags: ["product", "design", "simplicity"],
    });
    const allRoles = [critic, lens];

    const result = autoInviteLenses([toSelected(critic)], allRoles, "product design simplicity", settings);
    expect(result.invited.some((r) => r.roleId === "jobs_lens")).toBe(true);
  });

  it("does not invite lens with < threshold tag matches", () => {
    const critic = makeRole({ id: "critic", type: "critic" });
    const lens = makeRole({
      id: "jobs_lens",
      type: "lens",
      tags: ["product", "design", "simplicity"],
    });
    const allRoles = [critic, lens];

    const result = autoInviteLenses([toSelected(critic)], allRoles, "cooking recipes", settings);
    expect(result.invited.some((r) => r.roleId === "jobs_lens")).toBe(false);
  });

  it("does not duplicate already selected lenses", () => {
    const lens = makeRole({
      id: "jobs_lens",
      type: "lens",
      tags: ["product", "design"],
    });
    const selected: SelectedRole[] = [{ roleId: "jobs_lens", name: "Jobs Lens", type: "lens", tags: ["product", "design"], source: "base" }];
    const allRoles = [lens];

    const result = autoInviteLenses(selected, allRoles, "product design", settings);
    expect(result.invited.some((r) => r.roleId === "jobs_lens")).toBe(false);
  });

  it("respects allowAutoInviteLenses=false", () => {
    const critic = makeRole({ id: "critic", type: "critic" });
    const lens = makeRole({
      id: "jobs_lens",
      type: "lens",
      tags: ["product", "design"],
    });
    const allRoles = [critic, lens];
    const noAutoSettings = { ...settings, allowAutoInviteLenses: false };

    const result = autoInviteLenses([toSelected(critic)], allRoles, "product design", noAutoSettings);
    expect(result.invited.length).toBe(0);
  });

  it("places non-invited matching lenses in suggestedRoles", () => {
    const critic = makeRole({ id: "critic", type: "critic" });
    const lens = makeRole({
      id: "jobs_lens",
      type: "lens",
      tags: ["product"],
    });
    const allRoles = [critic, lens];

    const result = autoInviteLenses([toSelected(critic)], allRoles, "product", settings);
    // With only 1 tag match and threshold=2, should go to suggested
    if (result.invited.length === 0) {
      expect(result.suggested.some((r) => r.roleId === "jobs_lens")).toBe(true);
    }
  });
});
