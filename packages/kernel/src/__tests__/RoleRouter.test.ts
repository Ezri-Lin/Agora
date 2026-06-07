import { describe, it, expect } from "vitest";
import { scoreRole, routeRoles, autoInviteLenses } from "../routing/RoleRouter.js";
import type { RoleCard } from "@agora/shared";

function makeRole(overrides: Partial<RoleCard> = {}): RoleCard {
  return {
    id: "test_role",
    name: "Test Role",
    nameCN: "测试角色",
    subtitle: "A test role",
    type: "strategist",
    systemPrompt: "You are a test role.",
    tags: ["test"],
    ...overrides,
  };
}

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

describe("routeRoles", () => {
  const roles: RoleCard[] = [
    makeRole({ id: "critic", type: "critic", tags: ["debate"] }),
    makeRole({ id: "historian", type: "historian", tags: ["history"] }),
    makeRole({ id: "strategist", type: "strategist", tags: ["product"] }),
    makeRole({ id: "architect", type: "architect", tags: ["systems"] }),
  ];

  it("always includes at least one critic", () => {
    const selected = routeRoles(roles, "product design", 3);
    expect(selected.some((r) => r.type === "critic")).toBe(true);
  });

  it("returns requested count", () => {
    const selected = routeRoles(roles, "product design", 2);
    expect(selected.length).toBe(2);
  });

  it("does not exceed available roles", () => {
    const selected = routeRoles(roles, "test", 10);
    expect(selected.length).toBeLessThanOrEqual(roles.length);
  });
});

describe("autoInviteLenses", () => {
  it("adds lens with >= 2 tag matches", () => {
    const selected = [makeRole({ id: "critic", type: "critic" })];
    const lens = makeRole({
      id: "jobs_lens",
      type: "lens",
      tags: ["product", "design", "simplicity"],
    });
    const allRoles = [...selected, lens];

    const result = autoInviteLenses(selected, allRoles, "product design simplicity");
    expect(result.some((r) => r.id === "jobs_lens")).toBe(true);
  });

  it("does not add lens with < 2 tag matches", () => {
    const selected = [makeRole({ id: "critic", type: "critic" })];
    const lens = makeRole({
      id: "jobs_lens",
      type: "lens",
      tags: ["product", "design", "simplicity"],
    });
    const allRoles = [...selected, lens];

    const result = autoInviteLenses(selected, allRoles, "cooking recipes");
    expect(result.some((r) => r.id === "jobs_lens")).toBe(false);
  });

  it("does not duplicate already selected lenses", () => {
    const lens = makeRole({
      id: "jobs_lens",
      type: "lens",
      tags: ["product", "design"],
    });
    const selected = [lens];
    const allRoles = [lens];

    const result = autoInviteLenses(selected, allRoles, "product design");
    const count = result.filter((r) => r.id === "jobs_lens").length;
    expect(count).toBe(1);
  });
});
