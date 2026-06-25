import { describe, expect, it } from "vitest";
import { getLabelVisibility } from "./LabelVisibilityPolicy.js";

const baseInput = {
  cameraScale: 1,
  nodeWeight: 0,
  isHovered: false,
  isSelected: false,
  isNeighbor: false,
};

describe("LabelVisibilityPolicy", () => {
  it("keeps ordinary labels hidden at medium zoom", () => {
    const visibility = getLabelVisibility({
      ...baseInput,
      cameraScale: 1.6,
      nodeWeight: 1,
    });

    expect(visibility.visible).toBe(false);
    expect(visibility.targetAlpha).toBe(0);
  });

  it("keeps ordinary labels hidden until intentional zoom", () => {
    expect(getLabelVisibility({
      ...baseInput,
      cameraScale: 1.5,
      nodeWeight: 4,
    }).visible).toBe(false);

    expect(getLabelVisibility({
      ...baseInput,
      cameraScale: 3.2,
      nodeWeight: 4,
    }).visible).toBe(true);
  });

  it("still delays important labels until the graph is intentionally zoomed", () => {
    const beforeReveal = getLabelVisibility({
      ...baseInput,
      cameraScale: 1.7,
      nodeWeight: 12,
    });
    const afterReveal = getLabelVisibility({
      ...baseInput,
      cameraScale: 3.2,
      nodeWeight: 12,
    });

    expect(beforeReveal.visible).toBe(false);
    expect(afterReveal.visible).toBe(true);
  });

  it("keeps selected labels immediately visible", () => {
    const visibility = getLabelVisibility({
      ...baseInput,
      cameraScale: 0.6,
      isSelected: true,
    });

    expect(visibility.visible).toBe(true);
    expect(visibility.targetAlpha).toBe(1);
  });
});
