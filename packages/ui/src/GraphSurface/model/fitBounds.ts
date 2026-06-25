import type { CoreGraph, ReadonlyVec2 } from "./coreTypes.js";

export interface GraphFitBounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export interface ComputeGraphFitBoundsOptions {
  focusLargestDocumentComponent?: boolean;
}

function boundsForIds(ids: Iterable<string>, positions: ReadonlyMap<string, ReadonlyVec2>): GraphFitBounds | null {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  let count = 0;

  for (const id of ids) {
    const pos = positions.get(id);
    if (!pos) continue;
    if (pos.x < minX) minX = pos.x;
    if (pos.x > maxX) maxX = pos.x;
    if (pos.y < minY) minY = pos.y;
    if (pos.y > maxY) maxY = pos.y;
    count++;
  }

  return count > 0 ? { minX, minY, maxX, maxY } : null;
}

function largestDocumentComponent(graph: CoreGraph, positions: ReadonlyMap<string, ReadonlyVec2>): string[] {
  const docIds = new Set(
    graph.nodes
      .filter((node) => node.kind === "document" && positions.has(node.id))
      .map((node) => node.id),
  );
  const adjacency = new Map<string, Set<string>>();
  for (const id of docIds) adjacency.set(id, new Set());

  for (const edge of graph.edges) {
    if (edge.size !== 0.6) continue;
    if (!docIds.has(edge.source) || !docIds.has(edge.target)) continue;
    adjacency.get(edge.source)?.add(edge.target);
    adjacency.get(edge.target)?.add(edge.source);
  }

  const seen = new Set<string>();
  let best: string[] = [];
  for (const id of docIds) {
    if (seen.has(id)) continue;
    const component: string[] = [];
    const stack = [id];
    seen.add(id);
    while (stack.length > 0) {
      const current = stack.pop()!;
      component.push(current);
      for (const next of adjacency.get(current) ?? []) {
        if (seen.has(next)) continue;
        seen.add(next);
        stack.push(next);
      }
    }
    if (component.length > best.length) best = component;
  }

  return best.length >= 2 ? best : [];
}

export function computeGraphFitBounds(
  graph: CoreGraph,
  positions: ReadonlyMap<string, ReadonlyVec2>,
  options: ComputeGraphFitBoundsOptions = {},
): GraphFitBounds | null {
  if (options.focusLargestDocumentComponent) {
    const mainComponent = largestDocumentComponent(graph, positions);
    if (mainComponent.length > 0) {
      const bounds = boundsForIds(mainComponent, positions);
      if (bounds) return bounds;
    }
  }

  return boundsForIds(positions.keys(), positions);
}
