/**
 * AgentLoopStateMachine — Agent 循环状态机
 *
 * Event-driven 状态转换
 * 避免 state/event 名称混乱
 */

import type {
  AgentLoopState,
  AgentLoopEvent,
  StopPolicy,
  StopEvaluationContext,
} from "./types.js";

// 合法的状态转换表
const VALID_TRANSITIONS: Record<AgentLoopState, Partial<Record<AgentLoopEvent, AgentLoopState>>> = {
  idle: {
    start: "awaiting_model",
  },
  awaiting_model: {
    model_responded: "parsing_tools", // 有 tool calls 时
    complete: "done",                  // 无 tool calls 时
    fail: "failed",
    cancel: "cancelled",
  },
  parsing_tools: {
    tool_calls_parsed: "executing_tools",
    complete: "done",
    fail: "failed",
    cancel: "cancelled",
  },
  executing_tools: {
    tools_executed: "feeding_results",
    fail: "failed",
    cancel: "cancelled",
  },
  feeding_results: {
    results_fed: "awaiting_model",
    fail: "failed",
    cancel: "cancelled",
  },
  done: {},
  failed: {},
  cancelled: {},
};

export class AgentLoopStateMachine {
  private state: AgentLoopState = "idle";
  private turnCount = 0;
  private totalToolCalls = 0;
  private toolCallsThisTurn = 0;
  private consecutiveErrors = 0;
  private startedAt = 0;

  /**
   * 开始执行
   */
  start(): void {
    this.state = "idle";
    this.transition("start");
    this.startedAt = Date.now();
  }

  /**
   * 状态转换 (event-driven)
   */
  transition(event: AgentLoopEvent): AgentLoopState {
    const validEvents = VALID_TRANSITIONS[this.state];
    const nextState = validEvents?.[event];

    if (!nextState) {
      throw new Error(
        `INVALID_STATE_TRANSITION: Cannot transition from "${this.state}" with event "${event}"`
      );
    }

    this.state = nextState;
    return nextState;
  }

  /**
   * 检查是否可以继续
   */
  canContinue(policy: StopPolicy): boolean {
    return (
      this.state !== "done" &&
      this.state !== "failed" &&
      this.state !== "cancelled" &&
      this.turnCount < policy.maxTurns &&
      this.totalToolCalls < policy.maxTotalToolCalls &&
      this.consecutiveErrors < policy.maxConsecutiveErrors &&
      Date.now() - this.startedAt < policy.timeoutMs
    );
  }

  /**
   * 获取当前状态
   */
  getState(): AgentLoopState {
    return this.state;
  }

  /**
   * 获取执行上下文
   */
  getEvaluationContext(): StopEvaluationContext {
    return {
      state: this.state,
      turnsUsed: this.turnCount,
      totalToolCalls: this.totalToolCalls,
      toolCallsThisTurn: this.toolCallsThisTurn,
      consecutiveErrors: this.consecutiveErrors,
      startedAt: this.startedAt,
    };
  }

  /**
   * 增加轮次计数
   */
  incrementTurn(): void {
    this.turnCount++;
    this.toolCallsThisTurn = 0;
  }

  /**
   * 增加 tool call 计数
   */
  incrementToolCalls(count: number): void {
    this.totalToolCalls += count;
    this.toolCallsThisTurn += count;
  }

  /**
   * 增加连续错误计数
   */
  incrementConsecutiveErrors(): void {
    this.consecutiveErrors++;
  }

  /**
   * 重置连续错误计数
   */
  resetConsecutiveErrors(): void {
    this.consecutiveErrors = 0;
  }

  /**
   * 设置取消标志
   */
  setCancelled(): void {
    this.transition("cancel");
  }
}
