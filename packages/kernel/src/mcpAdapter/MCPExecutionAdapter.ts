/**
 * MCPExecutionAdapter — 执行适配
 *
 * 执行路径: Orchestrator → Coordinator → Runtime → MCPExecutionAdapter → Client
 * 二次校验: 执行前确认 registration + allowlist
 */

import type { ToolExecutor } from "../tools/ToolRuntimeTypes.js";
import type {
  MCPClientResolver,
  MCPToolMappingStore,
  MCPSanitizedResult,
  MCPError,
} from "./types.js";
import { parseManifestName } from "./types.js";
import type { MCPResultSanitizer } from "./MCPResultSanitizer.js";

export class MCPExecutionAdapter {
  constructor(
    private clientResolver: MCPClientResolver,
    private sanitizer: MCPResultSanitizer,
    private mappings: MCPToolMappingStore
  ) {}

  /**
   * 创建 ToolExecutor
   */
  createExecutor(manifestName: string): ToolExecutor {
    return async (args: unknown): Promise<MCPSanitizedResult> => {
      // 1. 从 mappings 获取映射
      const mapping = this.mappings.getMapping(manifestName);
      if (!mapping) {
        return this.createErrorResult(
          "MCP_TOOL_NOT_FOUND",
          `MCP tool not registered: ${manifestName}`
        );
      }

      // 2. 二次校验 allowlist
      if (!this.mappings.isAllowed(mapping.serverId, mapping.originalToolName)) {
        return this.createErrorResult(
          "MCP_TOOL_NOT_ALLOWED",
          `MCP tool no longer allowed: ${manifestName}`
        );
      }

      // 3. 获取 client
      const client = this.clientResolver.getClient(mapping.serverId);
      if (!client) {
        return this.createErrorResult(
          "MCP_SERVER_NOT_FOUND",
          `MCP server not found: ${mapping.serverId}`
        );
      }

      // 4. 确保连接
      if (!client.isConnected()) {
        try {
          await client.connect();
        } catch (error) {
          return this.createErrorResult(
            "MCP_CONNECTION_FAILED",
            `Failed to connect to MCP server: ${error instanceof Error ? error.message : "Unknown error"}`
          );
        }
      }

      // 5. 执行
      try {
        const result = await client.callTool(
          mapping.originalToolName,
          (args as Record<string, unknown>) ?? {}
        );

        // 6. 清理结果
        return this.sanitizer.sanitize(result);
      } catch (error) {
        return this.createErrorResult(
          "MCP_EXECUTION_FAILED",
          `Tool execution failed: ${error instanceof Error ? error.message : "Unknown error"}`
        );
      }
    };
  }

  // === Private ===

  private createErrorResult(
    code: MCPError["code"],
    message: string
  ): MCPSanitizedResult {
    return {
      ok: false,
      content: JSON.stringify({ error: code, message }),
      contentType: "text",
      truncated: false,
      error: {
        code,
        message,
        recoverable: true,
      },
    };
  }
}
