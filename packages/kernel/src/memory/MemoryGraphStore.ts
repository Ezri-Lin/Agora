/**
 * MemoryGraphStore — 图持久化
 *
 * Append-only, tombstone deletion
 * 基于文件系统 JSONL
 */

import type {
  MemoryEdge,
  MemoryEdgeRecord,
} from "./graphTypes.js";
import { MemoryGraph } from "./MemoryGraph.js";

export interface MemoryGraphStoreConfig {
  dataDir: string;
}

export const DEFAULT_GRAPH_STORE_CONFIG: MemoryGraphStoreConfig = {
  dataDir: ".agora/memory/graph",
};

export interface MemoryGraphStore {
  appendEdge(edge: MemoryEdge): Promise<void>;
  appendEdges(edges: MemoryEdge[]): Promise<void>;
  markDeleted(edgeId: string, reason: string): Promise<void>;
  getEdges(
    memoryId: string,
    direction?: "outgoing" | "incoming",
    options?: { includeDeleted?: boolean }
  ): Promise<MemoryEdgeRecord[]>;
  getActiveEdges(): Promise<MemoryEdge[]>;
  rebuild(): Promise<MemoryGraph>;
}

/**
 * 基于内存的 GraphStore 实现 (用于测试和单会话)
 */
export class InMemoryGraphStore implements MemoryGraphStore {
  private records: MemoryEdgeRecord[] = [];

  async appendEdge(edge: MemoryEdge): Promise<void> {
    const record: MemoryEdgeRecord = {
      id: `edge-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      edge,
      status: "active",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.records.push(record);
  }

  async appendEdges(edges: MemoryEdge[]): Promise<void> {
    for (const edge of edges) {
      await this.appendEdge(edge);
    }
  }

  async markDeleted(edgeId: string, reason: string): Promise<void> {
    const record = this.records.find((r) => r.id === edgeId);
    if (record) {
      record.status = "deleted";
      record.updatedAt = new Date().toISOString();
    }
  }

  async getEdges(
    memoryId: string,
    direction?: "outgoing" | "incoming",
    options?: { includeDeleted?: boolean }
  ): Promise<MemoryEdgeRecord[]> {
    const includeDeleted = options?.includeDeleted ?? false;

    return this.records.filter((r) => {
      if (!includeDeleted && r.status !== "active") return false;

      if (direction === "outgoing") {
        return r.edge.from === memoryId;
      }
      if (direction === "incoming") {
        return r.edge.to === memoryId;
      }
      return r.edge.from === memoryId || r.edge.to === memoryId;
    });
  }

  async getActiveEdges(): Promise<MemoryEdge[]> {
    return this.records
      .filter((r) => r.status === "active")
      .map((r) => r.edge);
  }

  async rebuild(): Promise<MemoryGraph> {
    const graph = new MemoryGraph();
    const activeEdges = await this.getActiveEdges();
    for (const edge of activeEdges) {
      graph.addEdge(edge);
    }
    return graph;
  }
}
