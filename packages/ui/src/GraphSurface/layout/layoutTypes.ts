/**
 * Layout types — shared between ForceRuntime interface and implementations.
 */

import type { ReadonlyVec2 } from "../model/coreTypes.js";

export type { ReadonlyVec2 };

export interface LayoutProfile {
  linkDistance: number;
  linkStrength: number;
  manyBodyStrength: number;
  collideIterations?: number;
  collisionRadius?: number;
  collisionStrength?: number;
  repelDistanceMin?: number;
  centerStrength?: number;
  velocityDecay: number;
  alphaDecay: number;
  dragAlphaTarget: number;
}

export interface ReleaseOptions {
  stickyMs?: number;
  clearVelocity?: boolean;
}
