import { appendFileSync } from "node:fs";
import { join } from "node:path";
import { app } from "electron";

let auditPath: string | null = null;

function getAuditPath(): string {
  if (!auditPath) {
    auditPath = join(app.getPath("userData"), "audit.jsonl");
  }
  return auditPath;
}

interface AuditEntry {
  ts: string;
  action: string;
  target?: string;
  detail?: string;
  ok: boolean;
  error?: string;
}

/**
 * Append an audit log entry. Never throws — logging must not break the app.
 */
export function auditLog(
  action: string,
  opts: { target?: string; detail?: string; ok?: boolean; error?: string } = {},
): void {
  try {
    const entry: AuditEntry = {
      ts: new Date().toISOString(),
      action,
      target: opts.target,
      detail: opts.detail,
      ok: opts.ok ?? true,
      error: opts.error,
    };
    appendFileSync(getAuditPath(), JSON.stringify(entry) + "\n");
  } catch {
    // Audit logging must never crash the app
  }
}
