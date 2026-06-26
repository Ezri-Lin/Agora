/**
 * MCPManifestNormalizer — MCP tool → ToolManifest
 *
 * Namespace 格式: mcp__{serverId}__{toolName}
 */

import type { ToolManifest } from "../tools/ToolRuntimeTypes.js";
import type {
  MCPTool,
  MCPNormalizedManifest,
  MCPError,
} from "./types.js";
import {
  createManifestName,
  schemaByteSize,
} from "./types.js";
import { MCPPolicyMapper } from "./MCPPolicyMapper.js";

export class MCPManifestNormalizer {
  private policyMapper: MCPPolicyMapper;

  constructor() {
    this.policyMapper = new MCPPolicyMapper();
  }

  normalize(
    tool: MCPTool,
    serverId: string,
    maxSchemaBytes: number
  ): MCPNormalizedManifest {
    // 1. 验证 schema 大小
    const schemaBytes = schemaByteSize(tool.inputSchema);
    if (schemaBytes > maxSchemaBytes) {
      throw this.createError(
        "MCP_SCHEMA_TOO_LARGE",
        `Schema too large: ${schemaBytes} > ${maxSchemaBytes}`
      );
    }

    // 2. 风险评估
    const riskAssessment = this.policyMapper.assess(tool);
    if (!riskAssessment.allowed) {
      throw this.createError(
        "MCP_RISK_NOT_ALLOWED",
        `Tool not allowed: ${riskAssessment.reason}`
      );
    }

    // 3. 生成 namespaced name
    const manifestName = createManifestName(serverId, tool.name);

    // 4. 转换 inputSchema
    const inputSchema = this.convertSchema(tool.inputSchema);

    // 5. 创建 ToolManifest
    const manifest: ToolManifest = {
      name: manifestName,
      description: tool.description ?? `MCP tool: ${tool.name}`,
      riskLevel: riskAssessment.riskLevel,
      sideEffects: riskAssessment.sideEffects,
      requiresApproval: riskAssessment.requiresApproval,
      inputSchema,
    };

    return {
      original: tool,
      manifestName,
      serverId,
      manifest,
      riskAssessment,
    };
  }

  // === Private ===

  private convertSchema(
    schema: Record<string, unknown> | undefined
  ): Record<string, unknown> {
    if (!schema) {
      return { type: "object" };
    }

    // MCP inputSchema 通常已经是 JSON Schema 格式
    // 直接返回，但确保有 type
    if (!schema.type) {
      return { ...schema, type: "object" };
    }

    return schema;
  }

  private createError(
    code: MCPError["code"],
    message: string
  ): MCPError {
    return {
      code,
      message,
      recoverable: true,
    };
  }
}
