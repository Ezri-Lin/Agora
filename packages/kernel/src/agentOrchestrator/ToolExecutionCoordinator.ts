/**
 * ToolExecutionCoordinator — 验证 + 执行 tool calls
 *
 * 验证顺序:
 * 1. manifest exists
 * 2. allowlist
 * 3. risk/sideEffects
 * 4. args size
 * 5. args schema (v0: required fields check)
 * 6. createPlan
 * 7. invoke
 * 8. bounded serialize result
 */

import type { ToolRuntime, ToolManifest } from "../tools/ToolRuntimeTypes.js";
import type {
  ToolCall,
  ToolResultMessage,
  ToolExecutionPolicy,
  ToolValidationResult,
  AgentError,
} from "./types.js";
import { DEFAULT_TOOL_EXECUTION_POLICY } from "./types.js";

export class ToolExecutionCoordinator {
  private manifests: Map<string, ToolManifest> = new Map();

  constructor(
    private runtime: ToolRuntime,
    private policy: ToolExecutionPolicy = DEFAULT_TOOL_EXECUTION_POLICY
  ) {}

  /**
   * 注册可用的 tool manifests
   */
  setManifests(manifests: ToolManifest[]): void {
    this.manifests.clear();
    for (const manifest of manifests) {
      this.manifests.set(manifest.name, manifest);
    }
  }

  /**
   * 验证 tool call 是否允许
   */
  validate(toolCall: ToolCall): ToolValidationResult {
    // 1. manifest exists
    const manifest = this.manifests.get(toolCall.name);
    if (!manifest) {
      return {
        valid: false,
        error: {
          code: "TOOL_NOT_FOUND",
          message: `Tool not found: ${toolCall.name}`,
          recoverable: true,
        },
      };
    }

    // 2. allowlist
    if (
      this.policy.allowedToolNames.length > 0 &&
      !this.policy.allowedToolNames.includes(toolCall.name)
    ) {
      return {
        valid: false,
        error: {
          code: "TOOL_NOT_ALLOWED",
          message: `Tool not in allowlist: ${toolCall.name}`,
          recoverable: true,
        },
      };
    }

    // 3. risk/sideEffects
    if (manifest.riskLevel !== "read_only") {
      return {
        valid: false,
        error: {
          code: "TOOL_RISK_NOT_ALLOWED",
          message: `Tool risk level not allowed: ${manifest.riskLevel}`,
          recoverable: true,
        },
      };
    }

    if (manifest.sideEffects.length > 0) {
      return {
        valid: false,
        error: {
          code: "TOOL_RISK_NOT_ALLOWED",
          message: `Tool has side effects: ${manifest.sideEffects.join(", ")}`,
          recoverable: true,
        },
      };
    }

    // 4. args size
    const argsJson = JSON.stringify(toolCall.args ?? {});
    if (argsJson.length > this.policy.maxArgsBytes) {
      return {
        valid: false,
        error: {
          code: "TOOL_SCHEMA_VALIDATION_FAILED",
          message: `Tool args too large: ${argsJson.length} > ${this.policy.maxArgsBytes}`,
          recoverable: true,
        },
      };
    }

    // 5. args schema (v0: basic validation)
    const schemaValidation = this.validateArgsSchema(
      toolCall.args,
      manifest.inputSchema
    );
    if (!schemaValidation.valid) {
      return schemaValidation;
    }

    return { valid: true };
  }

  /**
   * 执行单个 tool call
   */
  async execute(
    toolCall: ToolCall,
    signal?: AbortSignal
  ): Promise<ToolResultMessage> {
    // 验证
    const validation = this.validate(toolCall);
    if (!validation.valid) {
      return {
        role: "tool",
        toolCallId: toolCall.id,
        toolName: toolCall.name,
        ok: false,
        content: JSON.stringify({
          error: validation.error.code,
          message: validation.error.message,
        }),
        error: validation.error,
      };
    }

    try {
      // 创建执行计划
      const plan = this.runtime.createPlan({
        toolName: toolCall.name,
        args: toolCall.args,
        reason: "agent_orchestrator",
        requestedBy: { type: "assistant" },
      });

      // 执行
      const result = await this.runtime.invoke(plan);

      // 序列化结果
      const content = this.serializeResult(result.output);

      return {
        role: "tool",
        toolCallId: toolCall.id,
        toolName: toolCall.name,
        ok: result.status === "executed",
        content,
        rawOutput: result.output,
        error:
          result.status === "failed"
            ? {
                code: "TOOL_EXECUTION_FAILED",
                message: result.error ?? "Unknown error",
                recoverable: true,
              }
            : undefined,
      };
    } catch (error) {
      return {
        role: "tool",
        toolCallId: toolCall.id,
        toolName: toolCall.name,
        ok: false,
        content: JSON.stringify({
          error: "TOOL_EXECUTION_FAILED",
          message: error instanceof Error ? error.message : "Unknown error",
        }),
        error: {
          code: "TOOL_EXECUTION_FAILED",
          message: error instanceof Error ? error.message : "Unknown error",
          recoverable: true,
        },
      };
    }
  }

  /**
   * 并行执行多个 tool calls (保持顺序)
   */
  async executeParallel(
    toolCalls: ToolCall[],
    signal?: AbortSignal
  ): Promise<ToolResultMessage[]> {
    // 检查数量限制 (maxToolCallsPerTurn 来自 StopPolicy，这里用 maxResultBytes 作为代理)
    // 实际限制由 StopConditionEvaluator 和 AgentOrchestrator 在执行前检查
    const maxParallel = 10; // v0 硬编码并行上限
    if (toolCalls.length > maxParallel) {
      const error: AgentError = {
        code: "MAX_TOOL_CALLS_PER_TURN_EXCEEDED",
        message: `Too many tool calls: ${toolCalls.length} > ${maxParallel}`,
        recoverable: false,
      };
      return toolCalls.map((tc) => ({
        role: "tool" as const,
        toolCallId: tc.id,
        toolName: tc.name,
        ok: false,
        content: JSON.stringify({ error: error.code, message: error.message }),
        error,
      }));
    }

    // 并行执行，保持顺序
    const results = await Promise.all(
      toolCalls.map(async (tc, index) => ({
        index,
        result: await this.execute(tc, signal),
      }))
    );

    return results.sort((a, b) => a.index - b.index).map((r) => r.result);
  }

  // === Private ===

  private serializeResult(output: unknown): string {
    try {
      const json = JSON.stringify(output, null, 2);
      if (json.length > this.policy.maxResultBytes) {
        // Truncate
        return json.slice(0, this.policy.maxResultBytes) + "\n... [truncated]";
      }
      return json;
    } catch {
      return String(output).slice(0, this.policy.maxResultBytes);
    }
  }

  private validateArgsSchema(
    args: Record<string, unknown>,
    schema: unknown
  ): ToolValidationResult {
    // v0: 基础验证 - 检查 required fields
    if (!schema || typeof schema !== "object") {
      return { valid: true };
    }

    const schemaObj = schema as Record<string, unknown>;
    const required = schemaObj.required as string[] | undefined;

    if (required && Array.isArray(required)) {
      for (const field of required) {
        if (args[field] === undefined || args[field] === null) {
          return {
            valid: false,
            error: {
              code: "TOOL_SCHEMA_VALIDATION_FAILED",
              message: `Missing required field: ${field}`,
              recoverable: true,
            },
          };
        }
      }
    }

    return { valid: true };
  }
}
