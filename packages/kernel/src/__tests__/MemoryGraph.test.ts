/**
 * MemoryGraph 测试
 */

import { describe, it, expect } from "vitest";
import { MemoryGraph } from "../memory/MemoryGraph.js";
import type { MemoryEdge } from "../memory/graphTypes.js";

function createEdge(
  from: string,
  to: string,
  type: MemoryEdge["type"] = "related_to"
): MemoryEdge {
  return {
    id: `edge-${from}-${to}`,
    from,
    to,
    type,
    weight: 1.0,
    createdAt: new Date().toISOString(),
  };
}

describe("MemoryGraph", () => {
  it("should add and retrieve edges", () => {
    const graph = new MemoryGraph();
    const edge = createEdge("mem-1", "mem-2", "supports");

    graph.addEdge(edge);

    const edges = graph.getEdges("mem-1");
    expect(edges).toHaveLength(1);
    expect(edges[0].type).toBe("supports");
  });

  it("should get outgoing edges", () => {
    const graph = new MemoryGraph();
    graph.addEdge(createEdge("mem-1", "mem-2", "derived_from"));
    graph.addEdge(createEdge("mem-3", "mem-1", "supports"));

    const outgoing = graph.getEdges("mem-1", "outgoing");
    expect(outgoing).toHaveLength(1);
    expect(outgoing[0].from).toBe("mem-1");
  });

  it("should get incoming edges", () => {
    const graph = new MemoryGraph();
    graph.addEdge(createEdge("mem-1", "mem-2", "derived_from"));
    graph.addEdge(createEdge("mem-3", "mem-1", "supports"));

    const incoming = graph.getEdges("mem-1", "incoming");
    expect(incoming).toHaveLength(1);
    expect(incoming[0].to).toBe("mem-1");
  });

  it("should traverse related nodes within depth limit", () => {
    const graph = new MemoryGraph();
    graph.addEdge(createEdge("mem-1", "mem-2"));
    graph.addEdge(createEdge("mem-2", "mem-3"));
    graph.addEdge(createEdge("mem-3", "mem-4"));

    const traversal = graph.getRelated("mem-1", 2);

    expect(traversal.root).toBe("mem-1");
    expect(traversal.depth).toBe(2);
    // mem-2 and mem-3 should be reachable within depth 2
    expect(traversal.nodes.has("mem-2")).toBe(true);
    expect(traversal.nodes.has("mem-3")).toBe(true);
    // mem-4 requires depth 3
    expect(traversal.nodes.has("mem-4")).toBe(false);
  });

  it("should detect contradictions", () => {
    const graph = new MemoryGraph();
    graph.addEdge(createEdge("mem-1", "mem-2", "contradicts"));
    graph.addEdge(createEdge("mem-1", "mem-3", "supports"));

    const contradictions = graph.getContradictions("mem-1");
    expect(contradictions).toHaveLength(1);
    expect(contradictions[0].type).toBe("contradicts");
  });

  it("should get derivation chain", () => {
    const graph = new MemoryGraph();
    graph.addEdge(createEdge("mem-1", "mem-2", "derived_from"));
    graph.addEdge(createEdge("mem-2", "mem-3", "derived_from"));

    const chain = graph.getDerivationChain("mem-1");
    expect(chain).toContain("mem-2");
    expect(chain).toContain("mem-3");
  });

  it("should handle empty graph", () => {
    const graph = new MemoryGraph();

    expect(graph.getEdges("mem-1")).toHaveLength(0);
    expect(graph.getNodeCount()).toBe(0);
    expect(graph.getEdgeCount()).toBe(0);
  });
});
