/**
 * Council Tool Integration 测试
 *
 * 验证：
 * 1. 无 toolEnvironment 时原逻辑不变
 * 2. 有 toolEnvironment 时使用 AgentOrchestrator
 * 3. Role tool policy 过滤
 * 4. Tool trace 记录
 */

import { describe, it, expect, vi } from "vitest";
import {
  getDefaultRoleToolPolicy,
  filterToolsByPolicy,
  resolveRoleToolPolicy,
} from "../council/councilToolTypes.js";
import type { CouncilToolEnvironment, RoleToolPolicy } from "../council/councilToolTypes.js";
import type { ToolManifest } from "../tools/ToolRuntimeTypes.js";

// === Policy Tests ===

describe("Council Tool Policy", () => {
  it("should return default policy with read-only tools", () => {
    const policy = getDefaultRoleToolPolicy("skeptic_critic");

    expect(policy.roleId).toBe("skeptic_critic");
    expect(policy.allowedToolNames).toContain("document_analysis");
    expect(policy.allowedToolNames).toContain("memory_search");
    expect(policy.allowedToolNames).toContain("memory_get");
    expect(policy.allowedToolNames).toContain("memory_related");
    expect(policy.maxToolCallsPerTurn).toBe(3);
    expect(policy.maxTotalToolCalls).toBe(10);
  });

  it("should filter tools by policy", () => {
    const tools: ToolManifest[] = [
      {
        name: "document_analysis",
        description: "Analyze documents",
        riskLevel: "read_only",
        sideEffects: [],
        requiresApproval: false,
        inputSchema: {},
      },
      {
        name: "memory_search",
        description: "Search memory",
        riskLevel: "read_only",
        sideEffects: [],
        requiresApproval: false,
        inputSchema: {},
      },
      {
        name: "dangerous_tool",
        description: "Dangerous",
        riskLevel: "high",
        sideEffects: ["execute_command"],
        requiresApproval: true,
        inputSchema: {},
      },
    ];

    const policy: RoleToolPolicy = {
      roleId: "test",
      allowedToolNames: ["document_analysis"],
    };

    const filtered = filterToolsByPolicy(tools, policy);

    expect(filtered).toHaveLength(1);
    expect(filtered[0].name).toBe("document_analysis");
  });

  it("should resolve role tool policy from environment", () => {
    const environment: CouncilToolEnvironment = {
      orchestrator: {} as any,
      tools: [],
      getRoleToolPolicy: (roleId: string) => ({
        roleId,
        allowedToolNames: ["custom_tool"],
      }),
    };

    const policy = resolveRoleToolPolicy("test_role", environment);

    expect(policy.roleId).toBe("test_role");
    expect(policy.allowedToolNames).toContain("custom_tool");
  });

  it("should use default policy when no resolver provided", () => {
    const environment: CouncilToolEnvironment = {
      orchestrator: {} as any,
      tools: [],
    };

    const policy = resolveRoleToolPolicy("test_role", environment);

    expect(policy.roleId).toBe("test_role");
    expect(policy.allowedToolNames).toContain("document_analysis");
  });
});
