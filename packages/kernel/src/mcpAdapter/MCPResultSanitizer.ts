/**
 * MCPResultSanitizer — 结果清理
 *
 * 规则：
 * - text → 直接返回
 * - JSON → 序列化返回
 * - binary/resource → 拒绝
 * - 超大内容 → 截断
 */

import type {
  MCPExecutionResult,
  MCPSanitizedResult,
  MCPError,
} from "./types.js";
import { DEFAULT_MCP_POLICY } from "./types.js";

export class MCPResultSanitizer {
  private maxResultBytes: number;

  constructor(maxResultBytes?: number) {
    this.maxResultBytes = maxResultBytes ?? DEFAULT_MCP_POLICY.maxResultBytes;
  }

  sanitize(result: MCPExecutionResult): MCPSanitizedResult {
    // 1. 错误情况
    if (!result.ok) {
      return {
        ok: false,
        content: JSON.stringify({
          error: result.error?.code,
          message: result.error?.message,
        }),
        contentType: "text",
        truncated: false,
        error: result.error,
      };
    }

    // 2. 检查内容类型
    const content = result.content;

    // null/undefined
    if (content == null) {
      return {
        ok: true,
        content: "",
        contentType: "text",
        truncated: false,
      };
    }

    // 文本内容
    if (typeof content === "string") {
      return this.sanitizeText(content);
    }

    // JSON 内容
    if (typeof content === "object") {
      return this.sanitizeJson(content);
    }

    // 其他类型 (number, boolean) → 转为字符串
    return this.sanitizeText(String(content));
  }

  // === Private ===

  private sanitizeText(text: string): MCPSanitizedResult {
    if (text.length <= this.maxResultBytes) {
      return {
        ok: true,
        content: text,
        contentType: "text",
        truncated: false,
      };
    }

    return {
      ok: true,
      content: text.slice(0, this.maxResultBytes) + "\n... [truncated]",
      contentType: "truncated",
      truncated: true,
    };
  }

  private sanitizeJson(obj: unknown): MCPSanitizedResult {
    try {
      const json = JSON.stringify(obj, null, 2);

      if (json.length <= this.maxResultBytes) {
        return {
          ok: true,
          content: json,
          contentType: "json",
          truncated: false,
          rawOutput: obj,
        };
      }

      return {
        ok: true,
        content: json.slice(0, this.maxResultBytes) + "\n... [truncated]",
        contentType: "truncated",
        truncated: true,
        rawOutput: obj,
      };
    } catch {
      // JSON 序列化失败
      return {
        ok: false,
        content: "Failed to serialize result",
        contentType: "unsupported",
        truncated: false,
        error: {
          code: "MCP_RESULT_UNSUPPORTED",
          message: "Failed to serialize result to JSON",
          recoverable: true,
        },
      };
    }
  }
}
