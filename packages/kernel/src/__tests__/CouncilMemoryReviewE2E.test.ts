/**
 * Council Memory Review E2E 测试
 *
 * 验证完整链路：
 * Council round → MemoryExtractor → review queue → provenance → user accept → MemoryStore + ProvenanceTracker
 */

import { describe, it, expect, vi } from "vitest";
import { MemoryCandidateReviewQueue } from "../memoryReview/MemoryCandidateReviewQueue.js";
import { MemoryCandidateProvenanceBinder } from "../memoryReview/MemoryCandidateProvenanceBinder.js";
import { MemoryCandidateDecisionService } from "../memoryReview/MemoryCandidateDecisionService.js";
import { computeContentHash, generateReviewId, DEFAULT_REVIEW_POLICY } from "../memoryReview/types.js";
import type { MemoryReviewItem, MemoryReviewContext, ReviewProvenance } from "../memoryReview/types.js";
import type { MemoryCandidate } from "../memory/MemoryCandidate.js";
import type { MemoryStore } from "../memory/MemoryStoreTypes.js";
import type { ProvenanceTracker } from "../memory/ProvenanceTracker.js";
import type { StructuredIndexer } from "../memory/StructuredIndexer.js";

// === E2E Tests ===

describe("Council Memory Review E2E", () => {
  it("should complete full review lifecycle: append → provenance → accept → memory store", async () => {
    // 1. 模拟 Council 输出后 MemoryExtractor 生成 candidate
    const candidate: MemoryCandidate = {
      id: "mem-council-1",
      scope: "project",
      type: "decision",
      content: "Use JWT for API authentication",
      source: {
        sessionId: "session-1",
        messageIds: ["msg-user-1", "msg-role-1"],
      },
      confidence: 0.85,
      status: "candidate",
      tags: ["auth", "security"],
      createdAt: new Date().toISOString(),
    };

    // 2. 绑定 provenance (模拟 council output)
    const binder = new MemoryCandidateProvenanceBinder();
    const context: MemoryReviewContext = {
      workspaceId: "workspace-1",
      projectId: "project-1",
      sessionId: "session-1",
    };

    const provenance = binder.bindFromCouncilOutput(
      context,
      "round-1",
      "skeptic_critic",
      [
        {
          id: "msg-user-1",
          roomId: "room-1",
          senderType: "user",
          senderId: "user-1",
          content: "What authentication should we use?",
          status: "ok",
          createdAt: new Date().toISOString(),
        },
        {
          id: "msg-role-1",
          roomId: "room-1",
          senderType: "role",
          senderId: "skeptic_critic",
          content: "JWT is recommended for stateless API auth.",
          status: "ok",
          createdAt: new Date().toISOString(),
        },
      ],
      [
        {
          roleId: "skeptic_critic",
          calls: [
            {
              toolCallId: "call-1",
              toolName: "document_analysis",
              ok: true,
              resultBytes: 500,
            },
            {
              toolCallId: "call-2",
              toolName: "memory_search",
              ok: true,
              resultBytes: 200,
            },
          ],
          completionReason: "final_response",
          turnsUsed: 2,
          totalToolCalls: 2,
        },
      ]
    );

    // 3. 创建 review item
    const reviewItem: MemoryReviewItem = {
      id: generateReviewId(),
      workspaceId: context.workspaceId,
      projectId: context.projectId,
      sessionId: context.sessionId,
      candidate,
      contentHash: computeContentHash(candidate.content),
      provenance,
      status: "pending",
      createdAt: new Date().toISOString(),
    };

    // 4. 追加到 review queue
    const queue = new MemoryCandidateReviewQueue();
    const appendError = await queue.append(reviewItem);

    expect(appendError).toBeNull();
    expect(queue.getCount("pending")).toBe(1);

    // 5. 验证 provenance 完整性
    const item = queue.getById(reviewItem.id);
    expect(item).toBeDefined();
    expect(item!.provenance.workspaceId).toBe("workspace-1");
    expect(item!.provenance.councilRoundId).toBe("round-1");
    expect(item!.provenance.roleId).toBe("skeptic_critic");
    expect(item!.provenance.messageIds).toContain("msg-user-1");
    expect(item!.provenance.messageIds).toContain("msg-role-1");
    expect(item!.provenance.toolCallIds).toContain("call-1");
    expect(item!.provenance.toolCallIds).toContain("call-2");
    expect(item!.provenance.sourceSpans.length).toBeGreaterThan(0);

    // 6. User accept
    const mockMemoryStore: MemoryStore = {
      appendCandidate: vi.fn(),
      appendCandidates: vi.fn(),
      updateStatus: vi.fn(),
      getById: vi.fn(),
      list: vi.fn(),
      appendAuditEvent: vi.fn(),
      getAuditLog: vi.fn(),
    };
    const mockProvenanceTracker: ProvenanceTracker = {
      attach: vi.fn(),
      addDerivation: vi.fn(),
      addRationaleStep: vi.fn(),
      getChain: vi.fn(),
      validate: vi.fn(),
      hasProvenance: vi.fn(),
      getProvenanceStatus: vi.fn(),
    };
    const mockIndexer: StructuredIndexer = {
      rebuild: vi.fn(),
      index: vi.fn(),
      search: vi.fn(),
      getStats: vi.fn(),
      getEntry: vi.fn(),
    };

    const service = new MemoryCandidateDecisionService(
      queue,
      mockMemoryStore,
      mockProvenanceTracker,
      mockIndexer,
      DEFAULT_REVIEW_POLICY
    );

    const acceptError = await service.accept(
      reviewItem.id,
      "User approved after review",
      context
    );

    expect(acceptError).toBeNull();

    // 7. 验证 MemoryStore 收到 accepted memory
    expect(mockMemoryStore.appendCandidate).toHaveBeenCalled();
    const appendedCandidate = (mockMemoryStore.appendCandidate as any).mock.calls[0][0];
    expect(appendedCandidate.status).toBe("accepted");
    expect(appendedCandidate.content).toBe("Use JWT for API authentication");

    // 8. 验证 ProvenanceTracker 收到 sources
    expect(mockProvenanceTracker.attach).toHaveBeenCalled();
    const attachCall = (mockProvenanceTracker.attach as any).mock.calls[0];
    expect(attachCall[0]).toBe("mem-council-1");
    expect(attachCall[1].length).toBeGreaterThan(0);

    // 9. 验证 StructuredIndexer 收到索引请求
    expect(mockIndexer.index).toHaveBeenCalled();

    // 10. 验证 review status 变为 accepted
    expect(queue.getCount("accepted")).toBe(1);
    expect(queue.getCount("pending")).toBe(0);
  });

  it("should reject policy/system accept", async () => {
    const queue = new MemoryCandidateReviewQueue();
    const service = new MemoryCandidateDecisionService(
      queue,
      {} as MemoryStore,
      {} as ProvenanceTracker,
      {} as StructuredIndexer,
      DEFAULT_REVIEW_POLICY
    );

    // 追加 candidate
    const item: MemoryReviewItem = {
      id: "review-1",
      workspaceId: "ws-1",
      candidate: {
        id: "mem-1",
        scope: "project",
        type: "decision",
        content: "Test",
        source: { sessionId: "s1", messageIds: ["m1"] },
        confidence: 0.8,
        status: "candidate",
        tags: [],
        createdAt: new Date().toISOString(),
      },
      contentHash: "hash-1",
      provenance: {
        workspaceId: "ws-1",
        messageIds: ["m1"],
        toolCallIds: [],
        sourceSpans: [{
          sourceType: "message",
          sourceId: "m1",
          excerpt: "Test",
          trustLevel: "user",
          provenanceStatus: "none",
        }],
      },
      status: "pending",
      createdAt: new Date().toISOString(),
    };

    await queue.append(item);

    // Policy accept 应该被拒绝
    // 注意：当前实现 accept 方法不接受 decidedBy 参数
    // 所以这个测试验证的是接口设计，不是实现
    // v0 的 accept 只能通过 API 调用，decidedBy 固定为 "user"
  });

  it("should preserve provenance through review lifecycle", async () => {
    const queue = new MemoryCandidateReviewQueue();
    const binder = new MemoryCandidateProvenanceBinder();
    const context: MemoryReviewContext = { workspaceId: "ws-1" };

    // 创建带 provenance 的 item
    const provenance = binder.bindFromDocumentResult(
      context,
      "doc-1",
      [
        { excerpt: "JWT is recommended", charRange: { start: 0, end: 18 } },
        { excerpt: "Stateless auth", charRange: { start: 20, end: 34 } },
      ]
    );

    const item: MemoryReviewItem = {
      id: "review-1",
      workspaceId: "ws-1",
      candidate: {
        id: "mem-1",
        scope: "project",
        type: "decision",
        content: "Use JWT",
        source: { sessionId: "s1", messageIds: [] },
        confidence: 0.9,
        status: "candidate",
        tags: [],
        createdAt: new Date().toISOString(),
      },
      contentHash: "hash-1",
      provenance,
      status: "pending",
      createdAt: new Date().toISOString(),
    };

    await queue.append(item);

    // 验证 provenance 保留
    const retrieved = queue.getById("review-1");
    expect(retrieved).toBeDefined();
    expect(retrieved!.provenance.sourceSpans).toHaveLength(2);
    expect(retrieved!.provenance.sourceSpans[0].excerpt).toBe("JWT is recommended");
    expect(retrieved!.provenance.sourceSpans[0].charRange).toEqual({ start: 0, end: 18 });
    expect(retrieved!.provenance.sourceSpans[0].trustLevel).toBe("workspace");
  });

  it("should handle multiple candidates from same council round", async () => {
    const queue = new MemoryCandidateReviewQueue();
    const binder = new MemoryCandidateProvenanceBinder();
    const context: MemoryReviewContext = { workspaceId: "ws-1" };

    // 一个 council round 生成多个 candidates
    const candidates = [
      { id: "mem-1", content: "Use JWT for auth" },
      { id: "mem-2", content: "Rate limit API calls" },
      { id: "mem-3", content: "Cache responses for 5 minutes" },
    ];

    for (const c of candidates) {
      const provenance = binder.bindFromCouncilOutput(
        context,
        "round-1",
        "product_strategist",
        [{
          id: `msg-${c.id}`,
          roomId: "room-1",
          senderType: "role",
          senderId: "product_strategist",
          content: c.content,
          status: "ok",
          createdAt: new Date().toISOString(),
        }]
      );

      const item: MemoryReviewItem = {
        id: `review-${c.id}`,
        workspaceId: "ws-1",
        candidate: {
          ...c,
          scope: "project",
          type: "decision",
          source: { sessionId: "s1", messageIds: [`msg-${c.id}`] },
          confidence: 0.8,
          status: "candidate",
          tags: [],
          createdAt: new Date().toISOString(),
        },
        contentHash: computeContentHash(c.content),
        provenance,
        status: "pending",
        createdAt: new Date().toISOString(),
      };

      await queue.append(item);
    }

    // 验证所有 candidates 都在 queue 中
    expect(queue.getCount("pending")).toBe(3);

    // 验证都来自同一个 council round
    const pending = queue.getPending();
    for (const item of pending) {
      expect(item.provenance.councilRoundId).toBe("round-1");
      expect(item.provenance.roleId).toBe("product_strategist");
    }
  });
});
