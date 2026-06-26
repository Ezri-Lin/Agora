/**
 * DecisionLogStore — Append-only 决策日志存储
 *
 * 内存实现，可扩展为文件持久化
 */

import type {
  DecisionLogEntry,
  DecisionLogQuery,
  DecisionLogStore,
  DecisionLogError,
} from "./types.js";

export class InMemoryDecisionLogStore implements DecisionLogStore {
  private entries: DecisionLogEntry[] = [];

  /**
   * 追加日志条目
   */
  async append(entry: DecisionLogEntry): Promise<DecisionLogError | null> {
    // 验证
    if (!entry.workspaceId) {
      return {
        code: "WORKSPACE_REQUIRED",
        message: "workspaceId is required",
        recoverable: false,
      };
    }

    if (!entry.id || !entry.type || !entry.title) {
      return {
        code: "INVALID_ENTRY",
        message: "id, type, and title are required",
        recoverable: false,
      };
    }

    this.entries.push({ ...entry });
    return null;
  }

  /**
   * 查询日志
   */
  async query(query: DecisionLogQuery): Promise<DecisionLogEntry[]> {
    let results = this.entries.filter(
      (e) => e.workspaceId === query.workspaceId
    );

    if (query.projectId) {
      results = results.filter((e) => e.projectId === query.projectId);
    }

    if (query.sessionId) {
      results = results.filter((e) => e.sessionId === query.sessionId);
    }

    if (query.councilRoundId) {
      results = results.filter(
        (e) => e.councilRoundId === query.councilRoundId
      );
    }

    if (query.type && query.type.length > 0) {
      results = results.filter((e) => query.type!.includes(e.type));
    }

    if (query.actor && query.actor.length > 0) {
      results = results.filter((e) => query.actor!.includes(e.actor));
    }

    // 按时间降序
    results.sort((a, b) => b.createdAt.localeCompare(a.createdAt));

    // 分页
    const offset = query.offset ?? 0;
    const limit = query.limit ?? 100;
    return results.slice(offset, offset + limit);
  }

  /**
   * 获取单条
   */
  async getById(id: string): Promise<DecisionLogEntry | null> {
    return this.entries.find((e) => e.id === id) ?? null;
  }

  /**
   * 获取数量
   */
  async getCount(workspaceId: string): Promise<number> {
    return this.entries.filter((e) => e.workspaceId === workspaceId).length;
  }
}
