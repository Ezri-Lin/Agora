import { describe, expect, it } from "vitest";
import { OBSIDIAN_PROFILE } from "./layoutProfile.js";
import {
  computeObsidianCollisionRadius,
  computeObsidianLinkStrength,
  computeObsidianManyBodyStrength,
} from "./obsidianForceModel.js";

describe("obsidianForceModel", () => {
  it("uses long uniform links by default", () => {
    expect(OBSIDIAN_PROFILE.linkDistance).toBe(250);
  });

  it("uses degree-aware link strength", () => {
    expect(computeObsidianLinkStrength(1, 12, OBSIDIAN_PROFILE)).toBeCloseTo(1);
    expect(computeObsidianLinkStrength(5, 12, OBSIDIAN_PROFILE)).toBeCloseTo(0.2);
  });

  it("uses fixed collision radius independent of visual node size", () => {
    expect(computeObsidianCollisionRadius(4, OBSIDIAN_PROFILE)).toBe(60);
    expect(computeObsidianCollisionRadius(16, OBSIDIAN_PROFILE)).toBe(60);
  });

  it("uses strong global repulsion", () => {
    expect(computeObsidianManyBodyStrength(OBSIDIAN_PROFILE)).toBe(-1000);
  });
});
