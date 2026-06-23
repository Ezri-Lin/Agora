/**
 * LocalToolRuntime — Tool Runtime 实现
 *
 * 设计原则：
 * - permission-first
 * - audit-required
 * - read-only minimal runtime in v0.1
 */

import type {
  ToolRuntime,
  ToolManifest,
  ToolExecutor,
  ToolInvocationPlan,
  ToolInvocationResult,
  ToolAuditEvent,
  ToolRequester,
} from "./ToolRuntimeTypes.js";
import { ToolPermissionPolicy } from "./ToolPermissionPolicy.js";
import { ToolAuditLog } from "./ToolAuditLog.js";

// === LocalToolRuntime ===

export class LocalToolRuntime implements ToolRuntime {
  private manifests: Map<string, ToolManifest> = new Map();
  private executors: Map<string, ToolExecutor> = new Map();
  private policy: ToolPermissionPolicy;
  private auditLog: ToolAuditLog;

  constructor(workspaceRoot: string) {
    this.policy = new ToolPermissionPolicy();
    this.auditLog = new ToolAuditLog(workspaceRoot);
  }

  /**
   * 注册工具
   */
  register(manifest: ToolManifest, executor: ToolExecutor): void {
    this.manifests.set(manifest.name, manifest);
    this.executors.set(manifest.name, executor);
  }

  /**
   * 创建调用计划
   */
  createPlan(input: {
    toolName: string;
    args: unknown;
    reason: string;
    requestedBy: ToolRequester;
  }): ToolInvocationPlan {
    const manifest = this.manifests.get(input.toolName);

    return {
      id: `plan-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      toolName: input.toolName,
      args: input.args,
      riskLevel: manifest?.riskLevel || "high",
      sideEffects: manifest?.sideEffects || [],
      requiresApproval: manifest?.requiresApproval ?? true,
      reason: input.reason,
      requestedBy: input.requestedBy,
      createdAt: new Date().toISOString(),
    };
  }

  /**
   * 执行调用
   */
  async invoke(plan: ToolInvocationPlan): Promise<ToolInvocationResult> {
    const manifest = this.manifests.get(plan.toolName);

    // Evaluate permission
    const decision = this.policy.evaluate(plan, manifest);

    // Create audit event for planned invocation
    const plannedEvent = this.auditLog.createEvent({
      invocationId: plan.id,
      toolName: plan.toolName,
      status: "planned",
      riskLevel: plan.riskLevel,
      sideEffects: plan.sideEffects,
      reason: plan.reason,
    });
    await this.auditLog.append(plannedEvent);

    // If denied
    if (!decision.allowed) {
      const deniedEvent = this.auditLog.createEvent({
        invocationId: plan.id,
        toolName: plan.toolName,
        status: "denied",
        riskLevel: plan.riskLevel,
        sideEffects: plan.sideEffects,
        reason: decision.reason,
      });
      await this.auditLog.append(deniedEvent);

      return {
        invocationId: plan.id,
        toolName: plan.toolName,
        status: "denied",
        error: decision.reason,
        auditEventId: deniedEvent.id,
      };
    }

    // If requires approval
    if (decision.requiresApproval) {
      const blockedEvent = this.auditLog.createEvent({
        invocationId: plan.id,
        toolName: plan.toolName,
        status: "blocked_approval_required",
        riskLevel: plan.riskLevel,
        sideEffects: plan.sideEffects,
        reason: decision.reason,
      });
      await this.auditLog.append(blockedEvent);

      return {
        invocationId: plan.id,
        toolName: plan.toolName,
        status: "blocked_approval_required",
        error: "Approval required",
        auditEventId: blockedEvent.id,
      };
    }

    // Execute tool
    const executor = this.executors.get(plan.toolName);
    if (!executor) {
      const failedEvent = this.auditLog.createEvent({
        invocationId: plan.id,
        toolName: plan.toolName,
        status: "failed",
        riskLevel: plan.riskLevel,
        sideEffects: plan.sideEffects,
        reason: "No executor registered",
      });
      await this.auditLog.append(failedEvent);

      return {
        invocationId: plan.id,
        toolName: plan.toolName,
        status: "failed",
        error: "No executor registered",
        auditEventId: failedEvent.id,
      };
    }

    try {
      const output = await executor(plan.args);

      // Audit success
      const executedEvent = this.auditLog.createEvent({
        invocationId: plan.id,
        toolName: plan.toolName,
        status: "executed",
        riskLevel: plan.riskLevel,
        sideEffects: plan.sideEffects,
        reason: "Execution successful",
      });
      await this.auditLog.append(executedEvent);

      return {
        invocationId: plan.id,
        toolName: plan.toolName,
        status: "executed",
        output,
        executedAt: new Date().toISOString(),
        auditEventId: executedEvent.id,
      };
    } catch (error) {
      // Audit failure
      const failedEvent = this.auditLog.createEvent({
        invocationId: plan.id,
        toolName: plan.toolName,
        status: "failed",
        riskLevel: plan.riskLevel,
        sideEffects: plan.sideEffects,
        reason: error instanceof Error ? error.message : String(error),
      });
      await this.auditLog.append(failedEvent);

      return {
        invocationId: plan.id,
        toolName: plan.toolName,
        status: "failed",
        error: error instanceof Error ? error.message : String(error),
        auditEventId: failedEvent.id,
      };
    }
  }

  /**
   * 获取审计日志
   */
  async getAuditLog(invocationId?: string): Promise<ToolAuditEvent[]> {
    return this.auditLog.getLog(invocationId);
  }
}
