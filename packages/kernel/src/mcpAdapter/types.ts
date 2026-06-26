/**
 * MCP Adapter Types — v0 类型定义
 *
 * 设计原则：
 * - Closed-world read-only only
 * - Namespace tool names
 * - Env redaction
 * - Unknown risk = deny
 */

// === MCP Server Config ===

export interface MCPServerConfig {
  id: string;
  name: string;
  transport: "sse" | "streamable-http";
  url: string;
  env?: Record<string, string>; // runtime only, never serialized
}

// Redacted version for logs/snapshots
export interface RedactedMCPServerConfig {
  id: string;
  name: string;
  transport: string;
  url: string;
  hasEnv: boolean;
}

// === MCP Tool (from server) ===

export interface MCPTool {
  name: string;
  description?: string;
  inputSchema?: Record<string, unknown>;
  annotations?: MCPToolAnnotations;
}

export interface MCPToolAnnotations {
  readOnlyHint?: boolean;
  destructiveHint?: boolean;
  requiresConfirmation?: boolean;
  idempotent?: boolean;
  openWorld?: boolean;
}

// === Registration Policy ===

export interface MCPToolRegistrationPolicy {
  allowedTools: Array<{
    serverId: string;
    toolName: string;
  }>;
  allowReadOnlyOnly: boolean;
  maxResultBytes: number;
  maxSchemaBytes: number;
}

export const DEFAULT_MCP_POLICY: MCPToolRegistrationPolicy = {
  allowedTools: [],
  allowReadOnlyOnly: true,
  maxResultBytes: 65536,
  maxSchemaBytes: 32768,
};

// === Discovery Snapshot ===

export interface MCPDiscoverySnapshot {
  serverId: string;
  discoveredAt: string;
  discoveredTools: MCPDiscoveredToolSummary[];
  registeredTools: MCPNormalizedManifest[];
  deniedTools: Array<{
    toolName: string;
    reason: string;
    riskAssessment?: MCPRiskAssessment;
  }>;
  errors: MCPError[];
}

export interface MCPDiscoveredToolSummary {
  name: string;
  description?: string;
  annotations?: MCPToolAnnotations;
  schemaBytes: number;
  schemaStored: boolean;
}

// === Normalized Manifest ===

export interface MCPNormalizedManifest {
  original: MCPTool;
  manifestName: string;  // namespaced: mcp__{serverId}__{toolName}
  serverId: string;
  manifest: import("../tools/ToolRuntimeTypes.js").ToolManifest;
  riskAssessment: MCPRiskAssessment;
}

// === Risk Assessment ===

export type ToolRiskLevel = import("../tools/ToolRuntimeTypes.js").ToolRiskLevel;
export type ToolSideEffect = import("../tools/ToolRuntimeTypes.js").ToolSideEffect;

export interface MCPRiskAssessment {
  riskLevel: ToolRiskLevel;
  sideEffects: ToolSideEffect[];
  requiresApproval: boolean;
  allowed: boolean;
  reason: string;
}

// === Registered Tool ===

export interface MCPRegisteredTool {
  manifestName: string;
  serverId: string;
  originalToolName: string;
  displayName: string;
  normalized: MCPNormalizedManifest;
  registeredAt: string;
}

// === Mapping Store ===

export interface MCPToolMappingStore {
  getMapping(manifestName: string): MCPRegisteredTool | undefined;
  isAllowed(serverId: string, toolName: string): boolean;
}

// === Client Resolver ===

export interface MCPClientResolver {
  getClient(serverId: string): MCPClientInterface | undefined;
}

// MCPClient interface (避免循环依赖)
export interface MCPClientInterface {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  listTools(): Promise<MCPTool[]>;
  callTool(name: string, args: Record<string, unknown>): Promise<MCPExecutionResult>;
  isConnected(): boolean;
  getServerId(): string;
}

// === Sanitized Result ===

export type MCPContentType = "text" | "json" | "truncated" | "unsupported";

export interface MCPSanitizedResult {
  ok: boolean;
  content: string;
  contentType: MCPContentType;
  truncated: boolean;
  rawOutput?: unknown;
  error?: MCPError;
}

// === Execution Result ===

export interface MCPExecutionResult {
  ok: boolean;
  content?: unknown;
  error?: MCPError;
}

// === Errors ===

export type MCPErrorCode =
  | "MCP_SERVER_NOT_FOUND"
  | "MCP_TOOL_NOT_FOUND"
  | "MCP_CONNECTION_FAILED"
  | "MCP_EXECUTION_FAILED"
  | "MCP_RESULT_TOO_LARGE"
  | "MCP_RISK_NOT_ALLOWED"
  | "MCP_VALIDATION_FAILED"
  | "MCP_TRANSPORT_NOT_ALLOWED"
  | "MCP_TOOL_NOT_ALLOWED"
  | "MCP_SCHEMA_TOO_LARGE"
  | "MCP_SCHEMA_INVALID"
  | "MCP_RESULT_UNSUPPORTED"
  | "MCP_NAME_COLLISION"
  | "MCP_OPEN_WORLD_DENIED"
  | "MCP_BINARY_CONTENT_DENIED";

export interface MCPError {
  code: MCPErrorCode;
  message: string;
  recoverable: boolean;
  details?: Record<string, unknown>;
}

// === Naming Helpers ===

/**
 * 创建 namespaced manifest name
 * 格式: mcp__{serverId}__{toolName}
 */
export function createManifestName(serverId: string, toolName: string): string {
  const safeServerId = slugify(serverId);
  const safeToolName = slugify(toolName);
  return `mcp__${safeServerId}__${safeToolName}`;
}

/**
 * 解析 manifest name
 */
export function parseManifestName(name: string): { serverId: string; toolName: string } | null {
  const match = name.match(/^mcp__(.+?)__(.+)$/);
  if (!match) return null;
  return { serverId: match[1], toolName: match[2] };
}

/**
 * Slugify: only [a-zA-Z0-9_-]
 */
function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
}

// === Redaction ===

/**
 * Redact server config for logs/snapshots
 */
export function redactServerConfig(config: MCPServerConfig): RedactedMCPServerConfig {
  return {
    id: config.id,
    name: config.name,
    transport: config.transport,
    url: config.url,
    hasEnv: !!config.env && Object.keys(config.env).length > 0,
  };
}

// === Schema Helpers ===

/**
 * 计算 schema 字节大小
 */
export function schemaByteSize(schema: unknown): number {
  try {
    return JSON.stringify(schema).length;
  } catch {
    return 0;
  }
}
