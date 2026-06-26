/**
 * MCPToolDiscovery — 发现 MCP tools，生成 snapshot
 */

import type {
  MCPClientInterface,
  MCPDiscoverySnapshot,
  MCPDiscoveredToolSummary,
  MCPNormalizedManifest,
  MCPError,
} from "./types.js";
import { schemaByteSize } from "./types.js";
import { MCPManifestNormalizer } from "./MCPManifestNormalizer.js";
import { MCPPolicyMapper } from "./MCPPolicyMapper.js";

export class MCPToolDiscovery {
  private normalizer: MCPManifestNormalizer;
  private policyMapper: MCPPolicyMapper;
  private maxSchemaBytes: number;

  constructor(maxSchemaBytes: number = 32768) {
    this.normalizer = new MCPManifestNormalizer();
    this.policyMapper = new MCPPolicyMapper();
    this.maxSchemaBytes = maxSchemaBytes;
  }

  async discover(client: MCPClientInterface): Promise<MCPDiscoverySnapshot> {
    const serverId = client.getServerId();
    const discoveredTools: MCPDiscoveredToolSummary[] = [];
    const registeredTools: MCPNormalizedManifest[] = [];
    const deniedTools: Array<{
      toolName: string;
      reason: string;
      riskAssessment?: import("./types.js").MCPRiskAssessment;
    }> = [];
    const errors: MCPError[] = [];

    try {
      // 1. 列出工具
      const tools = await client.listTools();

      for (const tool of tools) {
        // 2. 计算 schema 大小
        const schemaBytes = schemaByteSize(tool.inputSchema);
        const schemaStored = schemaBytes <= this.maxSchemaBytes;

        // 3. 创建摘要
        const summary: MCPDiscoveredToolSummary = {
          name: tool.name,
          description: tool.description,
          annotations: tool.annotations,
          schemaBytes,
          schemaStored,
        };
        discoveredTools.push(summary);

        // 4. 风险评估
        const riskAssessment = this.policyMapper.assess(tool);

        // 5. 检查 schema 大小
        if (!schemaStored) {
          deniedTools.push({
            toolName: tool.name,
            reason: `Schema too large: ${schemaBytes} > ${this.maxSchemaBytes}`,
            riskAssessment,
          });
          continue;
        }

        // 6. 检查风险
        if (!riskAssessment.allowed) {
          deniedTools.push({
            toolName: tool.name,
            reason: riskAssessment.reason,
            riskAssessment,
          });
          continue;
        }

        // 7. 规范化
        try {
          const normalized = this.normalizer.normalize(
            tool,
            serverId,
            this.maxSchemaBytes
          );
          registeredTools.push(normalized);
        } catch (error) {
          deniedTools.push({
            toolName: tool.name,
            reason: error instanceof Error ? error.message : "Normalization failed",
            riskAssessment,
          });
        }
      }
    } catch (error) {
      errors.push({
        code: "MCP_CONNECTION_FAILED",
        message: error instanceof Error ? error.message : "Discovery failed",
        recoverable: true,
      });
    }

    return {
      serverId,
      discoveredAt: new Date().toISOString(),
      discoveredTools,
      registeredTools,
      deniedTools,
      errors,
    };
  }
}
