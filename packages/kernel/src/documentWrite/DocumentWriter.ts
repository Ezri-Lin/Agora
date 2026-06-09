/**
 * DocumentWriter — apply patches with preflight checks, rollback, verify, audit.
 *
 * PR-11: MVP supports create_document, append_section, update_section.
 * Other modes return unsupported warning without writing.
 */

import type { DocumentPatch, DocumentChangeMode } from "./types.js";
import type { DocumentWriteAdapter } from "./DocumentWriteAdapter.js";
import type { RollbackStore, RollbackSnapshot } from "./RollbackStore.js";
import type { WriteAuditLog, DocumentWriteAuditEntry } from "./WriteAuditLog.js";
import { verifyDocumentWrite, type DocumentWriteVerification } from "./DocumentWriteVerifier.js";

export interface ApplyDocumentPatchResult {
  patchId: string;
  targetPath: string;
  applied: boolean;
  newHash?: string;
  rollbackId?: string;
  verification?: DocumentWriteVerification;
  auditEntry?: DocumentWriteAuditEntry;
  warnings: string[];
}

const SUPPORTED_MODES: DocumentChangeMode[] = [
  "create_document",
  "append_section",
  "update_section",
];

export interface WriteAppliedCallback {
  (args: { path: string; content: string; hash: string }): Promise<void>;
}

export class DocumentWriter {
  private adapter: DocumentWriteAdapter;
  private rollbackStore: RollbackStore;
  private auditLog?: WriteAuditLog;
  private onWriteApplied?: WriteAppliedCallback;

  constructor(args: {
    adapter: DocumentWriteAdapter;
    rollbackStore: RollbackStore;
    auditLog?: WriteAuditLog;
    onWriteApplied?: WriteAppliedCallback;
  }) {
    this.adapter = args.adapter;
    this.rollbackStore = args.rollbackStore;
    this.auditLog = args.auditLog;
    this.onWriteApplied = args.onWriteApplied;
  }

  async applyPatch(patch: DocumentPatch): Promise<ApplyDocumentPatchResult> {
    const warnings: string[] = [];

    // 0. Check mode is supported
    if (!SUPPORTED_MODES.includes(patch.mode)) {
      warnings.push(`Unsupported mode: ${patch.mode}. Only ${SUPPORTED_MODES.join(", ")} are supported.`);
      return { patchId: patch.planId, targetPath: patch.targetPath, applied: false, warnings };
    }

    // 1. Read current file
    const existing = await this.adapter.read(patch.targetPath);

    // 2. Hash preflight
    if (patch.mode === "create_document") {
      if (existing) {
        warnings.push("Target already exists for create_document");
      }
    } else {
      // For non-create modes, file must exist
      if (!existing) {
        warnings.push("Target file does not exist");
        return { patchId: patch.planId, targetPath: patch.targetPath, applied: false, warnings };
      }
      // Check expected hash
      if (existing.hash !== patch.expectedHashBefore) {
        warnings.push(`Hash mismatch: expected ${patch.expectedHashBefore}, got ${existing.hash}`);
        return { patchId: patch.planId, targetPath: patch.targetPath, applied: false, warnings };
      }
    }

    // 3. Compute final content
    const currentContent = existing?.content ?? "";
    const finalContent = computeFinalContent(patch, currentContent, warnings);
    if (finalContent === null) {
      return { patchId: patch.planId, targetPath: patch.targetPath, applied: false, warnings };
    }

    // 4. Create rollback snapshot before modifying
    let rollbackSnapshot: RollbackSnapshot | undefined;
    if (existing) {
      rollbackSnapshot = await this.rollbackStore.createSnapshot({
        targetPath: patch.targetPath,
        previousHash: existing.hash,
        previousContent: existing.content,
        reason: `Pre-apply rollback for patch ${patch.planId}`,
      });
    }

    // 5. Write
    const { hash: newHash } = await this.adapter.write(patch.targetPath, finalContent);

    // 6. Verify
    const verification = verifyDocumentWrite({
      patch,
      finalContent,
      finalHash: newHash,
    });

    if (!verification.parseSucceeded || !verification.targetSectionFound) {
      warnings.push("Verification failed after write");
    }

    // 7. Audit entry
    let auditEntry: DocumentWriteAuditEntry | undefined;
    if (this.auditLog) {
      auditEntry = {
        id: "",
        timestamp: "",
        targetPath: patch.targetPath,
        mode: patch.mode,
        appliedPatchId: patch.planId,
        rollbackId: rollbackSnapshot?.rollbackId,
        actor: "user_confirmed_ai",
      };
      await this.auditLog.append(auditEntry);
    }

    // 8. onWriteApplied callback (e.g. reindex)
    if (this.onWriteApplied) {
      await this.onWriteApplied({
        path: patch.targetPath,
        content: finalContent,
        hash: newHash,
      });
    }

    return {
      patchId: patch.planId,
      targetPath: patch.targetPath,
      applied: true,
      newHash,
      rollbackId: rollbackSnapshot?.rollbackId,
      verification,
      auditEntry,
      warnings,
    };
  }
}

/** Compute final content for supported modes. Returns null if patch cannot be applied. */
function computeFinalContent(
  patch: DocumentPatch,
  currentContent: string,
  warnings: string[],
): string | null {
  switch (patch.mode) {
    case "create_document":
      return patch.newText;

    case "append_section":
      if (currentContent.length > 0) {
        return currentContent + "\n\n" + patch.newText;
      }
      return patch.newText;

    case "update_section": {
      if (!patch.oldText) {
        warnings.push("update_section requires oldText");
        return null;
      }
      if (!currentContent.includes(patch.oldText)) {
        warnings.push("oldText not found in current content");
        return null;
      }
      // Replace first occurrence
      return currentContent.replace(patch.oldText, patch.newText);
    }

    default:
      warnings.push(`Unsupported mode: ${patch.mode}`);
      return null;
  }
}
