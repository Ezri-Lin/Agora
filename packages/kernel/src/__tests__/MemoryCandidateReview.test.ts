/**
 * Memory Candidate Review 测试
 */

import { describe, it, expect, vi } from "vitest";
import { MemoryCandidateReviewQueue } from "../memoryReview/MemoryCandidateReviewQueue.js";
import { MemoryCandidateProvenanceBinder } from "../memoryReview/MemoryCandidateProvenanceBinder.js";
import { MemoryCandidateDecisionService } from "../memoryReview/MemoryCandidateDecisionService.js";
import { MemoryReviewPolicyEvaluator } from "../memoryReview/MemoryReviewPolicy.js";
import {
  computeContentHash,
  generateReviewId,
  DEFAULT_REVIEW_POLICY,
} from "../memoryReview/types.js";
import type {
  MemoryReviewItem,
  MemoryReviewContext,
  ReviewProvenance,
} from "../memoryReview/types.js";
import type { MemoryCandidate } from "../memory/MemoryCandidate.js";
import type { MemoryStore } from "../memory/MemoryStoreTypes.js";
import type { ProvenanceTracker } from "../memory/ProvenanceTracker.js";
import type { StructuredIndexer } from "../memory/StructuredIndexer.js";

// === Helpers ===

function createTestCandidate(id: string, content: string): MemoryCandidate {
  return {
    id,
    scope: "project",
    type: "decision",
    content,
    source: { sessionId: "session-1", messageIds: ["msg-1"] },
    confidence: 0.8,
    status: "candidate",
    tags: ["test"],
    createdAt: new Date().toISOString(),
  };
}

function createTestProvenance(): ReviewProvenance {
  return {
    workspaceId: "workspace-1",
    messageIds: ["msg-1"],
    toolCallIds: [],
    sourceSpans: [
      {
        sourceType: "message",
        sourceId: "msg-1",
        excerpt: "Test excerpt",
        trustLevel: "user",
        provenanceStatus: "none",
      },
    ],
  };
}

function createTestItem(id: string, content: string): MemoryReviewItem {
  return {
    id,
    workspaceId: "workspace-1",
    candidate: createTestCandidate(id, content),
    contentHash: computeContentHash(content),
    provenance: createTestProvenance(),
    status: "pending",
    createdAt: new Date().toISOString(),
  };
}

// === Queue Tests ===

describe("MemoryCandidateReviewQueue", () => {
  it("should append item with provenance", async () => {
    const queue = new MemoryCandidateReviewQueue();
    const item = createTestItem("review-1", "Use JWT for authentication");

    const error = await queue.append(item);

    expect(error).toBeNull();
    expect(queue.getCount()).toBe(1);
    expect(queue.getCount("pending")).toBe(1);
  });

  it("should reject item without provenance", async () => {
    const queue = new MemoryCandidateReviewQueue();
    const item = createTestItem("review-1", "Test");
    item.provenance.sourceSpans = [];

    const error = await queue.append(item);

    expect(error).not.toBeNull();
    expect(error!.code).toBe("PROVENANCE_REQUIRED");
  });

  it("should reject duplicate contentHash", async () => {
    const queue = new MemoryCandidateReviewQueue();
    const item1 = createTestItem("review-1", "Same content");
    const item2 = createTestItem("review-2", "Same content");

    await queue.append(item1);
    const error = await queue.append(item2);

    expect(error).not.toBeNull();
    expect(error!.code).toBe("CONTENT_HASH_DUPLICATE");
  });

  it("should get pending items", async () => {
    const queue = new MemoryCandidateReviewQueue();
    await queue.append(createTestItem("review-1", "First"));
    await queue.append(createTestItem("review-2", "Second"));

    const pending = queue.getPending();

    expect(pending).toHaveLength(2);
    expect(pending[0].id).toBe("review-1");
  });

  it("should record decision", async () => {
    const queue = new MemoryCandidateReviewQueue();
    await queue.append(createTestItem("review-1", "Test"));

    const error = await queue.recordDecision({
      reviewId: "review-1",
      action: "accept",
      reason: "User approved",
      decidedBy: "user",
    });

    expect(error).toBeNull();
    expect(queue.getCount("accepted")).toBe(1);
    expect(queue.getCount("pending")).toBe(0);
  });

  it("should reject decision on already decided item", async () => {
    const queue = new MemoryCandidateReviewQueue();
    await queue.append(createTestItem("review-1", "Test"));
    await queue.recordDecision({
      reviewId: "review-1",
      action: "accept",
      reason: "First decision",
      decidedBy: "user",
    });

    const error = await queue.recordDecision({
      reviewId: "review-1",
      action: "reject",
      reason: "Second decision",
      decidedBy: "user",
    });

    expect(error).not.toBeNull();
    expect(error!.code).toBe("REVIEW_ALREADY_DECIDED");
  });

  it("should track events", async () => {
    const queue = new MemoryCandidateReviewQueue();
    await queue.append(createTestItem("review-1", "Test"));
    await queue.recordDecision({
      reviewId: "review-1",
      action: "reject",
      reason: "Not relevant",
      decidedBy: "user",
    });

    const events = queue.getEvents();

    expect(events).toHaveLength(2);
    expect(events[0].type).toBe("item_appended");
    expect(events[1].type).toBe("decision_recorded");
  });
});

// === Provenance Binder Tests ===

describe("MemoryCandidateProvenanceBinder", () => {
  it("should bind provenance from council output", () => {
    const binder = new MemoryCandidateProvenanceBinder();
    const context: MemoryReviewContext = { workspaceId: "ws-1" };

    const provenance = binder.bindFromCouncilOutput(
      context,
      "round-1",
      "skeptic_critic",
      [
        {
          id: "msg-1",
          roomId: "room-1",
          senderType: "user",
          senderId: "user-1",
          content: "What about authentication?",
          status: "ok",
          createdAt: new Date().toISOString(),
        },
      ]
    );

    expect(provenance.workspaceId).toBe("ws-1");
    expect(provenance.councilRoundId).toBe("round-1");
    expect(provenance.roleId).toBe("skeptic_critic");
    expect(provenance.sourceSpans.length).toBeGreaterThan(0);
  });

  it("should truncate long excerpts", () => {
    const binder = new MemoryCandidateProvenanceBinder({ maxExcerptChars: 50 });
    const context: MemoryReviewContext = { workspaceId: "ws-1" };

    const provenance = binder.bindFromDocumentResult(
      context,
      "doc-1",
      [{ excerpt: "A".repeat(200) }]
    );

    expect(provenance.sourceSpans[0].excerpt.length).toBeLessThanOrEqual(53); // 50 + "..."
  });
});

// === Decision Service Tests ===

describe("MemoryCandidateDecisionService", () => {
  it("should accept with user decision", async () => {
    const queue = new MemoryCandidateReviewQueue();
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

    await queue.append(createTestItem("review-1", "Test decision"));

    const error = await service.accept(
      "review-1",
      "User approved",
      { workspaceId: "workspace-1" }
    );

    expect(error).toBeNull();
    expect(mockMemoryStore.appendCandidate).toHaveBeenCalled();
    expect(mockProvenanceTracker.attach).toHaveBeenCalled();
    expect(mockIndexer.index).toHaveBeenCalled();
  });

  it("should reject with policy decision", async () => {
    const queue = new MemoryCandidateReviewQueue();
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

    await queue.append(createTestItem("review-1", "Test"));

    const error = await service.reject("review-1", "Low confidence", "policy");

    expect(error).toBeNull();
    expect(queue.getCount("rejected")).toBe(1);
    expect(mockMemoryStore.appendCandidate).not.toHaveBeenCalled();
  });

  it("should reject accept on already decided item", async () => {
    const queue = new MemoryCandidateReviewQueue();
    const service = new MemoryCandidateDecisionService(
      queue,
      {} as MemoryStore,
      {} as ProvenanceTracker,
      {} as StructuredIndexer,
      DEFAULT_REVIEW_POLICY
    );

    await queue.append(createTestItem("review-1", "Test"));
    await service.reject("review-1", "First", "user");

    const error = await service.accept(
      "review-1",
      "Second",
      { workspaceId: "workspace-1" }
    );

    expect(error).not.toBeNull();
    expect(error!.code).toBe("REVIEW_ALREADY_DECIDED");
  });

  it("should reject accept with workspace mismatch", async () => {
    const queue = new MemoryCandidateReviewQueue();
    const service = new MemoryCandidateDecisionService(
      queue,
      {} as MemoryStore,
      {} as ProvenanceTracker,
      {} as StructuredIndexer,
      DEFAULT_REVIEW_POLICY
    );

    await queue.append(createTestItem("review-1", "Test"));

    const error = await service.accept(
      "review-1",
      "Approved",
      { workspaceId: "different-workspace" }
    );

    expect(error).not.toBeNull();
    expect(error!.code).toBe("WORKSPACE_SCOPE_MISMATCH");
  });
});

// === Policy Evaluator Tests ===

describe("MemoryReviewPolicyEvaluator", () => {
  it("should auto-reject low confidence", () => {
    const evaluator = new MemoryReviewPolicyEvaluator();
    const item = createTestItem("review-1", "Test");
    item.candidate.confidence = 0.1;

    expect(evaluator.shouldAutoReject(item)).toBe(true);
  });

  it("should not auto-reject high confidence", () => {
    const evaluator = new MemoryReviewPolicyEvaluator();
    const item = createTestItem("review-1", "Test");
    item.candidate.confidence = 0.9;

    expect(evaluator.shouldAutoReject(item)).toBe(false);
  });

  it("should check queue full", () => {
    const evaluator = new MemoryReviewPolicyEvaluator({ maxPendingItems: 5 });

    expect(evaluator.isQueueFull(3)).toBe(false);
    expect(evaluator.isQueueFull(5)).toBe(true);
  });
});

// === Helper Tests ===

describe("Memory Review Helpers", () => {
  it("should compute content hash", () => {
    const hash1 = computeContentHash("Hello");
    const hash2 = computeContentHash("Hello");
    const hash3 = computeContentHash("World");

    expect(hash1).toBe(hash2);
    expect(hash1).not.toBe(hash3);
  });

  it("should generate review id", () => {
    const id1 = generateReviewId();
    const id2 = generateReviewId();

    expect(id1).toMatch(/^review-/);
    expect(id1).not.toBe(id2);
  });
});
