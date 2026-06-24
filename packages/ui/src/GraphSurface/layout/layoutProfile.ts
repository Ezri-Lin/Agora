/**
 * Preset layout profiles for D3ForceRuntime.
 *
 * d3-force parameters differ from Obsidian's custom force simulation.
 * Obsidian uses squared-distance repulsion; d3-force uses log approximation.
 * These values produce Obsidian-like compact clustering in d3-force.
 */

import type { LayoutProfile } from "./layoutTypes.js";

/** Compact layout matching Obsidian's dense circular clustering. */
export const OBSIDIAN_PROFILE: LayoutProfile = {
  linkDistance: 250,
  linkStrength: 1.0,
  manyBodyStrength: -120,
  collidePadding: 4,
  velocityDecay: 0.42,
  alphaDecay: 1 - Math.pow(0.001, 1 / 300), // ≈ 0.023
  dragAlphaTarget: 0.12,
};

/** Loose layout for large graphs. */
export const LOOSE_PROFILE: LayoutProfile = {
  linkDistance: 80,
  linkStrength: 0.2,
  manyBodyStrength: -150,
  collidePadding: 6,
  velocityDecay: 0.5,
  alphaDecay: 0.03,
  dragAlphaTarget: 0.1,
};
