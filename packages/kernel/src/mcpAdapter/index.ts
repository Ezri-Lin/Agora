/**
 * MCP Adapter — public API exports
 */

// Types
export {
  // Config
  type MCPServerConfig,
  type RedactedMCPServerConfig,

  // Tool
  type MCPTool,
  type MCPToolAnnotations,

  // Policy
  type MCPToolRegistrationPolicy,
  DEFAULT_MCP_POLICY,

  // Discovery
  type MCPDiscoverySnapshot,
  type MCPDiscoveredToolSummary,

  // Normalization
  type MCPNormalizedManifest,

  // Risk
  type MCPRiskAssessment,
  type ToolRiskLevel,
  type ToolSideEffect,

  // Registration
  type MCPRegisteredTool,
  type MCPToolMappingStore,
  type MCPClientResolver,
  type MCPClientInterface,

  // Result
  type MCPContentType,
  type MCPSanitizedResult,
  type MCPExecutionResult,

  // Error
  type MCPErrorCode,
  type MCPError,

  // Helpers
  createManifestName,
  parseManifestName,
  redactServerConfig,
  schemaByteSize,
} from "./types.js";

// Core classes
export { RemoteMCPClient, type MCPClient } from "./MCPClient.js";
export { MCPToolDiscovery } from "./MCPToolDiscovery.js";
export { MCPPolicyMapper } from "./MCPPolicyMapper.js";
export { MCPManifestNormalizer } from "./MCPManifestNormalizer.js";
export { MCPResultSanitizer } from "./MCPResultSanitizer.js";
export { MCPExecutionAdapter } from "./MCPExecutionAdapter.js";
export { MCPAdapterRegistry } from "./MCPAdapterRegistry.js";
