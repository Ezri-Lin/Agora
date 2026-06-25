import type { CoreGraph, CoreNode } from "./coreTypes.js";

export interface GraphViewOptions {
  readonly showTags: boolean;
  readonly hideUnresolved: boolean;
  readonly showOrphans: boolean;
}

export const OBSIDIAN_DEFAULT_GRAPH_VIEW_OPTIONS: GraphViewOptions = Object.freeze({
  showTags: false,
  hideUnresolved: false,
  showOrphans: true,
});

function buildDegreeMap(graph: CoreGraph): Map<string, number> {
  const degree = new Map<string, number>();
  for (const node of graph.nodes) degree.set(node.id, 0);
  for (const edge of graph.edges) {
    degree.set(edge.source, (degree.get(edge.source) ?? 0) + 1);
    degree.set(edge.target, (degree.get(edge.target) ?? 0) + 1);
  }
  return degree;
}

function isVisibleNode(node: CoreNode, options: GraphViewOptions, degree: number): boolean {
  if (node.kind === "tag") return options.showTags;
  if (node.kind === "ghost") return !options.hideUnresolved;
  if (!options.showOrphans && node.kind === "document" && degree === 0) return false;
  return true;
}

export function filterGraphForView(graph: CoreGraph, options: GraphViewOptions): CoreGraph {
  const degree = buildDegreeMap(graph);
  const visibleIds = new Set(
    graph.nodes
      .filter((node) => isVisibleNode(node, options, degree.get(node.id) ?? 0))
      .map((node) => node.id),
  );

  return {
    nodes: graph.nodes.filter((node) => visibleIds.has(node.id)),
    edges: graph.edges.filter((edge) => visibleIds.has(edge.source) && visibleIds.has(edge.target)),
  };
}
