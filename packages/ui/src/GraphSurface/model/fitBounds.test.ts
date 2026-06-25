import { describe, expect, it } from "vitest";
import type { CoreGraph } from "./coreTypes.js";
import { computeGraphFitBounds } from "./fitBounds.js";

const doc = (id: string) => ({
  id,
  label: id,
  kind: "document",
  size: 4,
  color: "#999999",
});

describe("computeGraphFitBounds", () => {
  it("fits all visible positioned nodes by default", () => {
    const graph: CoreGraph = {
      nodes: [doc("doc:a"), doc("doc:b"), doc("doc:c"), doc("doc:tail")],
      edges: [
        { id: "ab", source: "doc:a", target: "doc:b", size: 0.6 },
        { id: "bc", source: "doc:b", target: "doc:c", size: 0.6 },
      ],
    };
    const positions = new Map([
      ["doc:a", { x: -20, y: -10 }],
      ["doc:b", { x: 0, y: 0 }],
      ["doc:c", { x: 20, y: 10 }],
      ["doc:tail", { x: 0, y: 900 }],
    ]);

    const bounds = computeGraphFitBounds(graph, positions);

    expect(bounds).toEqual({ minX: -20, minY: -10, maxX: 20, maxY: 900 });
  });

  it("can explicitly focus the largest document component", () => {
    const graph: CoreGraph = {
      nodes: [doc("doc:a"), doc("doc:b"), doc("doc:c"), doc("doc:tail")],
      edges: [
        { id: "ab", source: "doc:a", target: "doc:b", size: 0.6 },
        { id: "bc", source: "doc:b", target: "doc:c", size: 0.6 },
      ],
    };
    const positions = new Map([
      ["doc:a", { x: -20, y: -10 }],
      ["doc:b", { x: 0, y: 0 }],
      ["doc:c", { x: 20, y: 10 }],
      ["doc:tail", { x: 0, y: 900 }],
    ]);

    const bounds = computeGraphFitBounds(graph, positions, {
      focusLargestDocumentComponent: true,
    });

    expect(bounds).toEqual({ minX: -20, minY: -10, maxX: 20, maxY: 10 });
  });

  it("falls back to all positioned nodes when no document component exists", () => {
    const graph: CoreGraph = {
      nodes: [doc("doc:a"), doc("doc:b")],
      edges: [],
    };
    const positions = new Map([
      ["doc:a", { x: -10, y: -10 }],
      ["doc:b", { x: 10, y: 20 }],
    ]);

    const bounds = computeGraphFitBounds(graph, positions);

    expect(bounds).toEqual({ minX: -10, minY: -10, maxX: 10, maxY: 20 });
  });
});
