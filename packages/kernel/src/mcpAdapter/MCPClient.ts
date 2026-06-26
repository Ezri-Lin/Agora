/**
 * MCPClient — MCP server 连接抽象
 *
 * v0 只支持 sse / streamable-http
 * 不支持 stdio (defer to v1)
 */

import type {
  MCPServerConfig,
  MCPTool,
  MCPExecutionResult,
  MCPError,
  MCPClientInterface,
} from "./types.js";
import { redactServerConfig } from "./types.js";

// === MCP Client Interface ===

export type MCPClient = MCPClientInterface;

// === Remote MCP Client ===

export class RemoteMCPClient implements MCPClient {
  private connected = false;
  private config: MCPServerConfig;

  constructor(config: MCPServerConfig) {
    // v0 只支持 sse / streamable-http (类型已限制)
    this.config = config;
  }

  async connect(): Promise<void> {
    if (this.connected) return;

    try {
      // v0: 简化连接验证
      // 实际 MCP 协议握手会在 callTool 时进行
      // 这里只验证 URL 可达
      const response = await fetch(this.config.url, {
        method: "HEAD",
        signal: AbortSignal.timeout(5000),
      });

      if (!response.ok && response.status !== 405) {
        throw this.createError(
          "MCP_CONNECTION_FAILED",
          `Failed to connect to MCP server: ${response.status}`
        );
      }

      this.connected = true;
    } catch (error) {
      if (error instanceof Error && error.name === "TimeoutError") {
        throw this.createError(
          "MCP_CONNECTION_FAILED",
          "Connection timeout"
        );
      }
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    this.connected = false;
  }

  async listTools(): Promise<MCPTool[]> {
    this.ensureConnected();

    try {
      const response = await this.sendRequest("tools/list", {});
      return (response as { tools: MCPTool[] }).tools ?? [];
    } catch (error) {
      throw this.createError(
        "MCP_EXECUTION_FAILED",
        `Failed to list tools: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  async callTool(
    name: string,
    args: Record<string, unknown>
  ): Promise<MCPExecutionResult> {
    this.ensureConnected();

    try {
      const response = await this.sendRequest("tools/call", {
        name,
        arguments: args,
      });

      return {
        ok: true,
        content: response,
      };
    } catch (error) {
      return {
        ok: false,
        error: this.createError(
          "MCP_EXECUTION_FAILED",
          `Tool execution failed: ${error instanceof Error ? error.message : "Unknown error"}`
        ),
      };
    }
  }

  isConnected(): boolean {
    return this.connected;
  }

  getServerId(): string {
    return this.config.id;
  }

  getConfig(): MCPServerConfig {
    return this.config;
  }

  getRedactedConfig() {
    return redactServerConfig(this.config);
  }

  // === Private ===

  private ensureConnected(): void {
    if (!this.connected) {
      throw this.createError(
        "MCP_CONNECTION_FAILED",
        "Not connected to MCP server"
      );
    }
  }

  private async sendRequest(
    method: string,
    params: unknown
  ): Promise<unknown> {
    const url = `${this.config.url}/${method}`;

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    // 添加 env 中的认证头 (如果存在)
    if (this.config.env) {
      for (const [key, value] of Object.entries(this.config.env)) {
        if (key.startsWith("HEADER_")) {
          const headerName = key.slice(7).replace(/_/g, "-");
          headers[headerName] = value;
        }
      }
    }

    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: Date.now(),
        method,
        params,
      }),
      signal: AbortSignal.timeout(30000),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = (await response.json()) as {
      result?: unknown;
      error?: { code: number; message: string };
    };

    if (data.error) {
      throw new Error(`MCP error ${data.error.code}: ${data.error.message}`);
    }

    return data.result;
  }

  private createError(
    code: MCPError["code"],
    message: string
  ): MCPError {
    return {
      code,
      message,
      recoverable: true,
      details: {
        serverId: this.config.id,
        // 不包含 env/secrets
      },
    };
  }
}
