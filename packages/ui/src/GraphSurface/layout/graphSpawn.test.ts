import { describe, expect, it } from "vitest";
import { spawnGraphNode } from "./graphSpawn.js";

describe("spawnGraphNode", () => {
  it("spawns near the centroid of positioned neighbors", () => {
    const pos = spawnGraphNode({
      neighborPositions: [{ x: 100, y: 0 }, { x: 140, y: 0 }],
      existingPositions: [],
      random: () => 0,
    });

    expect(pos.x).toBeGreaterThan(40);
    expect(pos.x).toBeLessThan(220);
    expect(Math.abs(pos.y)).toBeLessThan(100);
  });

  it("spawns disconnected nodes in an annulus around existing bounds", () => {
    const pos = spawnGraphNode({
      neighborPositions: [],
      existingPositions: [{ x: -100, y: -100 }, { x: 100, y: 100 }],
      random: () => 0.25,
    });
    const distance = Math.hypot(pos.x, pos.y);

    expect(distance).toBeGreaterThan(120);
    expect(distance).toBeLessThan(420);
  });
});
