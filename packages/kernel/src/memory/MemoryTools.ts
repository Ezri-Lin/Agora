/**
 * MemoryTools — Tool Runtime 注册
 *
 * v0 只暴露 read-only query tools:
 * - memory_search
 * - memory_get
 * - memory_related
 *
 * 写 API (appendEdge, attach, etc.) 不暴露到 Tool Runtime
 */

import type {
  ToolManifest,
  ToolExecutor,
} from "../tools/ToolRuntimeTypes.js";
import type {
  MemoryQuery,
  MemoryToolOutput,
  MemoryQueryError,
} from "./graphTypes.js";
import type { MemoryQueryEngine } from "./MemoryQueryEngine.js";
import { MAX_RELATED_DEPTH } from "./graphTypes.js";

// === memory_search ===

export const memorySearchManifest: ToolManifest = {
  name: "memory_search",
  description: "搜索记忆：按关键词、类型、标签、时间、关联关系",
  riskLevel: "read_only",
  sideEffects: [],
  requiresApproval: false,
  inputSchema: {
    type: "object",
    properties: {
      query: { type: "string", description: "搜索关键词" },
      type: {
        type: "array",
        items: {
          type: "string",
          enum: [
            "decision",
            "reasoning",
            "preference",
            "project_fact",
            "risk",
            "open_question",
          ],
        },
        description: "记忆类型过滤",
      },
      status: {
        type: "array",
        items: {
          type: "string",
          enum: [
            "candidate",
            "accepted",
            "rejected",
            "superseded",
            "expired",
            "contradicted",
          ],
        },
        description: "状态过滤",
      },
      tags: {
        type: "array",
        items: { type: "string" },
        description: "标签过滤",
      },
      sessionId: { type: "string", description: "会话 ID 过滤" },
      projectId: { type: "string", description: "项目 ID 过滤" },
      limit: { type: "number", description: "返回数量限制", default: 10 },
    },
  },
};

// === memory_get ===

export const memoryGetManifest: ToolManifest = {
  name: "memory_get",
  description: "获取记忆详情，包括来源链和关联记忆",
  riskLevel: "read_only",
  sideEffects: [],
  requiresApproval: false,
  inputSchema: {
    type: "object",
    properties: {
      id: { type: "string", description: "记忆 ID" },
      includeProvenance: {
        type: "boolean",
        description: "是否包含 provenance chain",
        default: true,
      },
    },
    required: ["id"],
  },
};

// === memory_related ===

export const memoryRelatedManifest: ToolManifest = {
  name: "memory_related",
  description: "获取记忆的关联图：支持、矛盾、推导关系",
  riskLevel: "read_only",
  sideEffects: [],
  requiresApproval: false,
  inputSchema: {
    type: "object",
    properties: {
      id: { type: "string", description: "记忆 ID" },
      depth: {
        type: "number",
        description: "图遍历深度",
        default: 1,
        minimum: 1,
        maximum: MAX_RELATED_DEPTH,
      },
    },
    required: ["id"],
  },
};

// === Tool Executors ===

export function createMemorySearchExecutor(
  engine: MemoryQueryEngine
): ToolExecutor {
  return async (args: unknown): Promise<MemoryToolOutput> => {
    try {
      const input = args as {
        query?: string;
        type?: string[];
        status?: string[];
        tags?: string[];
        sessionId?: string;
        projectId?: string;
        limit?: number;
      };

      const query: MemoryQuery = {
        text: input.query,
        type: input.type as any[],
        status: input.status as any[],
        tags: input.tags,
        sessionId: input.sessionId,
        projectId: input.projectId,
        limit: input.limit,
      };

      const result = await engine.query(query);
      return { ok: true, result };
    } catch (error) {
      return {
        ok: false,
        error: toError(error),
      };
    }
  };
}

export function createMemoryGetExecutor(
  engine: MemoryQueryEngine
): ToolExecutor {
  return async (args: unknown): Promise<MemoryToolOutput> => {
    try {
      const input = args as {
        id: string;
        includeProvenance?: boolean;
      };

      const result = await engine.get(input.id, input.includeProvenance);

      if (!result) {
        return {
          ok: false,
          error: {
            code: "MEMORY_NOT_FOUND",
            message: `Memory not found: ${input.id}`,
            recoverable: true,
          },
        };
      }

      return { ok: true, result };
    } catch (error) {
      return {
        ok: false,
        error: toError(error),
      };
    }
  };
}

export function createMemoryRelatedExecutor(
  engine: MemoryQueryEngine
): ToolExecutor {
  return async (args: unknown): Promise<MemoryToolOutput> => {
    try {
      const input = args as {
        id: string;
        depth?: number;
      };

      const depth = Math.min(
        input.depth ?? 1,
        MAX_RELATED_DEPTH
      );

      const result = await engine.getRelated(input.id, depth);
      return { ok: true, result };
    } catch (error) {
      return {
        ok: false,
        error: toError(error),
      };
    }
  };
}

// === Helper ===

function toError(error: unknown): MemoryQueryError {
  if (
    error &&
    typeof error === "object" &&
    "code" in error &&
    "message" in error
  ) {
    return error as MemoryQueryError;
  }

  return {
    code: "INVALID_QUERY",
    message: error instanceof Error ? error.message : "Unknown error",
    recoverable: true,
  };
}
