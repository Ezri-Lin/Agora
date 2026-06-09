import { describe, it, expect } from "vitest";
import {
  PERSONA_CONTRACTS,
  getPersonaContract,
  hasPersonaContract,
  resolveRoleDomain,
} from "../personaContractRegistry.js";
import type { PersonaContract } from "../personaContractTypes.js";

const SEED_IDS = [
  "moderator",
  "systems_architect",
  "product_strategist",
  "ux_research_lens",
  "skeptic_critic",
  "implementation_reviewer",
];

describe("persona contracts", () => {
  it("registers all 6 seed personas", () => {
    expect(PERSONA_CONTRACTS.length).toBe(6);
    for (const id of SEED_IDS) {
      expect(hasPersonaContract(id)).toBe(true);
    }
  });

  it("all seed personas have required fields", () => {
    for (const contract of PERSONA_CONTRACTS) {
      expect(contract.id).toBeTruthy();
      expect(contract.name).toBeTruthy();
      expect(contract.domainId).toBeTruthy();
      expect(contract.familyId).toBeTruthy();
      expect(contract.mission).toBeTruthy();

      // responsibilities
      expect(contract.responsibilities.must.length).toBeGreaterThan(0);
      expect(contract.responsibilities.should.length).toBeGreaterThan(0);
      expect(contract.responsibilities.mustNot.length).toBeGreaterThan(0);

      // decisionRights
      expect(contract.decisionRights.may.length).toBeGreaterThan(0);
      expect(contract.decisionRights.mustNot.length).toBeGreaterThan(0);

      // analysisFrameworks
      expect(contract.analysisFrameworks.length).toBeGreaterThan(0);

      // evidencePolicy
      expect(contract.evidencePolicy.groundingRules.length).toBeGreaterThan(0);
      expect(contract.evidencePolicy.uncertaintyRules.length).toBeGreaterThan(0);

      // collaborationRules
      expect(contract.collaborationRules.length).toBeGreaterThan(0);

      // voice
      expect(contract.voice.tone).toBeTruthy();
      expect(contract.voice.styleRules.length).toBeGreaterThan(0);

      // outputSchema
      expect(["markdown", "json", "hybrid"]).toContain(contract.outputSchema.format);
      expect(contract.outputSchema.template).toBeTruthy();

      // boundaries
      expect(contract.boundaries.length).toBeGreaterThan(0);
    }
  });

  it("all seed personas have compact schema", () => {
    for (const contract of PERSONA_CONTRACTS) {
      expect(contract.compactSchema.format).toBe("json");
      expect(contract.compactSchema.fields.length).toBeGreaterThan(0);

      // All compact fields have key, description, required
      for (const field of contract.compactSchema.fields) {
        expect(field.key).toBeTruthy();
        expect(field.description).toBeTruthy();
        expect(typeof field.required).toBe("boolean");
      }
    }
  });

  it("all seed personas have routing metadata", () => {
    for (const contract of PERSONA_CONTRACTS) {
      expect(contract.routing.aliases.length).toBeGreaterThan(0);
      expect(contract.routing.tags.length).toBeGreaterThan(0);
      expect(contract.routing.triggerSituations.length).toBeGreaterThan(0);
    }
  });

  it("getPersonaContract returns a contract by id", () => {
    const mod = getPersonaContract("moderator");
    expect(mod).toBeDefined();
    expect(mod!.name).toBe("Council Moderator");
    expect(mod!.domainId).toBe("core");
  });

  it("getPersonaContract returns undefined for unknown id", () => {
    expect(getPersonaContract("nonexistent")).toBeUndefined();
  });

  it("hasPersonaContract returns true for seed personas", () => {
    for (const id of SEED_IDS) {
      expect(hasPersonaContract(id)).toBe(true);
    }
  });

  it("hasPersonaContract returns false for unknown id", () => {
    expect(hasPersonaContract("nonexistent")).toBe(false);
  });

  it("resolveRoleDomain prefers contract domain", () => {
    const domain = resolveRoleDomain("moderator", { moderator: "wrong_domain" });
    expect(domain).toBe("core");
  });

  it("resolveRoleDomain falls back to map when no contract", () => {
    const domain = resolveRoleDomain("unknown_role", { unknown_role: "fallback_domain" });
    expect(domain).toBe("fallback_domain");
  });

  it("resolveRoleDomain returns undefined when no contract and no fallback", () => {
    const domain = resolveRoleDomain("unknown_role");
    expect(domain).toBeUndefined();
  });

  it("no duplicate ids in PERSONA_CONTRACTS", () => {
    const ids = PERSONA_CONTRACTS.map((c) => c.id);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });
});
