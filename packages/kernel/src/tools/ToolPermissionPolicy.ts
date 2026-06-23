/**
 * ToolPermissionPolicy — 权限策略
 *
 * v0.1 规则：
 * - read_only + network_request → allowed without approval
 * - write_local_file → approval required
 * - execute_command → denied
 * - external_api_write → denied
 * - unknown tool → denied
 */

import type {
  ToolManifest,
  ToolInvocationPlan,
  ToolPermissionDecision,
  ToolRiskLevel,
  ToolSideEffect,
} from "./ToolRuntimeTypes.js";

// === Policy Errors ===

export class ToolPermissionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ToolPermissionError";
  }
}

// === Permission Policy ===

export class ToolPermissionPolicy {
  /**
   * 评估调用计划的权限
   */
  evaluate(
    plan: ToolInvocationPlan,
    manifest?: ToolManifest
  ): ToolPermissionDecision {
    // Unknown tool → denied
    if (!manifest) {
      return {
        allowed: false,
        requiresApproval: false,
        reason: `Unknown tool: ${plan.toolName}`,
      };
    }

    // Check each side effect
    for (const sideEffect of plan.sideEffects) {
      const decision = this.evaluateSideEffect(sideEffect, plan.riskLevel);
      if (!decision.allowed) {
        return decision;
      }
    }

    // Check risk level
    const riskDecision = this.evaluateRiskLevel(plan.riskLevel);
    if (!riskDecision.allowed) {
      return riskDecision;
    }

    // All checks passed
    return {
      allowed: true,
      requiresApproval: plan.requiresApproval,
      reason: "Permission granted",
    };
  }

  // === Private Helpers ===

  private evaluateSideEffect(
    sideEffect: ToolSideEffect,
    riskLevel: ToolRiskLevel
  ): ToolPermissionDecision {
    switch (sideEffect) {
      case "none":
        return { allowed: true, requiresApproval: false, reason: "No side effects" };

      case "network_request":
        // Read-only network requests are allowed
        if (riskLevel === "read_only") {
          return {
            allowed: true,
            requiresApproval: false,
            reason: "Read-only network request allowed",
          };
        }
        // Higher risk levels require approval
        return {
          allowed: true,
          requiresApproval: true,
          reason: "Network request requires approval",
        };

      case "read_local_file":
        // Local file reads are allowed
        return {
          allowed: true,
          requiresApproval: false,
          reason: "Local file read allowed",
        };

      case "write_local_file":
        // File writes require approval
        return {
          allowed: true,
          requiresApproval: true,
          reason: "Local file write requires approval",
        };

      case "execute_command":
        // Command execution denied in v0.1
        return {
          allowed: false,
          requiresApproval: false,
          reason: "Command execution denied in v0.1",
        };

      case "external_api_write":
        // External API writes denied in v0.1
        return {
          allowed: false,
          requiresApproval: false,
          reason: "External API write denied in v0.1",
        };

      default:
        return {
          allowed: false,
          requiresApproval: false,
          reason: `Unknown side effect: ${sideEffect}`,
        };
    }
  }

  private evaluateRiskLevel(riskLevel: ToolRiskLevel): ToolPermissionDecision {
    switch (riskLevel) {
      case "read_only":
        return { allowed: true, requiresApproval: false, reason: "Read-only risk level allowed" };

      case "low":
        return { allowed: true, requiresApproval: false, reason: "Low risk level allowed" };

      case "medium":
        return { allowed: true, requiresApproval: true, reason: "Medium risk level requires approval" };

      case "high":
        return {
          allowed: false,
          requiresApproval: false,
          reason: "High risk level denied in v0.1",
        };

      default:
        return {
          allowed: false,
          requiresApproval: false,
          reason: `Unknown risk level: ${riskLevel}`,
        };
    }
  }
}
