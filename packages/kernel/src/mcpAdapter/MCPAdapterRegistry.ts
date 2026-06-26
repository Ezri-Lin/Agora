/**
 * MCPAdapterRegistry — 注册管理
 *
 * 包含 MCPToolMappingStore 实现
 * 支持 multi-server 通过 clientResolver
 */

import type { ToolRuntime, ToolExecutor } from "../tools/ToolRuntimeTypes.js";
import type {
  MCPToolRegistrationPolicy,
  MCPNormalizedManifest,
  MCPRegisteredTool,
  MCPDiscoverySnapshot,
  MCPClientResolver,
  MCPToolMappingStore,
  MCPClientInterface,
} from "./types.js";
import { createManifestName, parseManifestName } from "./types.js";
import { MCPToolDiscovery } from "./MCPToolDiscovery.js";
import { MCPExecutionAdapter } from "./MCPExecutionAdapter.js";
import { MCPResultSanitizer } from "./MCPResultSanitizer.js";

export class MCPAdapterRegistry implements MCPToolMappingStore {
  private registered = new Map<string, MCPRegisteredTool>();
  private discovery: MCPToolDiscovery;
  private sanitizer: MCPResultSanitizer;
  private executionAdapter: MCPExecutionAdapter;

  constructor(
    private runtime: ToolRuntime,
    private policy: MCPToolRegistrationPolicy,
    private clientResolver: MCPClientResolver
  ) {
    this.discovery = new MCPToolDiscovery(policy.maxSchemaBytes);
    this.sanitizer = new MCPResultSanitizer(policy.maxResultBytes);
    this.executionAdapter = new MCPExecutionAdapter(
      clientResolver,
      this.sanitizer,
      this
    );
  }

  /**
   * 发现并注册
   */
  async discoverAndRegister(
    client: MCPClientInterface
  ): Promise<MCPDiscoverySnapshot> {
    const snapshot = await this.discovery.discover(client);

    for (const normalized of snapshot.registeredTools) {
      this.register(normalized);
    }

    return snapshot;
  }

  /**
   * 注册单个 tool
   */
  register(normalized: MCPNormalizedManifest): boolean {
    // 1. 检查 allowlist
    if (!this.isAllowed(normalized.serverId, normalized.original.name)) {
      return false;
    }

    // 2. 检查 risk
    if (!normalized.riskAssessment.allowed) {
      return false;
    }

    // 3. 检查名称冲突
    if (this.registered.has(normalized.manifestName)) {
      return false;
    }

    // 4. 创建 executor
    const executor = this.executionAdapter.createExecutor(
      normalized.manifestName
    );

    // 5. 注册到 ToolRuntime
    this.runtime.register(normalized.manifest, executor);

    // 6. 记录映射
    this.registered.set(normalized.manifestName, {
      manifestName: normalized.manifestName,
      serverId: normalized.serverId,
      originalToolName: normalized.original.name,
      displayName: normalized.original.name,
      normalized,
      registeredAt: new Date().toISOString(),
    });

    return true;
  }

  /**
   * 检查是否允许
   */
  isAllowed(serverId: string, toolName: string): boolean {
    return this.policy.allowedTools.some(
      (t) => t.serverId === serverId && t.toolName === toolName
    );
  }

  /**
   * 获取映射
   */
  getMapping(manifestName: string): MCPRegisteredTool | undefined {
    return this.registered.get(manifestName);
  }

  /**
   * 获取已注册列表
   */
  getRegistered(): MCPRegisteredTool[] {
    return [...this.registered.values()];
  }
}
