/**
 * StopConditionEvaluator — 评估停止条件
 *
 * 使用完整 loop context，不只看 tool results
 */

import type {
  StopPolicy,
  StopEvaluationContext,
  StopDecision,
} from "./types.js";
import { DEFAULT_STOP_POLICY } from "./types.js";

export class StopConditionEvaluator {
  private policy: StopPolicy;

  constructor(policy?: Partial<StopPolicy>) {
    this.policy = { ...DEFAULT_STOP_POLICY, ...policy };
  }

  /**
   * 评估是否应该停止
   */
  shouldStop(ctx: StopEvaluationContext): StopDecision {
    // 1. cancelled
    if (ctx.cancelled) {
      return {
        shouldStop: true,
        reason: "cancelled",
        message: "Execution cancelled by user",
      };
    }

    // 2. timeout
    const elapsed = Date.now() - ctx.startedAt;
    if (elapsed >= this.policy.timeoutMs) {
      return {
        shouldStop: true,
        reason: "timeout",
        message: `Timeout exceeded: ${elapsed}ms >= ${this.policy.timeoutMs}ms`,
      };
    }

    // 3. maxTurns
    if (ctx.turnsUsed >= this.policy.maxTurns) {
      return {
        shouldStop: true,
        reason: "max_turns",
        message: `Max turns exceeded: ${ctx.turnsUsed} >= ${this.policy.maxTurns}`,
      };
    }

    // 4. maxTotalToolCalls
    if (ctx.totalToolCalls >= this.policy.maxTotalToolCalls) {
      return {
        shouldStop: true,
        reason: "max_tool_calls",
        message: `Max total tool calls exceeded: ${ctx.totalToolCalls} >= ${this.policy.maxTotalToolCalls}`,
      };
    }

    // 5. maxToolCallsPerTurn (检查本轮)
    if (ctx.toolCallsThisTurn > this.policy.maxToolCallsPerTurn) {
      return {
        shouldStop: true,
        reason: "max_tool_calls_per_turn",
        message: `Max tool calls per turn exceeded: ${ctx.toolCallsThisTurn} > ${this.policy.maxToolCallsPerTurn}`,
      };
    }

    // 6. consecutiveErrors
    if (ctx.consecutiveErrors >= this.policy.maxConsecutiveErrors) {
      return {
        shouldStop: true,
        reason: "error",
        message: `Consecutive errors exceeded: ${ctx.consecutiveErrors} >= ${this.policy.maxConsecutiveErrors}`,
      };
    }

    // 7. 检查 tool results 中的错误
    if (ctx.lastToolResults) {
      const failedCount = ctx.lastToolResults.filter((r) => !r.ok).length;
      if (failedCount === ctx.lastToolResults.length && failedCount > 0) {
        // 所有 tool calls 都失败
        return {
          shouldStop: true,
          reason: "error",
          message: `All ${failedCount} tool calls failed in this turn`,
        };
      }
    }

    // 不停止
    return { shouldStop: false };
  }
}
