import { describe, it, expect } from "vitest";
import { DocumentWriter } from "../documentWrite/DocumentWriter.js";
import { InMemoryDocumentWriteAdapter } from "../documentWrite/DocumentWriteAdapter.js";
import { InMemoryRollbackStore } from "../documentWrite/RollbackStore.js";
import { InMemoryWriteAuditLog } from "../documentWrite/WriteAuditLog.js";
import { verifyDocumentWrite } from "../documentWrite/DocumentWriteVerifier.js";
import type { DocumentPatch } from "../documentWrite/types.js";

function makePatch(overrides: Partial<DocumentPatch> = {}): DocumentPatch {
  return {
    planId: "plan_test",
    targetPath: "/docs/test.md",
    mode: "append_section",
    newText: "New content",
    expectedHashBefore: "h_ignored",
    ...overrides,
  };
}

describe("DocumentWriter", () => {
  it("create_document writes new content", async () => {
    const adapter = new InMemoryDocumentWriteAdapter();
    const rollback = new InMemoryRollbackStore();
    const writer = new DocumentWriter({ adapter, rollbackStore: rollback });

    const patch = makePatch({
      mode: "create_document",
      newText: "# New Doc\n\nHello world",
      expectedHashBefore: "",
    });

    const result = await writer.applyPatch(patch);

    expect(result.applied).toBe(true);
    expect(result.newHash).toBeDefined();

    const stored = await adapter.read("/docs/test.md");
    expect(stored?.content).toBe("# New Doc\n\nHello world");
  });

  it("append_section appends content", async () => {
    const adapter = new InMemoryDocumentWriteAdapter();
    const hash = adapter.seed("/docs/test.md", "Existing content");
    const rollback = new InMemoryRollbackStore();
    const writer = new DocumentWriter({ adapter, rollbackStore: rollback });

    const patch = makePatch({
      mode: "append_section",
      newText: "Appended line",
      expectedHashBefore: hash,
    });

    const result = await writer.applyPatch(patch);

    expect(result.applied).toBe(true);
    const stored = await adapter.read("/docs/test.md");
    expect(stored?.content).toBe("Existing content\n\nAppended line");
  });

  it("update_section replaces exact oldText", async () => {
    const adapter = new InMemoryDocumentWriteAdapter();
    const hash = adapter.seed("/docs/test.md", "Keep this\nOld section\nKeep this");
    const rollback = new InMemoryRollbackStore();
    const writer = new DocumentWriter({ adapter, rollbackStore: rollback });

    const patch = makePatch({
      mode: "update_section",
      oldText: "Old section",
      newText: "New section",
      expectedHashBefore: hash,
    });

    const result = await writer.applyPatch(patch);

    expect(result.applied).toBe(true);
    const stored = await adapter.read("/docs/test.md");
    expect(stored?.content).toBe("Keep this\nNew section\nKeep this");
  });

  it("hash mismatch blocks write", async () => {
    const adapter = new InMemoryDocumentWriteAdapter();
    adapter.seed("/docs/test.md", "Current content");
    const rollback = new InMemoryRollbackStore();
    const writer = new DocumentWriter({ adapter, rollbackStore: rollback });

    const patch = makePatch({
      mode: "append_section",
      newText: "Should not be appended",
      expectedHashBefore: "wrong_hash",
    });

    const result = await writer.applyPatch(patch);

    expect(result.applied).toBe(false);
    expect(result.warnings.some((w) => w.includes("Hash mismatch"))).toBe(true);

    // Content unchanged
    const stored = await adapter.read("/docs/test.md");
    expect(stored?.content).toBe("Current content");
  });

  it("rollback snapshot created before modifying existing file", async () => {
    const adapter = new InMemoryDocumentWriteAdapter();
    const hash = adapter.seed("/docs/test.md", "Original content");
    const rollback = new InMemoryRollbackStore();
    const writer = new DocumentWriter({ adapter, rollbackStore: rollback });

    const patch = makePatch({
      mode: "append_section",
      newText: "Added",
      expectedHashBefore: hash,
    });

    const result = await writer.applyPatch(patch);

    expect(result.applied).toBe(true);
    expect(result.rollbackId).toBeDefined();

    const snapshot = await rollback.getSnapshot(result.rollbackId!);
    expect(snapshot).toBeDefined();
    expect(snapshot!.previousContent).toBe("Original content");
    expect(snapshot!.previousHash).toBe(hash);
  });

  it("new document has no rollback snapshot", async () => {
    const adapter = new InMemoryDocumentWriteAdapter();
    const rollback = new InMemoryRollbackStore();
    const writer = new DocumentWriter({ adapter, rollbackStore: rollback });

    const patch = makePatch({
      mode: "create_document",
      newText: "Brand new",
      expectedHashBefore: "",
    });

    const result = await writer.applyPatch(patch);

    expect(result.applied).toBe(true);
    expect(result.rollbackId).toBeUndefined();
  });

  it("unsupported mode does not write", async () => {
    const adapter = new InMemoryDocumentWriteAdapter();
    const rollback = new InMemoryRollbackStore();
    const writer = new DocumentWriter({ adapter, rollbackStore: rollback });

    const patch = makePatch({ mode: "delete_section" as DocumentPatch["mode"] });
    const result = await writer.applyPatch(patch);

    expect(result.applied).toBe(false);
    expect(result.warnings.some((w) => w.includes("Unsupported"))).toBe(true);
  });

  it("audit entry created after successful write", async () => {
    const adapter = new InMemoryDocumentWriteAdapter();
    const rollback = new InMemoryRollbackStore();
    const auditLog = new InMemoryWriteAuditLog();
    const writer = new DocumentWriter({ adapter, rollbackStore: rollback, auditLog });

    const patch = makePatch({
      mode: "create_document",
      newText: "Audited content",
      expectedHashBefore: "",
    });

    await writer.applyPatch(patch);

    const entries = await auditLog.getAll();
    expect(entries).toHaveLength(1);
    expect(entries[0].targetPath).toBe("/docs/test.md");
    expect(entries[0].mode).toBe("create_document");
    expect(entries[0].actor).toBe("user_confirmed_ai");
  });

  it("oldText not found blocks update", async () => {
    const adapter = new InMemoryDocumentWriteAdapter();
    const hash = adapter.seed("/docs/test.md", "Some content");
    const rollback = new InMemoryRollbackStore();
    const writer = new DocumentWriter({ adapter, rollbackStore: rollback });

    const patch = makePatch({
      mode: "update_section",
      oldText: "Nonexistent text",
      newText: "Replacement",
      expectedHashBefore: hash,
    });

    const result = await writer.applyPatch(patch);

    expect(result.applied).toBe(false);
    expect(result.warnings.some((w) => w.includes("oldText not found"))).toBe(true);

    const stored = await adapter.read("/docs/test.md");
    expect(stored?.content).toBe("Some content");
  });

  it("write result includes newHash", async () => {
    const adapter = new InMemoryDocumentWriteAdapter();
    const rollback = new InMemoryRollbackStore();
    const writer = new DocumentWriter({ adapter, rollbackStore: rollback });

    const patch = makePatch({
      mode: "create_document",
      newText: "Content for hash",
      expectedHashBefore: "",
    });

    const result = await writer.applyPatch(patch);

    expect(result.applied).toBe(true);
    expect(result.newHash).toBeDefined();
    expect(result.newHash!.length).toBeGreaterThan(0);
  });

  it("adapter write not called on failed preflight", async () => {
    const adapter = new InMemoryDocumentWriteAdapter();
    const rollback = new InMemoryRollbackStore();
    const writer = new DocumentWriter({ adapter, rollbackStore: rollback });

    // File doesn't exist, append should fail
    const patch = makePatch({
      mode: "append_section",
      newText: "Should not write",
      expectedHashBefore: "any_hash",
    });

    const result = await writer.applyPatch(patch);

    expect(result.applied).toBe(false);
    const exists = await adapter.exists("/docs/test.md");
    expect(exists).toBe(false);
  });
});

describe("verifyDocumentWrite", () => {
  it("verification succeeds for valid JSON", () => {
    const patch = makePatch({
      targetPath: "/docs/config.json",
      newText: '{"key": "value"}',
    });

    const result = verifyDocumentWrite({
      patch,
      finalContent: '{"key": "value"}',
      finalHash: "hash",
    });

    expect(result.parseSucceeded).toBe(true);
    expect(result.warnings).toHaveLength(0);
  });

  it("verification fails for invalid JSON", () => {
    const patch = makePatch({
      targetPath: "/docs/bad.json",
      newText: "{invalid json}",
    });

    const result = verifyDocumentWrite({
      patch,
      finalContent: "{invalid json}",
      finalHash: "hash",
    });

    expect(result.parseSucceeded).toBe(false);
    expect(result.warnings.some((w) => w.includes("Invalid JSON"))).toBe(true);
  });

  it("verification warns when newText not found in final", () => {
    const patch = makePatch({
      mode: "append_section",
      newText: "Expected text",
    });

    const result = verifyDocumentWrite({
      patch,
      finalContent: "Something else entirely",
      finalHash: "hash",
    });

    expect(result.targetSectionFound).toBe(false);
    expect(result.warnings.some((w) => w.includes("not found"))).toBe(true);
  });
});
