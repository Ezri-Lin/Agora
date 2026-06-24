import { describe, it, expect } from "vitest";
import { forceCluster } from "./ClusterForce.js";

type TestNode = {
  id: string;
  cluster?: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
};

describe("forceCluster", () => {
  it("pulls same-cluster nodes horizontally together", () => {
    const force = forceCluster(0.5);
    const nodes: TestNode[] = [
      { id: "a1", cluster: "A", x: 0, y: 0, vx: 0, vy: 0 },
      { id: "a2", cluster: "A", x: 100, y: 0, vx: 0, vy: 0 },
      { id: "b1", cluster: "B", x: 0, y: 200, vx: 0, vy: 0 },
      { id: "b2", cluster: "B", x: 100, y: 200, vx: 0, vy: 0 },
    ];

    force.initialize(nodes);
    force(1.0);

    expect(nodes[0].vx).toBeGreaterThan(0);
    expect(nodes[1].vx).toBeLessThan(0);
    expect(nodes[2].vx).toBeGreaterThan(0);
    expect(nodes[3].vx).toBeLessThan(0);

    expect(nodes[0].vy).toBeCloseTo(0);
    expect(nodes[1].vy).toBeCloseTo(0);
    expect(nodes[2].vy).toBeCloseTo(0);
    expect(nodes[3].vy).toBeCloseTo(0);
  });

  it("pulls same-cluster nodes vertically together", () => {
    const force = forceCluster(0.5);
    const nodes: TestNode[] = [
      { id: "a1", cluster: "A", x: 0, y: 0, vx: 0, vy: 0 },
      { id: "a2", cluster: "A", x: 0, y: 100, vx: 0, vy: 0 },
    ];

    force.initialize(nodes);
    force(1.0);

    expect(nodes[0].vy).toBeGreaterThan(0);
    expect(nodes[1].vy).toBeLessThan(0);
  });

  it("ignores nodes without cluster", () => {
    const force = forceCluster(0.5);
    const nodes: TestNode[] = [
      { id: "root", x: 50, y: 50, vx: 0, vy: 0 },
      { id: "a", cluster: "A", x: 0, y: 0, vx: 0, vy: 0 },
    ];

    force.initialize(nodes);
    force(1.0);

    expect(nodes[0].vx).toBe(0);
    expect(nodes[0].vy).toBe(0);
  });

  it("skips single-node clusters", () => {
    const force = forceCluster(0.5);
    const nodes: TestNode[] = [
      { id: "solo", cluster: "SOLO", x: 50, y: 50, vx: 0, vy: 0 },
    ];

    force.initialize(nodes);
    force(1.0);

    expect(nodes[0].vx).toBe(0);
    expect(nodes[0].vy).toBe(0);
  });

  it("scales with alpha", () => {
    const force = forceCluster(0.5, 1000); // large maxNudge to avoid clamping
    const nodes: TestNode[] = [
      { id: "a1", cluster: "A", x: 0, y: 0, vx: 0, vy: 0 },
      { id: "a2", cluster: "A", x: 100, y: 0, vx: 0, vy: 0 },
    ];

    force.initialize(nodes);
    force(1.0);
    const vxFull = nodes[0].vx!;

    nodes[0].vx = 0;
    nodes[1].vx = 0;

    force(0.5);
    const vxHalf = nodes[0].vx!;

    expect(Math.abs(vxHalf)).toBeLessThan(Math.abs(vxFull));
    expect(Math.abs(vxHalf)).toBeCloseTo(Math.abs(vxFull) * 0.5, 1);
  });

  it("clamps max nudge", () => {
    const force = forceCluster(1.0, 2.0);
    const nodes: TestNode[] = [
      { id: "a1", cluster: "A", x: 0, y: 0, vx: 0, vy: 0 },
      { id: "a2", cluster: "A", x: 1000, y: 0, vx: 0, vy: 0 },
    ];

    force.initialize(nodes);
    force(1.0);

    expect(Math.abs(nodes[0].vx!)).toBeLessThanOrEqual(2.0);
  });
});
