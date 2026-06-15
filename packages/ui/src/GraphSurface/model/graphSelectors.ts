/**
 * Domain-agnostic graph query utilities.
 * Operate on CoreGraph — no mutations, no Agora types.
 */

import type { CoreGraph, CoreNode, CoreEdge, ReadonlyVec2 } from "./coreTypes.js";

/** Build a node id→node index (derived cache, not stored on CoreGraph). */
export function buildNodeIndex(graph: CoreGraph): ReadonlyMap<string, CoreNode> {
  const map = new Map<string, CoreNode>();
  for (const node of graph.nodes) map.set(node.id, node);
  return map;
}

/** Get a node by id. */
export function getNodeById(graph: CoreGraph, id: string): CoreNode | undefined {
  for (const node of graph.nodes) {
    if (node.id === id) return node;
  }
  return undefined;
}

/** Get all neighbor node ids for a given node. */
export function getNeighbors(graph: CoreGraph, nodeId: string): string[] {
  const neighbors: string[] = [];
  for (const edge of graph.edges) {
    if (edge.source === nodeId) neighbors.push(edge.target);
    else if (edge.target === nodeId) neighbors.push(edge.source);
  }
  return neighbors;
}

/** Get all edges connected to a node. */
export function getConnectedEdges(graph: CoreGraph, nodeId: string): CoreEdge[] {
  return graph.edges.filter(
    (e) => e.source === nodeId || e.target === nodeId,
  );
}

/** Get degree (number of connected edges) for a node. */
export function getDegree(graph: CoreGraph, nodeId: string): number {
  let count = 0;
  for (const edge of graph.edges) {
    if (edge.source === nodeId || edge.target === nodeId) count++;
  }
  return count;
}

/** Get the set of node ids connected to the given node (including itself). */
export function getHighlightedSet(graph: CoreGraph, nodeId: string): Set<string> {
  const set = new Set<string>([nodeId]);
  for (const edge of graph.edges) {
    if (edge.source === nodeId) set.add(edge.target);
    else if (edge.target === nodeId) set.add(edge.source);
  }
  return set;
}

/** Compute centroid of positions. */
export function computeCentroid(positions: ReadonlyMap<string, ReadonlyVec2>): ReadonlyVec2 {
  let sx = 0, sy = 0, n = 0;
  for (const { x, y } of positions.values()) {
    sx += x; sy += y; n++;
  }
  return n > 0 ? { x: sx / n, y: sy / n } : { x: 0, y: 0 };
}
