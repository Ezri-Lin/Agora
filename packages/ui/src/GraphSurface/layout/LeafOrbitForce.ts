/**
 * LeafOrbitForce — constrains degree=1 nodes to orbit around their parent.
 * Prevents leaf explosion. Creates Obsidian-like local hub neighborhoods.
 */

import type { SimulationNodeDatum } from "d3-force";

interface OrbitNode extends SimulationNodeDatum {
  id: string;
  degree?: number;
}

interface OrbitEdge {
  source: string | number | { id: string };
  target: string | number | { id: string };
}

interface LeafOrbitForce {
  (alpha: number): void;
  initialize(nodes: OrbitNode[]): void;
  strength(value: number): LeafOrbitForce;
}

function clamp(value: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, value));
}

function getOrbitRadius(parentDegree: number, siblingCount: number, nodeDegree: number): number {
  const base = nodeDegree <= 1
    ? 28 + Math.sqrt(siblingCount) * 4 + Math.log(parentDegree + 1) * 3
    : 22 + Math.sqrt(siblingCount) * 3 + Math.log(parentDegree + 1) * 2;
  return clamp(base, 24, 60);
}

export function forceLeafOrbit(
  edges: OrbitEdge[],
  strengthFactor = 0.06,
  maxNudge = 2.0,
): LeafOrbitForce {
  let nodes: OrbitNode[] = [];
  let strength = strengthFactor;

  // Pre-computed adjacency: nodeId → neighbor ids
  let adjacency = new Map<string, string[]>();
  // node id → node lookup
  let nodeLookup = new Map<string, OrbitNode>();
  // leaf nodes and their parent
  let leafEntries: Array<{ leaf: OrbitNode; parentId: string }> = [];

  function buildIndex() {
    adjacency = new Map();
    nodeLookup = new Map();

    for (const node of nodes) {
      nodeLookup.set(node.id, node);
    }

    for (const edge of edges) {
      const srcId = typeof edge.source === "string" ? edge.source
        : typeof edge.source === "number" ? String(edge.source)
        : edge.source.id;
      const tgtId = typeof edge.target === "string" ? edge.target
        : typeof edge.target === "number" ? String(edge.target)
        : edge.target.id;

      if (!adjacency.has(srcId)) adjacency.set(srcId, []);
      if (!adjacency.has(tgtId)) adjacency.set(tgtId, []);
      adjacency.get(srcId)!.push(tgtId);
      adjacency.get(tgtId)!.push(srcId);
    }

    // Find orbit nodes: degree<=2, not workspace, has a higher-degree parent
    leafEntries = [];
    for (const node of nodes) {
      if (node.degree === undefined) continue;
      if (node.degree > 2) continue;
      if (node.id === "workspace") continue;

      const neighbors = adjacency.get(node.id);
      if (!neighbors || neighbors.length === 0) continue;

      // Find the best parent: highest-degree neighbor
      let bestParent = neighbors[0];
      let bestParentDeg = 0;
      for (const nid of neighbors) {
        const n = nodeLookup.get(nid);
        const d = n?.degree ?? 0;
        if (d > bestParentDeg) {
          bestParentDeg = d;
          bestParent = nid;
        }
      }

      // Only constrain if parent has higher degree
      if (bestParentDeg <= node.degree) continue;

      leafEntries.push({ leaf: node, parentId: bestParent });
    }
  }

  function force(alpha: number) {
    const adjustedStrength = strength * alpha;

    for (const { leaf, parentId } of leafEntries) {
      const parent = nodeLookup.get(parentId);
      if (!parent) continue;

      // Count siblings (other orbit children of same parent)
      const parentNeighbors = adjacency.get(parentId) ?? [];
      let siblingCount = 0;
      for (const nid of parentNeighbors) {
        const n = nodeLookup.get(nid);
        if (n && (n.degree ?? 0) <= 2 && nid !== leaf.id) siblingCount++;
      }

      const parentDegree = parent.degree ?? parentNeighbors.length;
      const targetRadius = getOrbitRadius(parentDegree, siblingCount, leaf.degree ?? 1);

      const dx = (leaf.x ?? 0) - (parent.x ?? 0);
      const dy = (leaf.y ?? 0) - (parent.y ?? 0);
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < 0.001) continue; // skip co-located

      const radialError = dist - targetRadius;
      const nx = dx / dist; // unit vector from parent to leaf
      const ny = dy / dist;

      const nudge = clamp(radialError * adjustedStrength, -maxNudge, maxNudge);
      leaf.vx = (leaf.vx ?? 0) - nx * nudge;
      leaf.vy = (leaf.vy ?? 0) - ny * nudge;
    }
  }

  force.initialize = function (newNodes: OrbitNode[]) {
    nodes = newNodes;
    buildIndex();
  };

  force.strength = function (value: number) {
    strength = value;
    return force;
  };

  return force;
}
