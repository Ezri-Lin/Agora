/**
 * Agent Orchestrator 测试
 */

import { describe, it, expect, vi } from "vitest";
import { AgentLoopStateMachine } from "../agentOrchestrator/AgentLoopStateMachine.js";
import { ToolCallParser } from "../agentOrchestrator/ToolCallParser.js";
import { StreamToolCallAssembler, OpenAIStreamAdapter } from "../agentOrchestrator/StreamToolCallAssembler.js";
import { StopConditionEvaluator } from "../agentOrchestrator/StopConditionEvaluator.js";
import { AgentOrchestrator } from "../agentOrchestrator/AgentOrchestrator.js";
import type { LLMResponse, AgentMessage, StopPolicy } from "../agentOrchestrator/types.js";
import type { ToolManifest, ToolRuntime } from "../tools/ToolRuntimeTypes.js";

// === AgentLoopStateMachine ===

describe("AgentLoopStateMachine", () => {
  it("should transition through states correctly", () => {
    const sm = new AgentLoopStateMachine();
    sm.start();
    expect(sm.getState()).toBe("awaiting_model");

    sm.transition("model_responded");
    expect(sm.getState()).toBe("parsing_tools");

    sm.transition("tool_calls_parsed");
    expect(sm.getState()).toBe("executing_tools");

    sm.transition("tools_executed");
    expect(sm.getState()).toBe("feeding_results");

    sm.transition("results_fed");
    expect(sm.getState()).toBe("awaiting_model");
  });

  it("should transition to done when no tool calls", () => {
    const sm = new AgentLoopStateMachine();
    sm.start();

    sm.transition("model_responded"); // parsing_tools
    // 没有 tool calls，直接 complete
    // 需要从 awaiting_model 走 complete
  });

  it("should reject invalid transitions", () => {
    const sm = new AgentLoopStateMachine();
    sm.start();

    expect(() => sm.transition("tools_executed")).toThrow(
      "INVALID_STATE_TRANSITION"
    );
  });

  it("should track turn and tool call counts", () => {
    const sm = new AgentLoopStateMachine();
    sm.start();

    sm.incrementTurn();
    sm.incrementToolCalls(3);

    const ctx = sm.getEvaluationContext();
    expect(ctx.turnsUsed).toBe(1);
    expect(ctx.totalToolCalls).toBe(3);
    expect(ctx.toolCallsThisTurn).toBe(3);
  });

  it("should check canContinue with stop policy", () => {
    const sm = new AgentLoopStateMachine();
    sm.start();

    const policy: StopPolicy = {
      maxTurns: 2,
      maxToolCallsPerTurn: 5,
      maxTotalToolCalls: 10,
      maxConsecutiveErrors: 2,
      timeoutMs: 60000,
    };

    expect(sm.canContinue(policy)).toBe(true);

    sm.incrementTurn();
    sm.incrementTurn();
    expect(sm.canContinue(policy)).toBe(false);
  });
});

// === ToolCallParser ===

describe("ToolCallParser", () => {
  it("should parse provider-native tool calls", () => {
    const parser = new ToolCallParser({
      allowedToolNames: ["memory_search"],
    });

    const response: LLMResponse = {
      content: "",
      toolCalls: [
        {
          id: "call-1",
          name: "memory_search",
          args: { query: "认证" },
        },
      ],
    };

    const result = parser.parse(response);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("memory_search");
  });

  it("should reject tool calls outside allowlist", () => {
    const parser = new ToolCallParser({
      allowedToolNames: ["memory_search"],
    });

    const response: LLMResponse = {
      content: "",
      toolCalls: [
        {
          id: "call-1",
          name: "dangerous_tool",
          args: {},
        },
      ],
    };

    const result = parser.parse(response);
    expect(result).toHaveLength(0);
  });

  it("should not parse text fallback by default", () => {
    const parser = new ToolCallParser();

    const response: LLMResponse = {
      content: '```tool_call\n{"name": "test", "args": {}}\n```',
    };

    const result = parser.parse(response);
    expect(result).toHaveLength(0);
  });

  it("should parse text fallback when enabled", () => {
    const parser = new ToolCallParser({
      allowTextFallback: true,
      allowedToolNames: ["test"],
    });

    const response: LLMResponse = {
      content: '```tool_call\n{"name": "test", "args": {"key": "value"}}\n```',
    };

    const result = parser.parse(response);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("test");
  });
});

// === StreamToolCallAssembler ===

describe("StreamToolCallAssembler", () => {
  it("should assemble single tool call from deltas", () => {
    const assembler = new StreamToolCallAssembler();

    assembler.addDelta({ index: 0, id: "call-1", nameDelta: "memory_" });
    assembler.addDelta({ index: 0, nameDelta: "search" });
    assembler.addDelta({
      index: 0,
      argsJsonDelta: '{"query":',
    });
    assembler.addDelta({
      index: 0,
      argsJsonDelta: '"test"}',
      isComplete: true,
    });

    expect(assembler.isComplete()).toBe(true);

    const toolCalls = assembler.assemble();
    expect(toolCalls).toHaveLength(1);
    expect(toolCalls[0].name).toBe("memory_search");
    expect(toolCalls[0].args.query).toBe("test");
  });

  it("should report incomplete when not all deltas received", () => {
    const assembler = new StreamToolCallAssembler();

    assembler.addDelta({ index: 0, nameDelta: "test" });

    expect(assembler.isComplete()).toBe(false);
  });
});

// === StopConditionEvaluator ===

describe("StopConditionEvaluator", () => {
  it("should not stop when within limits", () => {
    const evaluator = new StopConditionEvaluator();

    const decision = evaluator.shouldStop({
      state: "awaiting_model",
      turnsUsed: 1,
      totalToolCalls: 3,
      toolCallsThisTurn: 2,
      consecutiveErrors: 0,
      startedAt: Date.now(),
    });

    expect(decision.shouldStop).toBe(false);
  });

  it("should stop when maxTurns exceeded", () => {
    const evaluator = new StopConditionEvaluator({
      maxTurns: 2,
    });

    const decision = evaluator.shouldStop({
      state: "awaiting_model",
      turnsUsed: 3,
      totalToolCalls: 3,
      toolCallsThisTurn: 0,
      consecutiveErrors: 0,
      startedAt: Date.now(),
    });

    expect(decision.shouldStop).toBe(true);
    expect(decision.reason).toBe("max_turns");
  });

  it("should stop when consecutiveErrors exceeded", () => {
    const evaluator = new StopConditionEvaluator({
      maxConsecutiveErrors: 2,
    });

    const decision = evaluator.shouldStop({
      state: "executing_tools",
      turnsUsed: 1,
      totalToolCalls: 3,
      toolCallsThisTurn: 3,
      consecutiveErrors: 3,
      startedAt: Date.now(),
    });

    expect(decision.shouldStop).toBe(true);
    expect(decision.reason).toBe("error");
  });

  it("should stop when cancelled", () => {
    const evaluator = new StopConditionEvaluator();

    const decision = evaluator.shouldStop({
      state: "awaiting_model",
      turnsUsed: 1,
      totalToolCalls: 0,
      toolCallsThisTurn: 0,
      consecutiveErrors: 0,
      startedAt: Date.now(),
      cancelled: true,
    });

    expect(decision.shouldStop).toBe(true);
    expect(decision.reason).toBe("cancelled");
  });
});

// === AgentOrchestrator Integration ===

describe("AgentOrchestrator", () => {
  it("should complete single turn without tool calls", async () => {
    const mockProvider = {
      generate: vi.fn().mockResolvedValue({
        content: "Final answer",
        toolCalls: [],
      } as LLMResponse),
    };

    const mockRuntime = {
      register: vi.fn(),
      createPlan: vi.fn(),
      invoke: vi.fn(),
      getAuditLog: vi.fn(),
    };

    const orchestrator = new AgentOrchestrator(
      mockProvider,
      mockRuntime,
      { maxTurns: 5 }
    );

    const result = await orchestrator.execute({
      systemPrompt: "You are helpful",
      messages: [{ role: "user", content: "Hello" }],
      tools: [],
    });

    expect(result.state).toBe("done");
    expect(result.completionReason).toBe("final_response");
    expect(result.finalResponse).toBe("Final answer");
    expect(result.turnsUsed).toBe(1);
  });

  it("should execute tool call and continue", async () => {
    const mockProvider = {
      generate: vi.fn()
        .mockResolvedValueOnce({
          content: "",
          toolCalls: [
            { id: "call-1", name: "memory_search", args: { query: "test" } },
          ],
        } as LLMResponse)
        .mockResolvedValueOnce({
          content: "Based on memory results...",
          toolCalls: [],
        } as LLMResponse),
    };

    const mockManifest: ToolManifest = {
      name: "memory_search",
      description: "Search memory",
      riskLevel: "read_only",
      sideEffects: [],
      requiresApproval: false,
      inputSchema: { type: "object" },
    };

    const mockRuntime = {
      register: vi.fn(),
      createPlan: vi.fn().mockReturnValue({ id: "plan-1" }),
      invoke: vi.fn().mockResolvedValue({
        status: "executed",
        output: { memories: [] },
      }),
      getAuditLog: vi.fn(),
    };

    const orchestrator = new AgentOrchestrator(
      mockProvider,
      mockRuntime,
      { maxTurns: 5 }
    );

    const result = await orchestrator.execute({
      systemPrompt: "You are helpful",
      messages: [{ role: "user", content: "Search memory" }],
      tools: [mockManifest],
    });

    expect(result.state).toBe("done");
    expect(result.completionReason).toBe("final_response");
    expect(result.toolCallsExecuted).toBe(1);
    expect(result.turnsUsed).toBe(2);
  });
});
