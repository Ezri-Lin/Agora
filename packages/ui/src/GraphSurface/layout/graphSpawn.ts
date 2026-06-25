import type { ReadonlyVec2 } from "../model/coreTypes.js";

interface SpawnInput {
  readonly neighborPositions: ReadonlyArray<ReadonlyVec2>;
  readonly existingPositions: ReadonlyArray<ReadonlyVec2>;
  readonly random?: () => number;
}

function centroid(points: ReadonlyArray<ReadonlyVec2>): ReadonlyVec2 {
  const sum = points.reduce(
    (acc, point) => ({ x: acc.x + point.x, y: acc.y + point.y }),
    { x: 0, y: 0 },
  );
  return { x: sum.x / points.length, y: sum.y / points.length };
}

function radiusForExisting(points: ReadonlyArray<ReadonlyVec2>): number {
  if (points.length === 0) return 140;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const point of points) {
    minX = Math.min(minX, point.x);
    minY = Math.min(minY, point.y);
    maxX = Math.max(maxX, point.x);
    maxY = Math.max(maxY, point.y);
  }
  return Math.max(140, Math.hypot(maxX - minX, maxY - minY) * 0.7);
}

export function spawnGraphNode(input: SpawnInput): ReadonlyVec2 {
  const random = input.random ?? Math.random;
  const hasNeighbors = input.neighborPositions.length > 0;
  const center = hasNeighbors
    ? centroid(input.neighborPositions)
    : input.existingPositions.length > 0
      ? centroid(input.existingPositions)
      : { x: 0, y: 0 };
  const baseRadius = hasNeighbors ? 80 : radiusForExisting(input.existingPositions);
  const angle = random() * Math.PI * 2;
  const radius = baseRadius * (0.75 + random() * 0.5);

  return {
    x: center.x + Math.cos(angle) * radius,
    y: center.y + Math.sin(angle) * radius,
  };
}
