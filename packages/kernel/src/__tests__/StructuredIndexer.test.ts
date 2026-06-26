/**
 * StructuredIndexer 测试
 */

import { describe, it, expect } from "vitest";
import { StructuredIndexer } from "../memory/StructuredIndexer.js";
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

describe("StructuredIndexer", () => {
  it("should index and search by keyword", async () => {
    const indexer = new StructuredIndexer();

    await indexer.index(createCandidate("mem-1", "使用 JWT 进行认证"));
    await indexer.index(createCandidate("mem-2", "使用 session 进行认证"));

    const results = await indexer.search({ text: "JWT" });
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe("mem-1");
  });

  it("should search by type", async () => {
    const indexer = new StructuredIndexer();

    await indexer.index(createCandidate("mem-1", "决策内容", "decision"));
    await indexer.index(createCandidate("mem-2", "偏好内容", "preference"));

    const results = await indexer.search({ type: ["decision"] });
    expect(results).toHaveLength(1);
    expect(results[0].type).toBe("decision");
  });

  it("should search by tags", async () => {
    const indexer = new StructuredIndexer();

    await indexer.index({
      ...createCandidate("mem-1", "内容"),
      tags: ["auth", "security"],
    });
    await indexer.index({
      ...createCandidate("mem-2", "内容"),
      tags: ["ui", "design"],
    });

    const results = await indexer.search({ tags: ["auth"] });
    expect(results).toHaveLength(1);
  });

  it("should rebuild from candidates", async () => {
    const indexer = new StructuredIndexer();
    const candidates = [
      createCandidate("mem-1", "第一个记忆"),
      createCandidate("mem-2", "第二个记忆"),
      createCandidate("mem-3", "第三个记忆"),
    ];

    await indexer.rebuild(candidates);

    const stats = await indexer.getStats();
    expect(stats.totalEntries).toBe(3);
  });

  it("should get stats by type", async () => {
    const indexer = new StructuredIndexer();

    await indexer.index(createCandidate("mem-1", "内容", "decision"));
    await indexer.index(createCandidate("mem-2", "内容", "decision"));
    await indexer.index(createCandidate("mem-3", "内容", "preference"));

    const stats = await indexer.getStats();
    expect(stats.byType["decision"]).toBe(2);
    expect(stats.byType["preference"]).toBe(1);
  });
});
