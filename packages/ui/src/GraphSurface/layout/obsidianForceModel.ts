import type { LayoutProfile } from "./layoutTypes.js";

export function computeObsidianLinkStrength(
  sourceDegree: number,
  targetDegree: number,
  profile: LayoutProfile,
): number {
  const minDegree = Math.max(1, Math.min(sourceDegree || 1, targetDegree || 1));
  return profile.linkStrength / minDegree;
}

export function computeObsidianCollisionRadius(
  _nodeRadius: number,
  profile: LayoutProfile,
): number {
  return profile.collisionRadius ?? 60;
}

export function computeObsidianManyBodyStrength(profile: LayoutProfile): number {
  return profile.manyBodyStrength;
}
