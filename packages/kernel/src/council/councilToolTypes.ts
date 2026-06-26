/**
 * Council Tool Integration Types
 *
 * 类型定义：让 Council 角色使用 Phase 1 工具能力
 */

import type { ToolManifest } from "../tools/ToolRuntimeTypes.js";
import type { AgentOrchestrator } from "../agentOrchestrator/AgentOrchestrator.js";
import type { AgentCompletionReason } from "../agentOrchestrator/types.js";

// === Council Tool Environment ===

export interface CouncilToolEnvironment {
  orchestrator: AgentOrchestrator;
  tools: ToolManifest[];
  getRoleToolPolicy?: (roleId: string) => RoleToolPolicy;
}

// === Role Tool Policy ===

export interface RoleToolPolicy {
  roleId: string;
  allowedToolNames: string[];
  maxToolCallsPerTurn?: number;
  maxTotalToolCalls?: number;
}

// === Role Tool Trace ===

export interface RoleToolTrace {
  roleId: string;
  calls: Array<{
    toolCallId: string;
    toolName: string;
    ok: boolean;
    errorCode?: string;
    resultBytes?: number;
  }>;
  completionReason?: AgentCompletionReason;
  turnsUsed?: number;
  totalToolCalls?: number;
}

// === Helpers ===

/**
 * 默认 role tool policy
 * 只允许 read-only 本地工具
 */
export function getDefaultRoleToolPolicy(roleId: string): RoleToolPolicy {
  return {
    roleId,
    allowedToolNames: [
      "document_analysis",
      "memory_search",
      "memory_get",
      "memory_related",
    ],
    maxToolCallsPerTurn: 3,
    maxTotalToolCalls: 10,
  };
}

/**
 * 按 role policy 过滤 tools
 */
export function filterToolsByPolicy(
  tools: ToolManifest[],
  policy: RoleToolPolicy
): ToolManifest[] {
  return tools.filter((t) => policy.allowedToolNames.includes(t.name));
}

/**
 * 解析 role tool policy
 */
export function resolveRoleToolPolicy(
  roleId: string,
  environment: CouncilToolEnvironment
): RoleToolPolicy {
  if (environment.getRoleToolPolicy) {
    return environment.getRoleToolPolicy(roleId);
  }
  return getDefaultRoleToolPolicy(roleId);
}
