/**
 * ToolRuntimeTypes — Tool Runtime Foundation v0.1 类型定义
 *
 * 设计原则：
 * - read-only minimal runtime
 * - permission-first
 * - audit-required
 * - no terminal/browser/MCP in v0.1
 */

// === Risk Level ===

export type ToolRiskLevel =
  | "read_only"
  | "low"
  | "medium"
  | "high";

// === Side Effects ===

export type ToolSideEffect =
  | "none"
  | "network_request"
  | "read_local_file"
  | "write_local_file"
  | "execute_command"
  | "external_api_write";

// === Tool Manifest ===

export interface ToolManifest {
  /** 工具名称（唯一标识） */
  name: string;
  /** 工具描述 */
  description: string;
  /** 风险等级 */
  riskLevel: ToolRiskLevel;
  /** 副作用列表 */
  sideEffects: ToolSideEffect[];
  /** 是否需要审批 */
  requiresApproval: boolean;
  /** 输入 schema */
  inputSchema: unknown;
  /** 输出 schema（可选） */
  outputSchema?: unknown;
}

// === Tool Invocation Plan ===

export interface ToolInvocationPlan {
  /** 调用 ID */
  id: string;
  /** 工具名称 */
  toolName: string;
  /** 调用参数 */
  args: unknown;
  /** 风险等级 */
  riskLevel: ToolRiskLevel;
  /** 副作用列表 */
  sideEffects: ToolSideEffect[];
  /** 是否需要审批 */
  requiresApproval: boolean;
  /** 调用原因 */
  reason: string;
  /** 请求者 */
  requestedBy: ToolRequester;
  /** 创建时间 */
  createdAt: string;
}

export type ToolRequester =
  | { type: "assistant" }
  | { type: "moderator"; roleId: string }
  | { type: "system" };

// === Permission Decision ===

export interface ToolPermissionDecision {
  /** 是否允许 */
  allowed: boolean;
  /** 是否需要审批 */
  requiresApproval: boolean;
  /** 决策原因 */
  reason: string;
}

// === Tool Invocation Result ===

export interface ToolInvocationResult {
  /** 调用 ID */
  invocationId: string;
  /** 工具名称 */
  toolName: string;
  /** 执行状态 */
  status: ToolInvocationStatus;
  /** 输出数据 */
  output?: unknown;
  /** 错误信息 */
  error?: string;
  /** 执行时间 */
  executedAt?: string;
  /** 审计事件 ID */
  auditEventId?: string;
}

export type ToolInvocationStatus =
  | "planned"
  | "allowed"
  | "denied"
  | "blocked_approval_required"
  | "executed"
  | "failed";

// === Audit Event ===

export interface ToolAuditEvent {
  /** 事件 ID */
  id: string;
  /** 调用 ID */
  invocationId: string;
  /** 工具名称 */
  toolName: string;
  /** 状态 */
  status: ToolInvocationStatus;
  /** 风险等级 */
  riskLevel: ToolRiskLevel;
  /** 副作用 */
  sideEffects: ToolSideEffect[];
  /** 原因 */
  reason?: string;
  /** 创建时间 */
  createdAt: string;
}

// === Tool Executor ===

export type ToolExecutor = (
  args: unknown
) => Promise<unknown>;

// === Tool Runtime Interface ===

export interface ToolRuntime {
  /** 注册工具 */
  register(manifest: ToolManifest, executor: ToolExecutor): void;

  /** 创建调用计划 */
  createPlan(input: {
    toolName: string;
    args: unknown;
    reason: string;
    requestedBy: ToolRequester;
  }): ToolInvocationPlan;

  /** 执行调用 */
  invoke(plan: ToolInvocationPlan): Promise<ToolInvocationResult>;

  /** 获取审计日志 */
  getAuditLog(invocationId?: string): Promise<ToolAuditEvent[]>;
}
