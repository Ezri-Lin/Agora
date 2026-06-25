/**
 * Preset layout profiles for D3ForceRuntime.
 *
 * Keep the default intentionally close to Obsidian's global graph:
 * one simple force model, strong global spacing, and view filtering
 * before semantic nodes enter the layout.
 */

import type { LayoutProfile } from "./layoutTypes.js";

/** Obsidian-like global graph layout. */
export const OBSIDIAN_PROFILE: LayoutProfile = {
  linkDistance: 250,
  linkStrength: 1,
  manyBodyStrength: -1000,
  collideIterations: 1,
  collisionRadius: 60,
  collisionStrength: 0.5,
  repelDistanceMin: 30,
  centerStrength: 0.1,
  velocityDecay: 0.4,
  alphaDecay: 1 - Math.pow(0.001, 1 / 300),
  dragAlphaTarget: 0.12,
};
