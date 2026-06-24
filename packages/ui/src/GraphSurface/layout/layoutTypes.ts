/**
 * Layout types — shared between ForceRuntime interface and implementations.
 */

import type { ReadonlyVec2 } from "../model/coreTypes.js";

export type { ReadonlyVec2 };

export interface LayoutProfile {
  linkDistance: number;
  linkStrength: number;
  manyBodyStrength: number;
  collidePadding: number;
  velocityDecay: number;
  alphaDecay: number;
  dragAlphaTarget: number;

  // Cluster force (optional, feature-flagged)
  clusterEnabled?: boolean;
  clusterStrength?: number;

  // Leaf orbit force (optional)
  leafOrbitEnabled?: boolean;
  leafOrbitStrength?: number;
  leafOrbitMaxNudge?: number;

  // Degree-aware link distance overrides (optional)
  hubLeafLinkDistance?: number;
  tagLinkDistance?: number;
  ghostLinkDistance?: number;

  // Degree-aware manyBody overrides (optional)
  leafManyBodyStrength?: number;
  hubManyBodyStrength?: number;
}

export interface ReleaseOptions {
  stickyMs?: number;
  clearVelocity?: boolean;
}
