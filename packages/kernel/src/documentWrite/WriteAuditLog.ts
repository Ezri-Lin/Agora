/**
 * WriteAuditLog — audit trail for document writes.
 *
 * PR-11: InMemoryWriteAuditLog for testing.
 */

import type { DocumentChangeMode } from "./types.js";

export interface DocumentWriteAuditEntry {
  id: string;
  timestamp: string;
  targetPath: string;
  mode: DocumentChangeMode;
  userIntent?: string;
  planSummary?: string;
  appliedPatchId: string;
  rollbackId?: string;
  actor: "user_confirmed_ai";
}

export interface WriteAuditLog {
  append(entry: DocumentWriteAuditEntry): Promise<void>;
  getAll(): Promise<DocumentWriteAuditEntry[]>;
}

let auditId = 0;

function generateAuditId(): string {
  return `audit_${Date.now()}_${++auditId}`;
}

export class InMemoryWriteAuditLog implements WriteAuditLog {
  private entries: DocumentWriteAuditEntry[] = [];

  async append(entry: DocumentWriteAuditEntry) {
    this.entries.push({
      ...entry,
      id: entry.id || generateAuditId(),
      timestamp: entry.timestamp || new Date().toISOString(),
    });
  }

  async getAll() {
    return [...this.entries];
  }
}
