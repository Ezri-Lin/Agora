/**
 * GraphAuditSnapshot — counts for debugging graph data completeness.
 * Used to compare Agora graph output vs Obsidian's expected output.
 */

export interface GraphAuditNodeCounts {
  total: number;
  document: number;
  tag: number;
  ghost: number;        // unresolved wikilinks
  workspace: number;
  room: number;
  other: number;
}

export interface GraphAuditEdgeCounts {
  total: number;
  wikilink: number;     // resolved wikilink edges
  tag: number;          // doc → tag edges
  ghost: number;        // doc → ghost (unresolved) edges
  fallback: number;     // workspace → doc star edges
  other: number;
}

export interface GraphAuditParserMetrics {
  filesScanned: number;
  filesParsed: number;
  filesFailed: number;
  totalWikilinks: number;
  totalTags: number;
  totalMarkdownLinks: number;
  resolvedWikilinks: number;
  unresolvedWikilinks: number;
}

export interface GraphAuditClusterStats {
  total: number;
  largest: number;
  unclustered: number;
  topClusters: Array<{ id: string; count: number }>;
}

export interface GraphAuditSnapshot {
  nodes: GraphAuditNodeCounts;
  edges: GraphAuditEdgeCounts;
  parser: GraphAuditParserMetrics;
  clusters: GraphAuditClusterStats;
}

import type { CoreGraph } from "./coreTypes.js";

/**
 * Temporary heuristic until CoreEdge carries explicit kind.
 * Do not use this for persisted analytics.
 *
 * Inference rules:
 * - workspace involvement => fallback
 * - tag involvement => tag
 * - ghost involvement => ghost
 * - document-document => wikilink
 * - otherwise => other
 */
function inferEdgeKind(
  sourceKind: string,
  targetKind: string,
): "fallback" | "tag" | "ghost" | "wikilink" | "other" {
  if (sourceKind === "workspace" || targetKind === "workspace") return "fallback";
  if (sourceKind === "tag" || targetKind === "tag") return "tag";
  if (sourceKind === "ghost" || targetKind === "ghost") return "ghost";
  if (sourceKind === "document" && targetKind === "document") return "wikilink";
  return "other";
}

/**
 * Audit a CoreGraph and return counts by kind.
 * Pure function — no side effects.
 */
export function auditGraph(
  graph: CoreGraph,
  parser: GraphAuditParserMetrics,
): GraphAuditSnapshot {
  const nodes: GraphAuditNodeCounts = {
    total: graph.nodes.length,
    document: 0,
    tag: 0,
    ghost: 0,
    workspace: 0,
    room: 0,
    other: 0,
  };

  for (const node of graph.nodes) {
    switch (node.kind) {
      case "document": nodes.document++; break;
      case "tag": nodes.tag++; break;
      case "ghost": nodes.ghost++; break;
      case "workspace": nodes.workspace++; break;
      case "room": nodes.room++; break;
      default: nodes.other++; break;
    }
  }

  const edges: GraphAuditEdgeCounts = {
    total: graph.edges.length,
    wikilink: 0,
    tag: 0,
    ghost: 0,
    fallback: 0,
    other: 0,
  };

  // Build node kind lookup for edge classification
  const nodeKindMap = new Map<string, string>();
  for (const node of graph.nodes) {
    nodeKindMap.set(node.id, node.kind);
  }

  for (const edge of graph.edges) {
    const sourceKind = nodeKindMap.get(edge.source) ?? "unknown";
    const targetKind = nodeKindMap.get(edge.target) ?? "unknown";
    const kind = inferEdgeKind(sourceKind, targetKind);
    edges[kind]++;
  }

  // Temporary graph-derived estimate until parser exposes explicit resolved/unresolved counts.

  // Cluster stats
  const clusterMap = new Map<string, number>();
  let unclustered = 0;
  for (const node of graph.nodes) {
    if (node.cluster) {
      clusterMap.set(node.cluster, (clusterMap.get(node.cluster) ?? 0) + 1);
    } else {
      unclustered++;
    }
  }
  const topClusters = [...clusterMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([id, count]) => ({ id, count }));

  return {
    nodes,
    edges,
    parser: {
      ...parser,
      resolvedWikilinks: edges.wikilink,
      unresolvedWikilinks: edges.ghost,
    },
    clusters: {
      total: clusterMap.size,
      largest: Math.max(...clusterMap.values(), 0),
      unclustered,
      topClusters,
    },
  };
}
