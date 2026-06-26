/**
 * Decision Log 测试
 */

import { describe, it, expect } from "vitest";
import { InMemoryDecisionLogStore } from "../decisionLog/DecisionLogStore.js";
import { DecisionLogWriter } from "../decisionLog/DecisionLogWriter.js";
import type { DecisionLogEntry } from "../decisionLog/types.js";

// === Store Tests ===

describe("InMemoryDecisionLogStore", () => {
  it("should append and query entries", async () => {
    const store = new InMemoryDecisionLogStore();

    await store.append({
      id: "entry-1",
      workspaceId: "ws-1",
      type: "memory_candidate_accepted",
      title: "Memory accepted",
      summary: "User approved",
      actor: "user",
      sourceRefs: [],
      createdAt: new Date().toISOString(),
    });

    const results = await store.query({ workspaceId: "ws-1" });
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe("entry-1");
  });

  it("should filter by type", async () => {
    const store = new InMemoryDecisionLogStore();

    await store.append({
      id: "entry-1",
      workspaceId: "ws-1",
      type: "memory_candidate_accepted",
      title: "Accepted",
      summary: "",
      actor: "user",
      sourceRefs: [],
      createdAt: new Date().toISOString(),
    });

    await store.append({
      id: "entry-2",
      workspaceId: "ws-1",
      type: "council_round_completed",
      title: "Round done",
      summary: "",
      actor: "system",
      sourceRefs: [],
      createdAt: new Date().toISOString(),
    });

    const accepted = await store.query({
      workspaceId: "ws-1",
      type: ["memory_candidate_accepted"],
    });
    expect(accepted).toHaveLength(1);
    expect(accepted[0].id).toBe("entry-1");
  });

  it("should filter by workspace", async () => {
    const store = new InMemoryDecisionLogStore();

    await store.append({
      id: "entry-1",
      workspaceId: "ws-1",
      type: "user_decision",
      title: "Decision",
      summary: "",
      actor: "user",
      sourceRefs: [],
      createdAt: new Date().toISOString(),
    });

    await store.append({
      id: "entry-2",
      workspaceId: "ws-2",
      type: "user_decision",
      title: "Decision",
      summary: "",
      actor: "user",
      sourceRefs: [],
      createdAt: new Date().toISOString(),
    });

    const results = await store.query({ workspaceId: "ws-1" });
    expect(results).toHaveLength(1);
    expect(results[0].workspaceId).toBe("ws-1");
  });

  it("should reject entry without workspaceId", async () => {
    const store = new InMemoryDecisionLogStore();

    const error = await store.append({
      id: "entry-1",
      workspaceId: "",
      type: "user_decision",
      title: "Decision",
      summary: "",
      actor: "user",
      sourceRefs: [],
      createdAt: new Date().toISOString(),
    });

    expect(error).not.toBeNull();
    expect(error!.code).toBe("WORKSPACE_REQUIRED");
  });

  it("should get count by workspace", async () => {
    const store = new InMemoryDecisionLogStore();

    await store.append({
      id: "entry-1",
      workspaceId: "ws-1",
      type: "user_decision",
      title: "Decision",
      summary: "",
      actor: "user",
      sourceRefs: [],
      createdAt: new Date().toISOString(),
    });

    await store.append({
      id: "entry-2",
      workspaceId: "ws-1",
      type: "user_decision",
      title: "Decision",
      summary: "",
      actor: "user",
      sourceRefs: [],
      createdAt: new Date().toISOString(),
    });

    await store.append({
      id: "entry-3",
      workspaceId: "ws-2",
      type: "user_decision",
      title: "Decision",
      summary: "",
      actor: "user",
      sourceRefs: [],
      createdAt: new Date().toISOString(),
    });

    expect(await store.getCount("ws-1")).toBe(2);
    expect(await store.getCount("ws-2")).toBe(1);
  });
});

// === Writer Tests ===

describe("DecisionLogWriter", () => {
  it("should log memory candidate accepted", async () => {
    const store = new InMemoryDecisionLogStore();
    const writer = new DecisionLogWriter(store);

    await writer.logMemoryCandidateAccepted({
      workspaceId: "ws-1",
      reviewId: "review-1",
      candidateId: "mem-1",
      reason: "User approved",
    });

    const entries = await store.query({ workspaceId: "ws-1" });
    expect(entries).toHaveLength(1);
    expect(entries[0].type).toBe("memory_candidate_accepted");
    expect(entries[0].actor).toBe("user");
  });

  it("should log memory candidate rejected", async () => {
    const store = new InMemoryDecisionLogStore();
    const writer = new DecisionLogWriter(store);

    await writer.logMemoryCandidateRejected({
      workspaceId: "ws-1",
      reviewId: "review-1",
      candidateId: "mem-1",
      reason: "Low confidence",
      decidedBy: "policy",
    });

    const entries = await store.query({ workspaceId: "ws-1" });
    expect(entries).toHaveLength(1);
    expect(entries[0].type).toBe("memory_candidate_rejected");
    expect(entries[0].actor).toBe("policy");
  });

  it("should log council round completed", async () => {
    const store = new InMemoryDecisionLogStore();
    const writer = new DecisionLogWriter(store);

    await writer.logCouncilRoundCompleted({
      workspaceId: "ws-1",
      councilRoundId: "round-1",
      roleCount: 3,
      toolCallCount: 5,
    });

    const entries = await store.query({ workspaceId: "ws-1" });
    expect(entries).toHaveLength(1);
    expect(entries[0].type).toBe("council_round_completed");
    expect(entries[0].summary).toContain("3 roles");
    expect(entries[0].summary).toContain("5 tool calls");
  });

  it("should log role tool used", async () => {
    const store = new InMemoryDecisionLogStore();
    const writer = new DecisionLogWriter(store);

    await writer.logRoleToolUsed({
      workspaceId: "ws-1",
      roleId: "skeptic_critic",
      toolName: "document_analysis",
      ok: true,
    });

    const entries = await store.query({ workspaceId: "ws-1" });
    expect(entries).toHaveLength(1);
    expect(entries[0].type).toBe("role_tool_used");
    expect(entries[0].actor).toBe("role");
    expect(entries[0].actorId).toBe("skeptic_critic");
  });

  it("should log user decision", async () => {
    const store = new InMemoryDecisionLogStore();
    const writer = new DecisionLogWriter(store);

    await writer.logUserDecision({
      workspaceId: "ws-1",
      title: "Use JWT for auth",
      summary: "Decided to use JWT for API authentication",
    });

    const entries = await store.query({ workspaceId: "ws-1" });
    expect(entries).toHaveLength(1);
    expect(entries[0].type).toBe("user_decision");
    expect(entries[0].actor).toBe("user");
  });
});
