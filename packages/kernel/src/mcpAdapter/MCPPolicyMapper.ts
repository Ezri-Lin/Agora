/**
 * MCPPolicyMapper — 风险评估
 *
 * 规则：
 * readOnlyHint 缺失 → deny
 * destructiveHint === true → deny
 * openWorld === true → deny (v0)
 * requiresConfirmation === true → deny (v0)
 * unknown risk → deny
 */

import type {
  MCPTool,
  MCPRiskAssessment,
} from "./types.js";

export class MCPPolicyMapper {
  assess(tool: MCPTool): MCPRiskAssessment {
    const annotations = tool.annotations;

    // 1. readOnlyHint 缺失 → deny
    if (!annotations?.readOnlyHint) {
      return {
        riskLevel: "high",
        sideEffects: ["external_api_write"],
        requiresApproval: true,
        allowed: false,
        reason: "readOnlyHint not set",
      };
    }

    // 2. destructiveHint === true → deny
    if (annotations.destructiveHint) {
      return {
        riskLevel: "high",
        sideEffects: ["external_api_write"],
        requiresApproval: true,
        allowed: false,
        reason: "destructiveHint is true",
      };
    }

    // 3. openWorld === true → deny (v0)
    if (annotations.openWorld) {
      return {
        riskLevel: "high",
        sideEffects: ["network_request"],
        requiresApproval: true,
        allowed: false,
        reason: "openWorld is true (denied in v0)",
      };
    }

    // 4. requiresConfirmation === true → deny (v0)
    if (annotations.requiresConfirmation) {
      return {
        riskLevel: "medium",
        sideEffects: [],
        requiresApproval: true,
        allowed: false,
        reason: "requiresConfirmation is true (denied in v0)",
      };
    }

    // 5. 全部通过 → read_only
    return {
      riskLevel: "read_only",
      sideEffects: [],
      requiresApproval: false,
      allowed: true,
      reason: "readOnlyHint confirmed, no destructive/openWorld/confirmation",
    };
  }
}
