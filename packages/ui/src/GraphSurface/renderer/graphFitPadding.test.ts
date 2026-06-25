import { describe, expect, it } from "vitest";
import { computeGraphFitPadding } from "./graphFitPadding.js";

describe("computeGraphFitPadding", () => {
  it("does not over-reserve horizontal space on very wide screens", () => {
    const padding = computeGraphFitPadding(2048, 838);

    expect(padding.left).toBe(48);
    expect(padding.right).toBe(180);
    expect(padding.bottom).toBeCloseTo(134.08, 5);
  });

  it("keeps normal laptop viewports centered while reserving composer space", () => {
    const padding = computeGraphFitPadding(1366, 768);

    expect(padding.right).toBeCloseTo(122.94, 5);
    expect(padding.bottom).toBeCloseTo(122.88, 5);
  });
});
