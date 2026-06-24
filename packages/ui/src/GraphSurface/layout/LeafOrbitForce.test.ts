import { describe, it, expect } from "vitest";
import { forceLeafOrbit } from "./LeafOrbitForce.js";

type TestNode = {
  id: string;
  degree?: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
};

describe("forceLeafOrbit", () => {
  it("pulls distant leaf back toward target radius", () => {
    const edges = [{ source: "hub", target: "leaf" }];
    const force = forceLeafOrbit(edges, 0.5, 100);

    const nodes: TestNode[] = [
      { id: "hub", degree: 5, x: 0, y: 0, vx: 0, vy: 0 },
      { id: "leaf", degree: 1, x: 200, y: 0, vx: 0, vy: 0 },
    ];

    force.initialize(nodes);
    force(1.0);

    // Leaf is at distance 200, target radius ~36-72
    // Leaf should be pulled back (vx negative since leaf is to the right)
    expect(nodes[1].vx).toBeLessThan(0);
    expect(nodes[1].vy).toBeCloseTo(0);
  });

  it("pushes too-close leaf outward", () => {
    const edges = [{ source: "hub", target: "leaf" }];
    const force = forceLeafOrbit(edges, 0.5, 100);

    const nodes: TestNode[] = [
      { id: "hub", degree: 5, x: 0, y: 0, vx: 0, vy: 0 },
      { id: "leaf", degree: 1, x: 5, y: 0, vx: 0, vy: 0 },
    ];

    force.initialize(nodes);
    force(1.0);

    // Leaf is at distance 5, target radius ~36-72
    // Leaf should be pushed outward (vx positive since leaf is to the right)
    expect(nodes[1].vx).toBeGreaterThan(0);
  });

  it("ignores non-leaf nodes", () => {
    const edges = [{ source: "a", target: "b" }];
    const force = forceLeafOrbit(edges, 0.5, 100);

    const nodes: TestNode[] = [
      { id: "a", degree: 3, x: 0, y: 0, vx: 0, vy: 0 },
      { id: "b", degree: 3, x: 100, y: 0, vx: 0, vy: 0 },
    ];

    force.initialize(nodes);
    force(1.0);

    // Neither is leaf (degree=3), no nudge
    expect(nodes[0].vx).toBe(0);
    expect(nodes[1].vx).toBe(0);
  });

  it("ignores workspace node even if degree=1", () => {
    const edges = [{ source: "workspace", target: "doc" }];
    const force = forceLeafOrbit(edges, 0.5, 100);

    const nodes: TestNode[] = [
      { id: "workspace", degree: 5, x: 0, y: 0, vx: 0, vy: 0 },  // hub — workspace excluded
      { id: "doc", degree: 1, x: 200, y: 0, vx: 0, vy: 0 },      // leaf — has higher-degree parent
    ];

    force.initialize(nodes);
    force(1.0);

    // workspace should not be nudged (excluded by id), but doc is a leaf with hub parent
    expect(nodes[0].vx).toBe(0);
    expect(nodes[1].vx).toBeLessThan(0); // doc pulled back
  });

  it("scales with alpha", () => {
    const edges = [{ source: "hub", target: "leaf" }];
    const force = forceLeafOrbit(edges, 0.5, 100);

    const nodesFull: TestNode[] = [
      { id: "hub", degree: 5, x: 0, y: 0, vx: 0, vy: 0 },
      { id: "leaf", degree: 1, x: 200, y: 0, vx: 0, vy: 0 },
    ];
    force.initialize(nodesFull);
    force(1.0);
    const vxFull = nodesFull[1].vx!;

    const nodesHalf: TestNode[] = [
      { id: "hub", degree: 5, x: 0, y: 0, vx: 0, vy: 0 },
      { id: "leaf", degree: 1, x: 200, y: 0, vx: 0, vy: 0 },
    ];
    force.initialize(nodesHalf);
    force(0.5);
    const vxHalf = nodesHalf[1].vx!;

    expect(Math.abs(vxHalf)).toBeLessThan(Math.abs(vxFull));
  });

  it("clamps max nudge", () => {
    const edges = [{ source: "hub", target: "leaf" }];
    const force = forceLeafOrbit(edges, 1.0, 1.5); // maxNudge = 1.5

    const nodes: TestNode[] = [
      { id: "hub", degree: 5, x: 0, y: 0, vx: 0, vy: 0 },
      { id: "leaf", degree: 1, x: 10000, y: 0, vx: 0, vy: 0 },
    ];

    force.initialize(nodes);
    force(1.0);

    expect(Math.abs(nodes[1].vx!)).toBeLessThanOrEqual(1.5);
  });
});
