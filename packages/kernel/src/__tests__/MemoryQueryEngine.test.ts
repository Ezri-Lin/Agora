/**
 * MemoryQueryEngine 测试
 */

import { describe, it, expect } from "vitest";
import { MemoryQueryEngine } from "../memory/MemoryQueryEngine.js";
import { InMemoryGraphStore } from "../memory/MemoryGraphStore.js";
import { ProvenanceTracker } from "../memory/ProvenanceTracker.js";
import { StructuredIndexer } from "../memory/StructuredIndexer.js";
import type { MemoryStore, MemoryListQuery } from "../memory/MemoryStoreTypes.js";
import type { MemoryCandidate } from "../memory/MemoryCandidate.js";

function createCandidate(
  id: string,
  content: string,
  type: MemoryCandidate["type"] = "decision"
): MemoryCandidate {
  return {
    id,
    scope: "project",
    type,
    content,
    source: {
      sessionId: "session-1",
      messageIds: ["msg-1"],
    },
    confidence: 0.8,
    status: "accepted",
    tags: ["test"],
    createdAt: new Date().toISOString(),
  };
}

// Mock MemoryStore
function createMockStore(candidates: MemoryCandidate[]): MemoryStore {
  const store = new Map(candidates.map((c) => [c.id, c]));
  return {
    appendCandidate: async () => {},
    appendCandidates: async () => {},
    updateStatus: async () => {},
    getById: async (id: string) => store.get(id) ?? null,
    list: async (query?: MemoryListQuery) => {
      let results = [...store.values()];
      if (query?.status) {
        results = results.filter((c) => query.status!.includes(c.status));
      }
      return results;
    },
    appendAuditEvent: async () => {},
    getAuditLog: async () => [],
  };
}

describe("MemoryQueryEngine", () => {
  it("should query memories by text", async () => {
    const candidates = [
      createCandidate("mem-1", "use JWT for authentication"),
      createCandidate("mem-2", "use session for state management"),
    ];

    const store = createMockStore(candidates);
    const graphStore = new InMemoryGraphStore();
    const indexer = new StructuredIndexer();
    const provenance = new ProvenanceTracker();

    await indexer.rebuild(candidates);

    const engine = new MemoryQueryEngine(
      store,
      graphStore,
      indexer,
      provenance,
      { workspaceId: "workspace-1" }
    );

    const result = await engine.query({ text: "JWT" });

    expect(result.memories).toHaveLength(1);
    expect(result.memories[0].memory.id).toBe("mem-1");
    expect(result.trace.totalScanned).toBe(2);
  });

  it("should query by type", async () => {
    const candidates = [
      createCandidate("mem-1", "决策内容", "decision"),
      createCandidate("mem-2", "偏好内容", "preference"),
    ];

    const store = createMockStore(candidates);
    const graphStore = new InMemoryGraphStore();
    const indexer = new StructuredIndexer();
    const provenance = new ProvenanceTracker();

    await indexer.rebuild(candidates);

    const engine = new MemoryQueryEngine(
      store,
      graphStore,
      indexer,
      provenance,
      { workspaceId: "workspace-1" }
    );

    const result = await engine.query({ type: ["decision"] });

    expect(result.memories).toHaveLength(1);
    expect(result.memories[0].memory.type).toBe("decision");
  });

  it("should get memory with provenance", async () => {
    const candidates = [createCandidate("mem-1", "测试内容")];

    const store = createMockStore(candidates);
    const graphStore = new InMemoryGraphStore();
    const indexer = new StructuredIndexer();
    const provenance = new ProvenanceTracker();

    await provenance.attach("mem-1", [{
      type: "message",
      ref: "msg-1",
      excerpt: "来源",
      timestamp: new Date().toISOString(),
      contentHash: "hash-1",
      trustLevel: "user_provided",
    }]);

    const engine = new MemoryQueryEngine(
      store,
      graphStore,
      indexer,
      provenance,
      { workspaceId: "workspace-1" }
    );

    const result = await engine.get("mem-1", true);

    expect(result).not.toBeNull();
    expect(result!.provenance).toBeDefined();
    expect(result!.provenance!.provenanceStatus).toBe("complete");
  });

  it("should return null for non-existent memory", async () => {
    const store = createMockStore([]);
    const graphStore = new InMemoryGraphStore();
    const indexer = new StructuredIndexer();
    const provenance = new ProvenanceTracker();

    const engine = new MemoryQueryEngine(
      store,
      graphStore,
      indexer,
      provenance,
      { workspaceId: "workspace-1" }
    );

    const result = await engine.get("mem-nonexistent");
    expect(result).toBeNull();
  });

  it("should handle legacy memory without provenance", async () => {
    const candidates = [createCandidate("mem-1", "旧记忆")];

    const store = createMockStore(candidates);
    const graphStore = new InMemoryGraphStore();
    const indexer = new StructuredIndexer();
    const provenance = new ProvenanceTracker();

    const engine = new MemoryQueryEngine(
      store,
      graphStore,
      indexer,
      provenance,
      { workspaceId: "workspace-1" }
    );

    const result = await engine.get("mem-1", true);

    expect(result).not.toBeNull();
    expect(result!.provenance!.provenanceStatus).toBe("missing_legacy");
  });
});
