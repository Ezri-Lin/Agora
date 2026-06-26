/**
 * AgentOrchestrator — 统一入口
 *
 * 串联完整 agent loop:
 * LLM response → parse tool calls → execute → feed results → continue/done
 *
 * v0 只接本地 read-only tools
 */

import type { ToolRuntime, ToolManifest } from "../tools/ToolRuntimeTypes.js";
import type {
  AgentMessage,
  AgentExecutionResult,
  StopPolicy,
  LLMResponse,
} from "./types.js";
import { DEFAULT_STOP_POLICY } from "./types.js";
import { AgentLoopStateMachine } from "./AgentLoopStateMachine.js";
import { ToolCallParser } from "./ToolCallParser.js";
import { ToolExecutionCoordinator } from "./ToolExecutionCoordinator.js";
import { StopConditionEvaluator } from "./StopConditionEvaluator.js";

// LLM Provider 接口 (简化版)
export interface AgentLLMProvider {
  generate(params: {
    systemPrompt: string;
    messages: AgentMessage[];
    tools: ToolManifest[];
    signal?: AbortSignal;
  }): Promise<LLMResponse>;
}

export class AgentOrchestrator {
  private stopPolicy: StopPolicy;

  constructor(
    private llmProvider: AgentLLMProvider,
    private toolRuntime: ToolRuntime,
    stopPolicy?: Partial<StopPolicy>
  ) {
    this.stopPolicy = { ...DEFAULT_STOP_POLICY, ...stopPolicy };
  }

  /**
   * 执行 agent loop
   */
  async execute(params: {
    systemPrompt: string;
    messages: AgentMessage[];
    tools: ToolManifest[];
    signal?: AbortSignal;
  }): Promise<AgentExecutionResult> {
    const { systemPrompt, messages, tools, signal } = params;

    // 初始化组件
    const stateMachine = new AgentLoopStateMachine();
    const parser = new ToolCallParser({
      allowTextFallback: false,
      maxToolCallJsonBytes: 8192,
      allowedToolNames: tools.map((t) => t.name),
    });
    const coordinator = new ToolExecutionCoordinator(this.toolRuntime, {
      allowedToolNames: tools.map((t) => t.name),
      maxArgsBytes: 32768,
      maxResultBytes: 65536,
      allowParallel: true,
    });
    coordinator.setManifests(tools);
    const stopEvaluator = new StopConditionEvaluator(this.stopPolicy);

    // 开始
    stateMachine.start();
    const allMessages = [...messages];

    // 检查 abort
    const checkAbort = () => {
      if (signal?.aborted) {
        stateMachine.setCancelled();
        throw new Error("USER_CANCELLED");
      }
    };

    try {
      while (stateMachine.canContinue(this.stopPolicy)) {
        checkAbort();

        // 1. 增加轮次
        stateMachine.incrementTurn();

        // 2. 调用 LLM (保持在 awaiting_model 状态)
        const llmResponse = await this.llmProvider.generate({
          systemPrompt,
          messages: allMessages,
          tools,
          signal,
        });

        // 3. 保存 assistant message (with tool_calls)
        const assistantMessage: AgentMessage = {
          role: "assistant",
          content: llmResponse.content,
          toolCalls: llmResponse.toolCalls,
        };
        allMessages.push(assistantMessage);

        // 4. 解析 tool calls
        const toolCalls = parser.parse(llmResponse);

        // 解析 tool calls
        stateMachine.transition("model_responded");

        if (toolCalls.length === 0) {
          // 没有 tool calls，完成
          stateMachine.transition("complete");
          return {
            state: "done",
            completionReason: "final_response",
            messages: allMessages,
            toolCallsExecuted: stateMachine.getEvaluationContext().totalToolCalls,
            turnsUsed: stateMachine.getEvaluationContext().turnsUsed,
            finalResponse: llmResponse.content,
          };
        }

        // 5. 检查 maxToolCallsPerTurn (执行前)
        if (toolCalls.length > this.stopPolicy.maxToolCallsPerTurn) {
          stateMachine.transition("fail");
          return {
            state: "failed",
            completionReason: "max_tool_calls_per_turn",
            messages: allMessages,
            toolCallsExecuted: stateMachine.getEvaluationContext().totalToolCalls,
            turnsUsed: stateMachine.getEvaluationContext().turnsUsed,
            error: {
              code: "MAX_TOOL_CALLS_PER_TURN_EXCEEDED",
              message: `Too many tool calls: ${toolCalls.length} > ${this.stopPolicy.maxToolCallsPerTurn}`,
              recoverable: false,
            },
          };
        }

        // 6. 执行 tool calls
        stateMachine.transition("tool_calls_parsed");
        stateMachine.transition("tools_executed");
        const results = await coordinator.executeParallel(toolCalls, signal);

        // 7. 增加 tool call 计数
        stateMachine.incrementToolCalls(toolCalls.length);

        // 8. 保存 tool results
        for (const result of results) {
          allMessages.push(result);
        }

        // 9. 检查连续错误
        const failedCount = results.filter((r) => !r.ok).length;
        if (failedCount > 0) {
          stateMachine.incrementConsecutiveErrors();
        } else {
          stateMachine.resetConsecutiveErrors();
        }

        // 10. 检查停止条件
        const ctx = stateMachine.getEvaluationContext();
        ctx.lastToolResults = results;
        const stopDecision = stopEvaluator.shouldStop(ctx);

        if (stopDecision.shouldStop) {
          stateMachine.transition("fail");
          return {
            state: "failed",
            completionReason: stopDecision.reason!,
            messages: allMessages,
            toolCallsExecuted: ctx.totalToolCalls,
            turnsUsed: ctx.turnsUsed,
            error: {
              code: stopDecision.reason as any,
              message: stopDecision.message ?? "Stop condition reached",
              recoverable: false,
            },
          };
        }

        // 11. 继续循环
        stateMachine.transition("results_fed");
      }

      // 不应到达这里
      return {
        state: "failed",
        completionReason: "error",
        messages: allMessages,
        toolCallsExecuted: stateMachine.getEvaluationContext().totalToolCalls,
        turnsUsed: stateMachine.getEvaluationContext().turnsUsed,
      };
    } catch (error) {
      // 处理异常
      const isCancelled =
        error instanceof Error && error.message === "USER_CANCELLED";

      return {
        state: isCancelled ? "cancelled" : "failed",
        completionReason: isCancelled ? "cancelled" : "error",
        messages: allMessages,
        toolCallsExecuted: stateMachine.getEvaluationContext().totalToolCalls,
        turnsUsed: stateMachine.getEvaluationContext().turnsUsed,
        error: {
          code: isCancelled ? "USER_CANCELLED" : "MODEL_ERROR",
          message: error instanceof Error ? error.message : "Unknown error",
          recoverable: false,
        },
      };
    }
  }
}
