/**
 * MCP Adapter 测试
 */

import { describe, it, expect } from "vitest";
import {
  createManifestName,
  parseManifestName,
  redactServerConfig,
  schemaByteSize,
} from "../mcpAdapter/types.js";
import { MCPPolicyMapper } from "../mcpAdapter/MCPPolicyMapper.js";
import { MCPManifestNormalizer } from "../mcpAdapter/MCPManifestNormalizer.js";
import { MCPResultSanitizer } from "../mcpAdapter/MCPResultSanitizer.js";
import type { MCPTool, MCPServerConfig } from "../mcpAdapter/types.js";

// === Naming Helpers ===

describe("MCP Naming", () => {
  it("should create namespaced manifest name", () => {
    const name = createManifestName("memory-server", "search");
    expect(name).toBe("mcp__memory_server__search");
  });

  it("should handle special characters in names", () => {
    const name = createManifestName("my-server/v2", "list-items");
    expect(name).toMatch(/^mcp__.*__.*$/);
    expect(name).not.toContain("/");
    expect(name).not.toContain("-");
  });

  it("should parse manifest name", () => {
    const parsed = parseManifestName("mcp__memory_server__search");
    expect(parsed).toEqual({
      serverId: "memory_server",
      toolName: "search",
    });
  });

  it("should return null for non-MCP names", () => {
    const parsed = parseManifestName("memory_search");
    expect(parsed).toBeNull();
  });
});

// === Redaction ===

describe("MCP Redaction", () => {
  it("should redact env from server config", () => {
    const config: MCPServerConfig = {
      id: "test-server",
      name: "Test Server",
      transport: "sse",
      url: "http://localhost:3000",
      env: {
        API_KEY: "secret-key-123",
        TOKEN: "bearer-token",
      },
    };

    const redacted = redactServerConfig(config);

    expect(redacted.id).toBe("test-server");
    expect(redacted.hasEnv).toBe(true);
    // env 不应出现在 redacted 中
    expect((redacted as any).env).toBeUndefined();
  });

  it("should handle missing env", () => {
    const config: MCPServerConfig = {
      id: "test-server",
      name: "Test Server",
      transport: "sse",
      url: "http://localhost:3000",
    };

    const redacted = redactServerConfig(config);
    expect(redacted.hasEnv).toBe(false);
  });
});

// === Schema Helpers ===

describe("MCP Schema", () => {
  it("should calculate schema byte size", () => {
    const schema = { type: "object", properties: { query: { type: "string" } } };
    const size = schemaByteSize(schema);
    expect(size).toBeGreaterThan(0);
  });

  it("should return 0 for invalid schema", () => {
    const size = schemaByteSize(undefined);
    expect(size).toBe(0);
  });
});

// === Policy Mapper ===

describe("MCPPolicyMapper", () => {
  it("should allow read-only tool", () => {
    const mapper = new MCPPolicyMapper();
    const tool: MCPTool = {
      name: "search",
      annotations: { readOnlyHint: true },
    };

    const assessment = mapper.assess(tool);

    expect(assessment.allowed).toBe(true);
    expect(assessment.riskLevel).toBe("read_only");
    expect(assessment.sideEffects).toEqual([]);
  });

  it("should deny tool without readOnlyHint", () => {
    const mapper = new MCPPolicyMapper();
    const tool: MCPTool = {
      name: "search",
    };

    const assessment = mapper.assess(tool);

    expect(assessment.allowed).toBe(false);
    expect(assessment.reason).toContain("readOnlyHint not set");
  });

  it("should deny destructive tool", () => {
    const mapper = new MCPPolicyMapper();
    const tool: MCPTool = {
      name: "delete",
      annotations: {
        readOnlyHint: true,
        destructiveHint: true,
      },
    };

    const assessment = mapper.assess(tool);

    expect(assessment.allowed).toBe(false);
    expect(assessment.reason).toContain("destructiveHint");
  });

  it("should deny openWorld tool", () => {
    const mapper = new MCPPolicyMapper();
    const tool: MCPTool = {
      name: "web_search",
      annotations: {
        readOnlyHint: true,
        openWorld: true,
      },
    };

    const assessment = mapper.assess(tool);

    expect(assessment.allowed).toBe(false);
    expect(assessment.reason).toContain("openWorld");
  });

  it("should deny requiresConfirmation tool", () => {
    const mapper = new MCPPolicyMapper();
    const tool: MCPTool = {
      name: "confirm_action",
      annotations: {
        readOnlyHint: true,
        requiresConfirmation: true,
      },
    };

    const assessment = mapper.assess(tool);

    expect(assessment.allowed).toBe(false);
    expect(assessment.reason).toContain("requiresConfirmation");
  });
});

// === Manifest Normalizer ===

describe("MCPManifestNormalizer", () => {
  it("should normalize MCP tool to ToolManifest", () => {
    const normalizer = new MCPManifestNormalizer();
    const tool: MCPTool = {
      name: "search",
      description: "Search the knowledge base",
      annotations: { readOnlyHint: true },
      inputSchema: {
        type: "object",
        properties: { query: { type: "string" } },
        required: ["query"],
      },
    };

    const result = normalizer.normalize(tool, "kb-server", 32768);

    expect(result.manifestName).toBe("mcp__kb_server__search");
    expect(result.manifest.riskLevel).toBe("read_only");
    expect(result.manifest.sideEffects).toEqual([]);
    expect(result.riskAssessment.allowed).toBe(true);
  });

  it("should reject tool without readOnlyHint", () => {
    const normalizer = new MCPManifestNormalizer();
    const tool: MCPTool = {
      name: "write",
    };

    expect(() => normalizer.normalize(tool, "server", 32768)).toThrow(
      "readOnlyHint not set"
    );
  });

  it("should reject tool with large schema", () => {
    const normalizer = new MCPManifestNormalizer();
    const tool: MCPTool = {
      name: "search",
      annotations: { readOnlyHint: true },
      inputSchema: {
        type: "object",
        properties: Object.fromEntries(
          Array.from({ length: 1000 }, (_, i) => [`field${i}`, { type: "string" }])
        ),
      },
    };

    // Schema too large should throw MCP_SCHEMA_TOO_LARGE
    expect(() => normalizer.normalize(tool, "server", 100)).toThrow();
  });
});

// === Result Sanitizer ===

describe("MCPResultSanitizer", () => {
  it("should sanitize text content", () => {
    const sanitizer = new MCPResultSanitizer();

    const result = sanitizer.sanitize({
      ok: true,
      content: "Hello, world!",
    });

    expect(result.ok).toBe(true);
    expect(result.content).toBe("Hello, world!");
    expect(result.contentType).toBe("text");
    expect(result.truncated).toBe(false);
  });

  it("should sanitize JSON content", () => {
    const sanitizer = new MCPResultSanitizer();

    const result = sanitizer.sanitize({
      ok: true,
      content: { key: "value", count: 42 },
    });

    expect(result.ok).toBe(true);
    expect(result.contentType).toBe("json");
    expect(result.truncated).toBe(false);
  });

  it("should truncate large content", () => {
    const sanitizer = new MCPResultSanitizer(100);

    const result = sanitizer.sanitize({
      ok: true,
      content: "x".repeat(200),
    });

    expect(result.ok).toBe(true);
    expect(result.truncated).toBe(true);
    // 内容被截断到 maxResultBytes + truncation marker
    expect(result.content.length).toBeLessThanOrEqual(130);
  });

  it("should handle error result", () => {
    const sanitizer = new MCPResultSanitizer();

    const result = sanitizer.sanitize({
      ok: false,
      error: {
        code: "MCP_EXECUTION_FAILED",
        message: "Tool failed",
        recoverable: true,
      },
    });

    expect(result.ok).toBe(false);
    expect(result.contentType).toBe("text");
  });

  it("should handle null content", () => {
    const sanitizer = new MCPResultSanitizer();

    const result = sanitizer.sanitize({
      ok: true,
      content: null,
    });

    expect(result.ok).toBe(true);
    expect(result.content).toBe("");
  });
});
