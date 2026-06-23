/**
 * ToolAuditLog — 审计日志
 *
 * append-only JSONL at .agora/tools/audit.jsonl
 */

import { join } from "node:path";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import type {
  ToolAuditEvent,
  ToolInvocationStatus,
  ToolRiskLevel,
  ToolSideEffect,
} from "./ToolRuntimeTypes.js";

// === ToolAuditLog ===

export class ToolAuditLog {
  private dir: string;
  private filePath: string;

  constructor(workspaceRoot: string) {
    this.dir = join(workspaceRoot, ".agora", "tools");
    this.filePath = join(this.dir, "audit.jsonl");
  }

  /**
   * 追加审计事件
   */
  async append(event: ToolAuditEvent): Promise<void> {
    await this.ensureDir();
    const line = JSON.stringify(event) + "\n";
    await writeFile(this.filePath, line, { flag: "a" });
  }

  /**
   * 获取审计日志
   */
  async getLog(invocationId?: string): Promise<ToolAuditEvent[]> {
    if (!existsSync(this.filePath)) return [];

    const raw = await readFile(this.filePath, "utf-8");
    if (!raw.trim()) return [];

    const events = raw
      .trim()
      .split("\n")
      .map((line) => {
        try {
          return JSON.parse(line) as ToolAuditEvent;
        } catch {
          return null;
        }
      })
      .filter((e): e is ToolAuditEvent => e !== null);

    if (invocationId) {
      return events.filter((e) => e.invocationId === invocationId);
    }

    return events;
  }

  /**
   * 创建审计事件
   */
  createEvent(params: {
    invocationId: string;
    toolName: string;
    status: ToolInvocationStatus;
    riskLevel: ToolRiskLevel;
    sideEffects: ToolSideEffect[];
    reason?: string;
  }): ToolAuditEvent {
    return {
      id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      invocationId: params.invocationId,
      toolName: params.toolName,
      status: params.status,
      riskLevel: params.riskLevel,
      sideEffects: params.sideEffects,
      reason: params.reason,
      createdAt: new Date().toISOString(),
    };
  }

  // === Private Helpers ===

  private async ensureDir(): Promise<void> {
    if (!existsSync(this.dir)) {
      await mkdir(this.dir, { recursive: true });
    }
  }
}
