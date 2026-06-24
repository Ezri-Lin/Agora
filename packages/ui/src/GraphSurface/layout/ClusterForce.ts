/**
 * ClusterForce — weak d3 force that nudges same-cluster nodes toward centroid.
 * No virtual anchor nodes. Pure velocity nudge with clamp.
 */

import type { SimulationNodeDatum } from "d3-force";

interface ClusterNode extends SimulationNodeDatum {
  id: string;
  cluster?: string;
}

interface ClusterForce {
  (alpha: number): void;
  initialize(nodes: ClusterNode[]): void;
  strength(value: number): ClusterForce;
}

function clamp(value: number, limit: number): number {
  return Math.max(-limit, Math.min(limit, value));
}

export function forceCluster(strengthFactor = 0.06, maxNudge = 2.5): ClusterForce {
  let nodes: ClusterNode[] = [];
  let strength = strengthFactor;

  function force(alpha: number) {
    const centroids = new Map<string, { x: number; y: number; count: number }>();

    for (const node of nodes) {
      if (!node.cluster) continue;
      const x = node.x ?? 0;
      const y = node.y ?? 0;
      const existing = centroids.get(node.cluster);
      if (existing) {
        existing.x += x;
        existing.y += y;
        existing.count++;
      } else {
        centroids.set(node.cluster, { x, y, count: 1 });
      }
    }

    for (const centroid of centroids.values()) {
      centroid.x /= centroid.count;
      centroid.y /= centroid.count;
    }

    const adjustedStrength = strength * alpha;
    for (const node of nodes) {
      if (!node.cluster) continue;
      const centroid = centroids.get(node.cluster);
      if (!centroid || centroid.count <= 1) continue;

      const dx = centroid.x - (node.x ?? 0);
      const dy = centroid.y - (node.y ?? 0);

      node.vx = (node.vx ?? 0) + clamp(dx * adjustedStrength, maxNudge);
      node.vy = (node.vy ?? 0) + clamp(dy * adjustedStrength, maxNudge);
    }
  }

  force.initialize = function (newNodes: ClusterNode[]) {
    nodes = newNodes;
  };

  force.strength = function (value: number) {
    strength = value;
    return force;
  };

  return force;
}
