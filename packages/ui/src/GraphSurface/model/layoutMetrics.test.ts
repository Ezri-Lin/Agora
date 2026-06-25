import { describe, expect, it } from "vitest";
import { computeLayoutMetrics } from "./layoutMetrics.js";

describe("computeLayoutMetrics", () => {
  it("measures nearest-neighbor spacing spread", () => {
    const metrics = computeLayoutMetrics(new Map([
      ["a", { x: 0, y: 0 }],
      ["b", { x: 10, y: 0 }],
      ["c", { x: 20, y: 0 }],
    ]));

    expect(metrics.nodeCount).toBe(3);
    expect(metrics.nearestNeighborMean).toBeCloseTo(10);
    expect(metrics.nearestNeighborCoefficientOfVariation).toBeCloseTo(0);
  });
});
