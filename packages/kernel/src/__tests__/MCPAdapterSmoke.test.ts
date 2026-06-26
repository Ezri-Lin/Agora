/**
 * MCP Adapter Smoke Test
 *
 * 使用 fake MCP server 验证完整流程:
 * discovery → normalize → register → orchestrator allowlist → execute → sanitized result
 */

import { describe, it, expect, vi } from "vitest";
import { MCPToolDiscovery } from "../mcpAdapter/MCPToolDiscovery.js";
import { MCPManifestNormalizer } from "../mcpAdapter/MCPManifestNormalizer.js";
import { MCPPolicyMapper } from "../mcpAdapter/MCPPolicyMapper.js";
import { MCPResultSanitizer } from "../mcpAdapter/MCPResultSanitizer.js";
import { MCPAdapterRegistry } from "../mcpAdapter/MCPAdapterRegistry.js";
import { MCPExecutionAdapter } from "../mcpAdapter/MCPExecutionAdapter.js";
import type {
  MCPClientInterface,
  MCPTool,
  MCPServerConfig,
  MCPToolRegistrationPolicy,
} from "../mcpAdapter/types.js";
import type { ToolRuntime } from "../tools/ToolRuntimeTypes.js";

// === Fake MCP Client ===

class FakeMCPClient implements MCPClientInterface {
  private connected = false;
  private tools: MCPTool[];

  constructor(
    private serverId: string,
    tools: MCPTool[]
  ) {
    this.tools = tools;
  }

  async connect(): Promise<void> {
    this.connected = true;
  }

  async disconnect(): Promise<void> {
    this.connected = false;
  }

  async listTools(): Promise<MCPTool[]> {
    return this.tools;
  }

  async callTool(
    name: string,
    args: Record<string, unknown>
  ): Promise<{ ok: boolean; content?: unknown; error?: any }> {
    const tool = this.tools.find((t) => t.name === name);
    if (!tool) {
      return {
        ok: false,
        error: { code: "MCP_TOOL_NOT_FOUND", message: `Tool not found: ${name}`, recoverable: true },
      };
    }

    // 模拟返回结果
    return {
      ok: true,
      content: { result: `Executed ${name} with args: ${JSON.stringify(args)}` },
    };
  }

  isConnected(): boolean {
    return this.connected;
  }

  getServerId(): string {
    return this.serverId;
  }
}

// === Smoke Tests ===

describe("MCP Adapter Smoke", () => {
  it("should complete full discovery → normalize → register → execute flow", async () => {
    // 1. 创建 fake MCP client
    const fakeTools: MCPTool[] = [
      {
        name: "search",
        description: "Search the knowledge base",
        annotations: { readOnlyHint: true },
        inputSchema: {
          type: "object",
          properties: { query: { type: "string" } },
          required: ["query"],
        },
      },
      {
        name: "write",
        description: "Write to database",
        annotations: { destructiveHint: true },
      },
      {
        name: "web_fetch",
        description: "Fetch web content",
        annotations: { readOnlyHint: true, openWorld: true },
      },
    ];

    const client = new FakeMCPClient("kb-server", fakeTools);
    await client.connect();

    // 2. 发现工具
    const discovery = new MCPToolDiscovery();
    const snapshot = await discovery.discover(client);

    expect(snapshot.serverId).toBe("kb-server");
    expect(snapshot.discoveredTools).toHaveLength(3);

    // 3. 验证 risk 评估
    // search: readOnlyHint=true → 应该被注册
    const searchDenied = snapshot.deniedTools.find((d) => d.toolName === "search");
    expect(searchDenied).toBeUndefined();

    // write: destructiveHint=true → 应该被拒绝
    const writeDenied = snapshot.deniedTools.find((d) => d.toolName === "write");
    expect(writeDenied).toBeDefined();
    // Policy mapper 检查 readOnlyHint 先于 destructiveHint
    expect(writeDenied!.reason).toContain("readOnlyHint");

    // web_fetch: openWorld=true → 应该被拒绝
    const webDenied = snapshot.deniedTools.find((d) => d.toolName === "web_fetch");
    expect(webDenied).toBeDefined();
    // Policy mapper 检查 readOnlyHint 先于 openWorld
    expect(webDenied!.reason).toContain("openWorld");

    // 4. 验证注册列表
    expect(snapshot.registeredTools).toHaveLength(1);
    expect(snapshot.registeredTools[0].manifestName).toBe("mcp__kb_server__search");
    expect(snapshot.registeredTools[0].manifest.riskLevel).toBe("read_only");
  });

  it("should deny tool without readOnlyHint", async () => {
    const fakeTools: MCPTool[] = [
      {
        name: "mystery_tool",
        description: "Unknown tool",
        // 没有 annotations
      },
    ];

    const client = new FakeMCPClient("server", fakeTools);
    await client.connect();

    const discovery = new MCPToolDiscovery();
    const snapshot = await discovery.discover(client);

    expect(snapshot.registeredTools).toHaveLength(0);
    expect(snapshot.deniedTools).toHaveLength(1);
    expect(snapshot.deniedTools[0].reason).toContain("readOnlyHint not set");
  });

  it("should namespace tool names correctly", async () => {
    const fakeTools: MCPTool[] = [
      {
        name: "search",
        annotations: { readOnlyHint: true },
      },
    ];

    const client1 = new FakeMCPClient("server-a", fakeTools);
    const client2 = new FakeMCPClient("server-b", fakeTools);

    await client1.connect();
    await client2.connect();

    const discovery = new MCPToolDiscovery();

    const snapshot1 = await discovery.discover(client1);
    const snapshot2 = await discovery.discover(client2);

    // 两个 server 的同名 tool 应该有不同的 manifestName
    expect(snapshot1.registeredTools[0].manifestName).toBe("mcp__server_a__search");
    expect(snapshot2.registeredTools[0].manifestName).toBe("mcp__server_b__search");
    expect(snapshot1.registeredTools[0].manifestName).not.toBe(
      snapshot2.registeredTools[0].manifestName
    );
  });

  it("should sanitize MCP results correctly", () => {
    const sanitizer = new MCPResultSanitizer(1024);

    // 文本结果
    const textResult = sanitizer.sanitize({
      ok: true,
      content: "Hello, world!",
    });
    expect(textResult.ok).toBe(true);
    expect(textResult.contentType).toBe("text");

    // JSON 结果
    const jsonResult = sanitizer.sanitize({
      ok: true,
      content: { key: "value", count: 42 },
    });
    expect(jsonResult.ok).toBe(true);
    expect(jsonResult.contentType).toBe("json");

    // 错误结果
    const errorResult = sanitizer.sanitize({
      ok: false,
      error: { code: "MCP_EXECUTION_FAILED", message: "Failed", recoverable: true },
    });
    expect(errorResult.ok).toBe(false);
  });

  it("should enforce allowlist through registry", async () => {
    const fakeTools: MCPTool[] = [
      {
        name: "allowed_tool",
        annotations: { readOnlyHint: true },
      },
      {
        name: "not_allowed_tool",
        annotations: { readOnlyHint: true },
      },
    ];

    const client = new FakeMCPClient("server", fakeTools);
    await client.connect();

    // 只允许 allowed_tool
    const policy: MCPToolRegistrationPolicy = {
      allowedTools: [{ serverId: "server", toolName: "allowed_tool" }],
      allowReadOnlyOnly: true,
      maxResultBytes: 65536,
      maxSchemaBytes: 32768,
    };

    const mockRuntime: ToolRuntime = {
      register: vi.fn(),
      createPlan: vi.fn().mockReturnValue({ id: "plan-1" }),
      invoke: vi.fn(),
      getAuditLog: vi.fn().mockResolvedValue([]),
    };

    const registry = new MCPAdapterRegistry(
      mockRuntime,
      policy,
      { getClient: () => client }
    );

    const snapshot = await registry.discoverAndRegister(client);

    // Discovery 返回所有通过 policy 的 tools
    expect(snapshot.registeredTools).toHaveLength(2);

    // 但只有 allowlist 中的 tool 被注册到 runtime
    expect(mockRuntime.register).toHaveBeenCalledTimes(1);

    // 验证注册的是 allowed_tool
    const registeredCall = (mockRuntime.register as any).mock.calls[0];
    expect(registeredCall[0].name).toBe("mcp__server__allowed_tool");
  });
});
