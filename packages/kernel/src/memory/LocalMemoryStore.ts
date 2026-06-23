/**
 * LocalMemoryStore — JSONL-based append-only memory store
 *
 * 设计原则：
 * - append-only 持久化
 * - 状态分离存储（candidates/accepted/rejected/superseded/expired）
 * - 审计日志
 * - 本地优先
 */

import { join } from "node:path";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import type {
  MemoryStore,
  MemoryStatusUpdate,
  MemoryListQuery,
  MemoryAuditEvent,
  MemoryAuditEventType,
  LocalMemoryStoreConfig,
} from "./MemoryStoreTypes.js";
import { DEFAULT_STORE_CONFIG } from "./MemoryStoreTypes.js";
import type { MemoryCandidate } from "./MemoryCandidate.js";
import { validateMemoryCandidate } from "./validateMemoryCandidate.js";

// === File Names ===

const FILES = {
  candidates: "candidates.jsonl",
  accepted: "accepted.jsonl",
  rejected: "rejected.jsonl",
  superseded: "superseded.jsonl",
  expired: "expired.jsonl",
  audit: "audit.jsonl",
} as const;

// === LocalMemoryStore ===

export class LocalMemoryStore implements MemoryStore {
  private config: LocalMemoryStoreConfig;
  private dir: string;

  constructor(
    workspaceRoot: string,
    config: Partial<LocalMemoryStoreConfig> = {}
  ) {
    this.config = { ...DEFAULT_STORE_CONFIG, ...config };
    this.dir = join(workspaceRoot, this.config.dataDir);
  }

  // === Public API ===

  async appendCandidate(candidate: MemoryCandidate): Promise<void> {
    // Validate before write
    const validation = validateMemoryCandidate(candidate);
    if (!validation.valid) {
      throw new Error(`Invalid candidate: ${validation.errors[0]}`);
    }

    await this.ensureDir();

    // Write to appropriate status file based on candidate status
    const statusFile = this.getStatusFile(candidate.status);
    await this.appendToFile(statusFile, candidate);

    // Audit log
    if (this.config.enableAudit) {
      await this.appendAuditEvent({
        id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        memoryId: candidate.id,
        event: "candidate_created",
        actor: "system",
        createdAt: new Date().toISOString(),
      });
    }
  }

  private getStatusFile(status: string): string {
    switch (status) {
      case "accepted":
        return FILES.accepted;
      case "rejected":
        return FILES.rejected;
      case "superseded":
        return FILES.superseded;
      case "expired":
        return FILES.expired;
      case "candidate":
      default:
        return FILES.candidates;
    }
  }

  async appendCandidates(candidates: MemoryCandidate[]): Promise<void> {
    for (const candidate of candidates) {
      await this.appendCandidate(candidate);
    }
  }

  async updateStatus(input: MemoryStatusUpdate): Promise<void> {
    const { id, status, reason, decidedBy, decidedAt } = input;

    // Find the candidate
    const candidate = await this.getById(id);
    if (!candidate) {
      throw new Error(`Memory not found: ${id}`);
    }

    // Create updated record
    const updated: MemoryCandidate = {
      ...candidate,
      status,
    };

    // Append to appropriate status file
    await this.ensureDir();
    switch (status) {
      case "accepted":
        await this.appendToFile(FILES.accepted, updated);
        break;
      case "rejected":
        await this.appendToFile(FILES.rejected, updated);
        break;
      case "superseded":
        await this.appendToFile(FILES.superseded, updated);
        break;
      case "expired":
        await this.appendToFile(FILES.expired, updated);
        break;
      case "contradicted":
        // contradicted goes to rejected for now
        await this.appendToFile(FILES.rejected, updated);
        break;
      default:
        throw new Error(`Invalid status transition: ${status}`);
    }

    // Audit log
    if (this.config.enableAudit) {
      const eventType: MemoryAuditEventType = `memory_${status}` as MemoryAuditEventType;
      await this.appendAuditEvent({
        id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        memoryId: id,
        event: eventType,
        reason,
        actor: decidedBy,
        createdAt: decidedAt,
      });
    }
  }

  async getById(id: string): Promise<MemoryCandidate | null> {
    // Search across all files
    const allRecords: MemoryCandidate[] = [];
    for (const file of Object.values(FILES)) {
      if (file === FILES.audit) continue;
      const records = await this.readFromFile(file);
      allRecords.push(...records);
    }

    // Deduplicate and find by ID
    const deduped = this.deduplicateRecords(allRecords);
    return deduped.find((r) => r.id === id) || null;
  }

  async list(query?: MemoryListQuery): Promise<MemoryCandidate[]> {
    const allRecords: MemoryCandidate[] = [];

    // Read from all status files
    for (const file of Object.values(FILES)) {
      if (file === FILES.audit) continue;
      const records = await this.readFromFile(file);
      allRecords.push(...records);
    }

    // Deduplicate by ID, keeping the latest status
    const deduped = this.deduplicateRecords(allRecords);

    // Apply filters
    let filtered = deduped;

    if (query?.status) {
      const statusSet = new Set(query.status);
      filtered = filtered.filter((r) => statusSet.has(r.status as any));
    }

    if (query?.scope) {
      const scopeSet = new Set(query.scope);
      filtered = filtered.filter((r) => scopeSet.has(r.scope));
    }

    if (query?.type) {
      const typeSet = new Set(query.type);
      filtered = filtered.filter((r) => typeSet.has(r.type));
    }

    if (query?.tags) {
      const tagSet = new Set(query.tags.map((t) => t.toLowerCase()));
      filtered = filtered.filter((r) =>
        r.tags.some((t) => tagSet.has(t.toLowerCase()))
      );
    }

    if (query?.sessionId) {
      filtered = filtered.filter(
        (r) => r.source.sessionId === query.sessionId
      );
    }

    // Sort by createdAt descending (newest first)
    filtered.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    // Apply limit
    if (query?.limit) {
      filtered = filtered.slice(0, query.limit);
    }

    return filtered;
  }

  async appendAuditEvent(event: MemoryAuditEvent): Promise<void> {
    await this.ensureDir();
    await this.appendToFile(FILES.audit, event);

    // Trim audit log if needed
    await this.trimAuditLog();
  }

  async getAuditLog(memoryId?: string): Promise<MemoryAuditEvent[]> {
    const records = await this.readFromFile<MemoryAuditEvent>(FILES.audit);
    if (memoryId) {
      return records.filter((r) => r.memoryId === memoryId);
    }
    return records;
  }

  // === Private Helpers ===

  private async ensureDir(): Promise<void> {
    if (!existsSync(this.dir)) {
      await mkdir(this.dir, { recursive: true });
    }
  }

  private getFilePath(filename: string): string {
    return join(this.dir, filename);
  }

  private async appendToFile<T>(filename: string, record: T): Promise<void> {
    const filePath = this.getFilePath(filename);
    const line = JSON.stringify(record) + "\n";
    await writeFile(filePath, line, { flag: "a" });
  }

  private async readFromFile<T>(filename: string): Promise<T[]> {
    const filePath = this.getFilePath(filename);
    if (!existsSync(filePath)) return [];

    const raw = await readFile(filePath, "utf-8");
    if (!raw.trim()) return [];

    return raw
      .trim()
      .split("\n")
      .map((line) => {
        try {
          return JSON.parse(line) as T;
        } catch {
          return null;
        }
      })
      .filter((r): r is T => r !== null);
  }

  private deduplicateRecords(records: MemoryCandidate[]): MemoryCandidate[] {
    // Deduplicate by ID, keeping the most recent status
    // Terminal states override active states
    const statusPriority: Record<string, number> = {
      superseded: 7,
      expired: 6,
      contradicted: 5,
      rejected: 4,
      accepted: 3,
      candidate: 2,
    };

    const recordMap = new Map<string, MemoryCandidate>();

    for (const record of records) {
      const existing = recordMap.get(record.id);
      if (!existing) {
        recordMap.set(record.id, record);
      } else {
        // Keep the one with higher priority (terminal states first)
        const recordPriority = statusPriority[record.status] || 0;
        const existingPriority = statusPriority[existing.status] || 0;
        if (recordPriority > existingPriority) {
          recordMap.set(record.id, record);
        }
      }
    }

    return Array.from(recordMap.values());
  }

  private async trimAuditLog(): Promise<void> {
    const records = await this.readFromFile<MemoryAuditEvent>(FILES.audit);
    if (records.length <= this.config.maxAuditEntries) return;

    // Keep only the most recent entries
    const trimmed = records.slice(-this.config.maxAuditEntries);
    const filePath = this.getFilePath(FILES.audit);
    const content = trimmed.map((r) => JSON.stringify(r)).join("\n") + "\n";
    await writeFile(filePath, content);
  }
}
