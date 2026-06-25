import type { ReadonlyVec2 } from "./coreTypes.js";

export interface LayoutMetrics {
  readonly nodeCount: number;
  readonly nearestNeighborMean: number;
  readonly nearestNeighborCoefficientOfVariation: number;
}

export function computeLayoutMetrics(positions: ReadonlyMap<string, ReadonlyVec2>): LayoutMetrics {
  const points = Array.from(positions.values());
  if (points.length < 2) {
    return {
      nodeCount: points.length,
      nearestNeighborMean: 0,
      nearestNeighborCoefficientOfVariation: 0,
    };
  }

  const nearest = points.map((point, index) => {
    let best = Infinity;
    for (let i = 0; i < points.length; i++) {
      if (i === index) continue;
      const other = points[i];
      best = Math.min(best, Math.hypot(point.x - other.x, point.y - other.y));
    }
    return best;
  });

  const mean = nearest.reduce((sum, value) => sum + value, 0) / nearest.length;
  const variance = nearest.reduce((sum, value) => sum + (value - mean) ** 2, 0) / nearest.length;
  const sd = Math.sqrt(variance);

  return {
    nodeCount: points.length,
    nearestNeighborMean: mean,
    nearestNeighborCoefficientOfVariation: mean === 0 ? 0 : sd / mean,
  };
}
