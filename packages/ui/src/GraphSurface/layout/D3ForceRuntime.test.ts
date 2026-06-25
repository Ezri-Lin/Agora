import { describe, expect, it } from "vitest";
import type { CoreGraph } from "../model/coreTypes.js";
import { D3ForceRuntime } from "./D3ForceRuntime.js";
import { OBSIDIAN_PROFILE } from "./layoutProfile.js";
import {
  computeObsidianCollisionRadius,
  computeObsidianLinkStrength,
  computeObsidianManyBodyStrength,
} from "./obsidianForceModel.js";

const doc = (id: string, size = 4) => ({
  id,
  label: id,
  kind: "document",
  size,
  color: "#999999",
});

const ghost = (id: string, size = 3) => ({
  id,
  label: id,
  kind: "ghost",
  size,
  color: "#777777",
});

describe("D3ForceRuntime Obsidian-style global layout", () => {
  it("uses one long link distance for base layout links", () => {
    expect(OBSIDIAN_PROFILE.linkDistance).toBe(250);
  });

  it("uses degree-aware strength instead of edge-kind multipliers", () => {
    expect(computeObsidianLinkStrength(1, 8, OBSIDIAN_PROFILE)).toBeCloseTo(1);
    expect(computeObsidianLinkStrength(4, 8, OBSIDIAN_PROFILE)).toBeCloseTo(0.25);
  });

  it("uses fixed collision radius and strong global charge", () => {
    expect(computeObsidianCollisionRadius(4, OBSIDIAN_PROFILE)).toBe(60);
    expect(computeObsidianManyBodyStrength(OBSIDIAN_PROFILE)).toBe(-1000);
  });

  it("registers first-load graph edges in the physics simulation", () => {
    const runtime = new D3ForceRuntime(OBSIDIAN_PROFILE);
    const graph: CoreGraph = {
      nodes: [doc("doc:a"), doc("doc:b")],
      edges: [
        { id: "ab", source: "doc:a", target: "doc:b", size: 0.6 },
      ],
    };

    runtime.setGraph(graph);

    expect((runtime as any).edgeList).toHaveLength(1);
  });

  it("spreads a small document graph without using derived rings", () => {
    const runtime = new D3ForceRuntime(OBSIDIAN_PROFILE);
    const graph: CoreGraph = {
      nodes: [doc("doc:hub", 8), doc("doc:leaf"), doc("doc:x"), doc("doc:y")],
      edges: [
        { id: "hub-leaf", source: "doc:hub", target: "doc:leaf", size: 0.6 },
        { id: "hub-x", source: "doc:hub", target: "doc:x", size: 0.6 },
        { id: "hub-y", source: "doc:hub", target: "doc:y", size: 0.6 },
      ],
    };

    runtime.setGraph(graph);
    for (let i = 0; i < 120; i++) runtime.tick();

    const positions = runtime.getPositions();
    const hub = positions.get("doc:hub");
    const leaf = positions.get("doc:leaf");
    expect(hub).toBeDefined();
    expect(leaf).toBeDefined();
    const distance = Math.hypot(leaf!.x - hub!.x, leaf!.y - hub!.y);
    expect(distance).toBeGreaterThan(80);
    expect(distance).toBeLessThan(380);
  });

  it("keeps visible ghost nodes in the same global simulation", () => {
    const runtime = new D3ForceRuntime(OBSIDIAN_PROFILE);
    const graph: CoreGraph = {
      nodes: [doc("doc:hub", 8), doc("doc:x"), doc("doc:y"), ghost("ghost:missing")],
      edges: [
        { id: "hub-x", source: "doc:hub", target: "doc:x", size: 0.6 },
        { id: "hub-y", source: "doc:hub", target: "doc:y", size: 0.6 },
        { id: "hub-ghost", source: "doc:hub", target: "ghost:missing", size: 0.2 },
      ],
    };

    runtime.setGraph(graph);
    for (let i = 0; i < 120; i++) runtime.tick();

    const positions = runtime.getPositions();
    expect(positions.get("doc:hub")).toBeDefined();
    expect(positions.get("ghost:missing")).toBeDefined();
  });
});
