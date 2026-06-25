import { describe, expect, it } from "vitest";
import { CameraController } from "./CameraController.js";

describe("CameraController", () => {
  it("fits bounds inside asymmetric viewport padding", () => {
    const camera = new CameraController();

    camera.fitBounds(0, 0, 100, 100, 1000, 800, {
      left: 100,
      right: 300,
      top: 50,
      bottom: 150,
    });

    expect(camera.current.scale).toBeCloseTo(6, 5);
    expect(camera.current.x).toBeCloseTo(66.66667, 5);
    expect(camera.current.y).toBeCloseTo(58.33333, 5);
  });
});
