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
  linkDistance: 70,         // default for normal doc-doc links
  linkStrength: 0.75,
  manyBodyStrength: -85,   // default for normal nodes
  collidePadding: 4,
  velocityDecay: 0.42,
  alphaDecay: 1 - Math.pow(0.001, 1 / 300), // ≈ 0.023
  dragAlphaTarget: 0.12,

  // Cluster force
  clusterEnabled: true,
  clusterStrength: 0.04,

  // Leaf orbit — constrain degree<=2 nodes around their parent
  leafOrbitEnabled: true,
  leafOrbitStrength: 0.15,
  leafOrbitMaxNudge: 3.0,

  // Degree-aware link distance
  hubLeafLinkDistance: 42,  // hub-leaf: tight orbit
  tagLinkDistance: 30,      // tag edges: short (semantic hint, not structural)
  ghostLinkDistance: 28,    // ghost edges: short (unresolved hint)

  // Degree-aware manyBody
  leafManyBodyStrength: -25,   // leaf: weak repel
  hubManyBodyStrength: -130,   // hub: strong repel to spread structure
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
  clusterEnabled: false,   // no clustering in loose mode
};
