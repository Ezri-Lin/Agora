/**
 * MemoryGraph — 内存图结构
 *
 * 支持节点/边操作和有界遍历
 * 约束: depth ≤ 3, nodes ≤ 50
 */

import type {
  MemoryEdge,
  MemoryEdgeType,
  MemoryGraphTraversal,
  MemoryGraphNeighbor,
} from "./graphTypes.js";
import { MAX_RELATED_DEPTH, MAX_RELATED_NODES } from "./graphTypes.js";

export class MemoryGraph {
  // Adjacency list: memoryId → edges (outgoing)
  private outgoing = new Map<string, MemoryEdge[]>();
  // Adjacency list: memoryId → edges (incoming)
  private incoming = new Map<string, MemoryEdge[]>();

  /**
   * 添加边
   */
  addEdge(edge: MemoryEdge): void {
    // Outgoing from edge.from
    const outEdges = this.outgoing.get(edge.from) ?? [];
    outEdges.push(edge);
    this.outgoing.set(edge.from, outEdges);

    // Incoming to edge.to
    const inEdges = this.incoming.get(edge.to) ?? [];
    inEdges.push(edge);
    this.incoming.set(edge.to, inEdges);
  }

  /**
   * 获取节点的边
   */
  getEdges(
    memoryId: string,
    direction?: "outgoing" | "incoming"
  ): MemoryEdge[] {
    if (direction === "outgoing") {
      return this.outgoing.get(memoryId) ?? [];
    }
    if (direction === "incoming") {
      return this.incoming.get(memoryId) ?? [];
    }
    // Both directions
    return [
      ...(this.outgoing.get(memoryId) ?? []),
      ...(this.incoming.get(memoryId) ?? []),
    ];
  }

  /**
   * 获取关联节点 (bounded traversal)
   */
  getRelated(memoryId: string, depth?: number): MemoryGraphTraversal {
    const maxDepth = Math.min(depth ?? 1, MAX_RELATED_DEPTH);
    const nodes = new Map<string, MemoryGraphNeighbor>();
    const allEdges: MemoryEdge[] = [];
    const visited = new Set<string>();

    this.traverse(memoryId, 0, maxDepth, visited, nodes, allEdges);

    return {
      root: memoryId,
      nodes,
      edges: allEdges,
      depth: maxDepth,
    };
  }

  /**
   * 检测矛盾
   */
  getContradictions(memoryId: string): MemoryEdge[] {
    return this.getEdges(memoryId).filter(
      (e) => e.type === "contradicts"
    );
  }

  /**
   * 获取推导链
   */
  getDerivationChain(memoryId: string): string[] {
    const chain: string[] = [];
    const visited = new Set<string>();
    this.walkDerivation(memoryId, chain, visited);
    return chain;
  }

  /**
   * 获取节点数
   */
  getNodeCount(): number {
    const allNodes = new Set<string>();
    for (const id of this.outgoing.keys()) allNodes.add(id);
    for (const id of this.incoming.keys()) allNodes.add(id);
    return allNodes.size;
  }

  /**
   * 获取边数
   */
  getEdgeCount(): number {
    let count = 0;
    for (const edges of this.outgoing.values()) {
      count += edges.length;
    }
    return count;
  }

  // === Private ===

  private traverse(
    currentId: string,
    currentDepth: number,
    maxDepth: number,
    visited: Set<string>,
    nodes: Map<string, MemoryGraphNeighbor>,
    allEdges: MemoryEdge[]
  ): void {
    if (currentDepth >= maxDepth) return;
    if (nodes.size >= MAX_RELATED_NODES) return;
    if (visited.has(currentId)) return;

    visited.add(currentId);

    // Get all edges for this node
    const edges = this.getEdges(currentId);

    for (const edge of edges) {
      const neighborId =
        edge.from === currentId ? edge.to : edge.from;

      if (visited.has(neighborId)) continue;
      if (nodes.size >= MAX_RELATED_NODES) break;

      // Add edge
      allEdges.push(edge);

      // Add neighbor
      const existing = nodes.get(neighborId);
      if (!existing) {
        nodes.set(neighborId, {
          memoryId: neighborId,
          distance: currentDepth + 1,
          edges: [edge],
        });
      } else {
        existing.edges.push(edge);
      }

      // Recurse
      this.traverse(
        neighborId,
        currentDepth + 1,
        maxDepth,
        visited,
        nodes,
        allEdges
      );
    }
  }

  private walkDerivation(
    memoryId: string,
    chain: string[],
    visited: Set<string>
  ): void {
    if (visited.has(memoryId)) return;
    visited.add(memoryId);

    // Find derived_from edges (outgoing)
    const derivedEdges = (this.outgoing.get(memoryId) ?? []).filter(
      (e) => e.type === "derived_from"
    );

    for (const edge of derivedEdges) {
      chain.push(edge.to);
      this.walkDerivation(edge.to, chain, visited);
    }
  }
}
