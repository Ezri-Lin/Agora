import { describe, it, expect } from "vitest";
import { searchRoles } from "./searchRoles.js";
import type { RoleViewModel } from "./CouncilDispatchGate.js";

const ROLES: RoleViewModel[] = [
  {
    id: "moderator",
    name: "Moderator",
    subtitle: "Facilitates discussion",
    domainId: "core",
    domainLabel: "核心",
    tags: ["facilitation", "moderation"],
  },
  {
    id: "ux_research",
    name: "UX Research Lens",
    subtitle: "Usability and user behavior",
    domainId: "design",
    domainLabel: "设计",
    familyId: "ux_research",
    familyLabel: "UX Research",
    tags: ["ux", "usability"],
    aliases: ["用户体验研究"],
  },
  {
    id: "product_strategist",
    name: "Product Strategist",
    subtitle: "Product direction and taste",
    domainId: "product_strategy",
    domainLabel: "产品",
    tags: ["product", "strategy"],
    reason: "Product relevance: 0.85",
  },
  {
    id: "security_lens",
    name: "Security Lens",
    subtitle: "Threat modeling",
    domainId: "security",
    domainLabel: "安全",
    tags: ["security", "threat"],
  },
];

describe("searchRoles", () => {
  it("empty query returns all roles", () => {
    expect(searchRoles(ROLES, "")).toEqual(ROLES);
    expect(searchRoles(ROLES, "   ")).toEqual(ROLES);
  });

  it("matches name", () => {
    const result = searchRoles(ROLES, "moderator");
    expect(result.map((r) => r.id)).toEqual(["moderator"]);
  });

  it("matches subtitle", () => {
    const result = searchRoles(ROLES, "usability");
    expect(result.map((r) => r.id)).toEqual(["ux_research"]);
  });

  it("matches domainLabel", () => {
    const result = searchRoles(ROLES, "设计");
    expect(result.map((r) => r.id)).toEqual(["ux_research"]);
  });

  it("matches domainId", () => {
    const result = searchRoles(ROLES, "security");
    expect(result.map((r) => r.id)).toEqual(["security_lens"]);
  });

  it("matches tags", () => {
    const result = searchRoles(ROLES, "facilitation");
    expect(result.map((r) => r.id)).toEqual(["moderator"]);
  });

  it("matches aliases", () => {
    const result = searchRoles(ROLES, "用户体验");
    expect(result.map((r) => r.id)).toEqual(["ux_research"]);
  });

  it("matches reason", () => {
    const result = searchRoles(ROLES, "relevance");
    expect(result.map((r) => r.id)).toEqual(["product_strategist"]);
  });

  it("matches familyLabel", () => {
    const result = searchRoles(ROLES, "ux research");
    expect(result.map((r) => r.id)).toEqual(["ux_research"]);
  });

  it("no match returns empty", () => {
    expect(searchRoles(ROLES, "nonexistent")).toEqual([]);
  });

  it("case insensitive", () => {
    const result = searchRoles(ROLES, "MODERATOR");
    expect(result.map((r) => r.id)).toEqual(["moderator"]);
  });

  it("multi-word OR: matches any word", () => {
    const result = searchRoles(ROLES, "security ux");
    expect(result.map((r) => r.id)).toEqual(["ux_research", "security_lens"]);
  });

  it("preserves original order", () => {
    const result = searchRoles(ROLES, "product");
    expect(result.map((r) => r.id)).toEqual(["product_strategist"]);
  });
});
