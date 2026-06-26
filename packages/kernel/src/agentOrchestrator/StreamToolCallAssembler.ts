/**
 * StreamToolCallAssembler — Streaming chunk 拼装
 *
 * 将 normalized deltas 组装成完整的 ToolCall
 * Provider adapter 负责转换 provider-specific chunk
 */

import type {
  ToolCall,
  NormalizedToolCallDelta,
  StreamAdapter,
} from "./types.js";

interface AssemblingToolCall {
  id: string;
  name: string;
  argsJson: string;
  isComplete: boolean;
}

export class StreamToolCallAssembler {
  private assembling = new Map<number, AssemblingToolCall>();

  /**
   * 添加 normalized delta
   */
  addDelta(delta: NormalizedToolCallDelta): void {
    const existing = this.assembling.get(delta.index);

    if (!existing) {
      // 新的 tool call
      this.assembling.set(delta.index, {
        id: delta.id ?? `stream-${delta.index}`,
        name: delta.nameDelta ?? "",
        argsJson: delta.argsJsonDelta ?? "",
        isComplete: delta.isComplete ?? false,
      });
    } else {
      // 更新已有的 tool call
      if (delta.id) {
        existing.id = delta.id;
      }
      if (delta.nameDelta) {
        existing.name += delta.nameDelta;
      }
      if (delta.argsJsonDelta) {
        existing.argsJson += delta.argsJsonDelta;
      }
      if (delta.isComplete) {
        existing.isComplete = true;
      }
    }
  }

  /**
   * 检查是否组装完成
   */
  isComplete(): boolean {
    if (this.assembling.size === 0) {
      return false;
    }

    // 所有 tool call 都必须完成
    for (const tc of this.assembling.values()) {
      if (!tc.isComplete) {
        return false;
      }
    }

    return true;
  }

  /**
   * 获取组装好的 tool calls
   */
  assemble(): ToolCall[] {
    const toolCalls: ToolCall[] = [];

    // 按 index 排序
    const sorted = [...this.assembling.entries()].sort(
      ([a], [b]) => a - b
    );

    for (const [, tc] of sorted) {
      try {
        const args = tc.argsJson ? JSON.parse(tc.argsJson) : {};
        toolCalls.push({
          id: tc.id,
          name: tc.name,
          args,
        });
      } catch {
        // JSON 解析失败，跳过
        continue;
      }
    }

    return toolCalls;
  }

  /**
   * 重置状态
   */
  reset(): void {
    this.assembling.clear();
  }
}

// === OpenAI Stream Adapter ===

interface OpenAIStreamChunk {
  choices?: Array<{
    delta?: {
      tool_calls?: Array<{
        index: number;
        id?: string;
        function?: {
          name?: string;
          arguments?: string;
        };
      }>;
    };
  }>;
}

export class OpenAIStreamAdapter implements StreamAdapter {
  normalize(chunk: unknown): NormalizedToolCallDelta[] {
    const deltas: NormalizedToolCallDelta[] = [];
    const openaiChunk = chunk as OpenAIStreamChunk;

    const toolCalls =
      openaiChunk?.choices?.[0]?.delta?.tool_calls ?? [];

    for (const tc of toolCalls) {
      deltas.push({
        index: tc.index,
        id: tc.id,
        nameDelta: tc.function?.name,
        argsJsonDelta: tc.function?.arguments,
        isComplete: false, // OpenAI 不在 delta 中标记完成
      });
    }

    return deltas;
  }
}
