/**
 * StructuredIndexer — 可重建的结构化索引
 *
 * Derived state: 可从 MemoryStore + MemoryGraphStore 重建
 * In-memory index with optional JSON snapshot
 */

import type {
  MemoryQuery,
  MemoryIndexEntry,
  IndexStats,
} from "./graphTypes.js";
import type { MemoryCandidate } from "./MemoryCandidate.js";
import { DEFAULT_QUERY_LIMIT, MAX_QUERY_LIMIT } from "./graphTypes.js";

export class StructuredIndexer {
  private entries = new Map<string, MemoryIndexEntry>();
  // Inverted index: keyword → memory ids
  private keywordIndex = new Map<string, Set<string>>();

  /**
   * 重建索引 (从 memory candidates 列表)
   */
  async rebuild(candidates: MemoryCandidate[]): Promise<void> {
    this.entries.clear();
    this.keywordIndex.clear();

    for (const candidate of candidates) {
      this.indexCandidate(candidate);
    }
  }

  /**
   * 增量索引单条候选
   */
  async index(candidate: MemoryCandidate): Promise<void> {
    this.indexCandidate(candidate);
  }

  /**
   * 查询
   */
  async search(query: MemoryQuery): Promise<MemoryIndexEntry[]> {
    let results = [...this.entries.values()];

    // Apply filters
    if (query.type && query.type.length > 0) {
      results = results.filter((e) => query.type!.includes(e.type));
    }

    if (query.scope && query.scope.length > 0) {
      results = results.filter((e) => query.scope!.includes(e.scope));
    }

    if (query.status && query.status.length > 0) {
      results = results.filter((e) => query.status!.includes(e.status));
    }

    if (query.tags && query.tags.length > 0) {
      results = results.filter((e) =>
        query.tags!.some((t) => e.tags.includes(t))
      );
    }

    if (query.sessionId) {
      // Would need sessionId in index entry - for now filter by memory
    }

    if (query.createdAfter) {
      results = results.filter(
        (e) => e.createdAt >= query.createdAfter!
      );
    }

    if (query.createdBefore) {
      results = results.filter(
        (e) => e.createdAt <= query.createdBefore!
      );
    }

    // Keyword search
    if (query.text) {
      const keywords = this.extractKeywords(query.text);
      const matchingIds = new Set<string>();

      for (const keyword of keywords) {
        const ids = this.keywordIndex.get(keyword);
        if (ids) {
          for (const id of ids) {
            matchingIds.add(id);
          }
        }
      }

      results = results.filter((e) => matchingIds.has(e.id));
    }

    // Sort
    const sortBy = query.sortBy ?? "time";
    const sortOrder = query.sortOrder ?? "desc";

    results.sort((a, b) => {
      let cmp = 0;
      if (sortBy === "time") {
        cmp = a.createdAt.localeCompare(b.createdAt);
      }
      // relevance and confidence would need scoring
      return sortOrder === "desc" ? -cmp : cmp;
    });

    // Pagination
    const limit = Math.min(
      query.limit ?? DEFAULT_QUERY_LIMIT,
      MAX_QUERY_LIMIT
    );
    const offset = query.offset ?? 0;

    return results.slice(offset, offset + limit);
  }

  /**
   * 获取统计
   */
  async getStats(): Promise<IndexStats> {
    const entries = [...this.entries.values()];

    const byType: Record<string, number> = {};
    const byStatus: Record<string, number> = {};
    const byScope: Record<string, number> = {};

    for (const entry of entries) {
      byType[entry.type] = (byType[entry.type] ?? 0) + 1;
      byStatus[entry.status] = (byStatus[entry.status] ?? 0) + 1;
      byScope[entry.scope] = (byScope[entry.scope] ?? 0) + 1;
    }

    return {
      totalEntries: entries.length,
      byType,
      byStatus,
      byScope,
    };
  }

  /**
   * 获取单条索引条目
   */
  getEntry(id: string): MemoryIndexEntry | undefined {
    return this.entries.get(id);
  }

  // === Private ===

  private indexCandidate(candidate: MemoryCandidate): void {
    const keywords = this.extractKeywords(candidate.content);

    const entry: MemoryIndexEntry = {
      id: candidate.id,
      type: candidate.type,
      scope: candidate.scope,
      tags: candidate.tags,
      status: candidate.status,
      createdAt: candidate.createdAt,
      updatedAt: candidate.createdAt,
      contentHash: this.hashContent(candidate.content),
      keywords,
    };

    this.entries.set(candidate.id, entry);

    // Update keyword index
    for (const keyword of keywords) {
      const ids = this.keywordIndex.get(keyword) ?? new Set();
      ids.add(candidate.id);
      this.keywordIndex.set(keyword, ids);
    }
  }

  private extractKeywords(text: string): string[] {
    const lower = text.toLowerCase();
    const tokens: string[] = [];
    let i = 0;

    while (i < lower.length) {
      const char = lower[i];

      // Skip whitespace and punctuation
      if (/\s/.test(char) || /[^\w\u4e00-\u9fff]/.test(char)) {
        i++;
        continue;
      }

      // CJK 2-gram
      if (char.charCodeAt(0) >= 0x4e00 && char.charCodeAt(0) <= 0x9fff) {
        let j = i;
        while (
          j < lower.length &&
          lower.charCodeAt(j) >= 0x4e00 &&
          lower.charCodeAt(j) <= 0x9fff
        ) {
          j++;
        }
        const segment = lower.slice(i, j);
        if (segment.length === 1) {
          tokens.push(segment);
        } else {
          for (let k = 0; k < segment.length - 1; k++) {
            tokens.push(segment.slice(k, k + 2));
          }
        }
        i = j;
        continue;
      }

      // Alphanumeric sequence
      if (/[a-z0-9]/.test(char)) {
        let j = i;
        while (j < lower.length && /[a-z0-9-_]/.test(lower[j])) {
          j++;
        }
        const segment = lower.slice(i, j);
        const parts = segment.split(/[-_]/).filter(Boolean);
        tokens.push(...parts);
        i = j;
        continue;
      }

      i++;
    }

    // Deduplicate
    return [...new Set(tokens)];
  }

  private hashContent(content: string): string {
    // Simple hash for content deduplication
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(36);
  }
}
