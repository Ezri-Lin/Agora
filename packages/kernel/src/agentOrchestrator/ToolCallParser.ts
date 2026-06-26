/**
 * ToolCallParser — 从 LLM response 解析 tool calls
 *
 * 策略：
 * 1. 尝试 provider-native tool calls (OpenAI format)
 * 2. Text fallback 默认关闭，需要显式启用
 */

import type {
  ToolCall,
  ToolCallParserPolicy,
  LLMResponse,
} from "./types.js";
import { DEFAULT_PARSER_POLICY } from "./types.js";

export class ToolCallParser {
  private policy: ToolCallParserPolicy;

  constructor(policy?: Partial<ToolCallParserPolicy>) {
    this.policy = { ...DEFAULT_PARSER_POLICY, ...policy };
  }

  /**
   * 从 LLM response 解析 tool calls
   */
  parse(response: LLMResponse): ToolCall[] {
    const toolCalls: ToolCall[] = [];

    // 1. 尝试 provider-native tool calls
    if (response.toolCalls && response.toolCalls.length > 0) {
      for (const tc of response.toolCalls) {
        const validated = this.validateToolCall(tc);
        if (validated) {
          toolCalls.push(validated);
        }
      }
      return toolCalls;
    }

    // 2. Text fallback (默认关闭)
    if (this.policy.allowTextFallback && response.content) {
      const parsed = this.parseTextFallback(response.content);
      toolCalls.push(...parsed);
    }

    return toolCalls;
  }

  /**
   * 验证单个 tool call
   */
  private validateToolCall(tc: ToolCall): ToolCall | null {
    // 检查 tool name 在 allowlist 中
    if (
      this.policy.allowedToolNames.length > 0 &&
      !this.policy.allowedToolNames.includes(tc.name)
    ) {
      return null;
    }

    // 验证 args 大小
    const argsJson = JSON.stringify(tc.args ?? {});
    if (argsJson.length > this.policy.maxToolCallJsonBytes) {
      return null;
    }

    return {
      id: tc.id,
      name: tc.name,
      args: tc.args ?? {},
    };
  }

  /**
   * 从文本中解析 tool calls (fallback)
   *
   * 格式:
   * ```tool_call
   * {"name": "...", "args": {...}}
   * ```
   */
  private parseTextFallback(content: string): ToolCall[] {
    const toolCalls: ToolCall[] = [];
    const pattern = /```tool_call\s*\n([\s\S]*?)```/g;
    let match;

    while ((match = pattern.exec(content)) !== null) {
      try {
        const json = match[1].trim();
        if (json.length > this.policy.maxToolCallJsonBytes) {
          continue;
        }

        const parsed = JSON.parse(json);

        // 验证结构
        if (!parsed.name || typeof parsed.name !== "string") {
          continue;
        }

        // 检查 allowlist
        if (
          this.policy.allowedToolNames.length > 0 &&
          !this.policy.allowedToolNames.includes(parsed.name)
        ) {
          continue;
        }

        toolCalls.push({
          id: parsed.id ?? `text-${Date.now()}-${toolCalls.length}`,
          name: parsed.name,
          args: parsed.args ?? {},
        });
      } catch {
        // JSON 解析失败，跳过
        continue;
      }
    }

    return toolCalls;
  }
}
