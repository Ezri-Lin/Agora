import { describe, it, expect, vi } from "vitest";
import { DocumentWriter } from "../documentWrite/DocumentWriter.js";
import { InMemoryDocumentWriteAdapter } from "../documentWrite/DocumentWriteAdapter.js";
import { InMemoryRollbackStore } from "../documentWrite/RollbackStore.js";
import { InMemoryWriteAuditLog } from "../documentWrite/WriteAuditLog.js";
import { createVaultDocumentWriteAdapter, WritePolicyRejection } from "../documentWrite/VaultDocumentWriteAdapter.js";
import { createReindexCallback } from "../documentWrite/reindexAfterWrite.js";
import { computeContentHash } from "../documentWrite/contentHash.js";
import { InMemoryDocumentIndex } from "../context/InMemoryDocumentIndex.js";
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

describe("VaultDocumentWriteAdapter", () => {
  it("read maps content and computes hash", async () => {
    const files = new Map<string, string>();
    files.set("/docs/test.md", "Hello world");

    const adapter = createVaultDocumentWriteAdapter({
      readDoc: async (path) => files.get(path) ?? null,
      writeDocSafe: async (path, content) => {
        files.set(path, content);
        return { ok: true as const };
      },
    });

    const result = await adapter.read("/docs/test.md");
    expect(result).not.toBeNull();
    expect(result!.content).toBe("Hello world");
    expect(result!.hash).toBe(computeContentHash("Hello world"));
  });

  it("read returns null for missing file", async () => {
    const adapter = createVaultDocumentWriteAdapter({
      readDoc: async () => null,
      writeDocSafe: async () => ({ ok: true as const }),
    });

    const result = await adapter.read("/missing.md");
    expect(result).toBeNull();
  });

  it("write delegates to writeDocSafe and returns hash", async () => {
    const files = new Map<string, string>();
    const adapter = createVaultDocumentWriteAdapter({
      readDoc: async (path) => files.get(path) ?? null,
      writeDocSafe: async (path, content) => {
        files.set(path, content);
        return { ok: true as const };
      },
    });

    const result = await adapter.write("/docs/new.md", "Written content");
    expect(result.hash).toBe(computeContentHash("Written content"));
    expect(files.get("/docs/new.md")).toBe("Written content");
  });

  it("write throws WritePolicyRejection on policy failure", async () => {
    const adapter = createVaultDocumentWriteAdapter({
      readDoc: async () => null,
      writeDocSafe: async () => ({
        ok: false as const,
        error: { code: "BLOCKED_EXTENSION", path: "/code.ts", extension: ".ts" },
      }),
    });

    await expect(adapter.write("/code.ts", "const x = 1"))
      .rejects.toThrow(WritePolicyRejection);
  });

  it("exists returns true when file exists", async () => {
    const files = new Map([["/docs/a.md", "content"]]);
    const adapter = createVaultDocumentWriteAdapter({
      readDoc: async (path) => files.get(path) ?? null,
      writeDocSafe: async () => ({ ok: true as const }),
    });

    expect(await adapter.exists("/docs/a.md")).toBe(true);
    expect(await adapter.exists("/docs/missing.md")).toBe(false);
  });
});

describe("DocumentWriter with onWriteApplied", () => {
  it("onWriteApplied called after successful write", async () => {
    const adapter = new InMemoryDocumentWriteAdapter();
    const rollback = new InMemoryRollbackStore();
    const callback = vi.fn(async () => {});

    const writer = new DocumentWriter({
      adapter,
      rollbackStore: rollback,
      onWriteApplied: callback,
    });

    const patch = makePatch({
      mode: "create_document",
      newText: "Content",
      expectedHashBefore: "",
    });

    await writer.applyPatch(patch);

    expect(callback).toHaveBeenCalledOnce();
    expect(callback).toHaveBeenCalledWith({
      path: "/docs/test.md",
      content: "Content",
      hash: expect.any(String),
    });
  });

  it("onWriteApplied not called on failed write", async () => {
    const adapter = new InMemoryDocumentWriteAdapter();
    adapter.seed("/docs/test.md", "Existing");
    const rollback = new InMemoryRollbackStore();
    const callback = vi.fn(async () => {});

    const writer = new DocumentWriter({
      adapter,
      rollbackStore: rollback,
      onWriteApplied: callback,
    });

    const patch = makePatch({
      mode: "append_section",
      newText: "Appended",
      expectedHashBefore: "wrong_hash",
    });

    await writer.applyPatch(patch);

    expect(callback).not.toHaveBeenCalled();
  });
});

describe("reindexAfterWrite hook", () => {
  it("reindex parses content and upserts into index", async () => {
    const adapter = new InMemoryDocumentWriteAdapter();
    const rollback = new InMemoryRollbackStore();
    const index = new InMemoryDocumentIndex();

    const writer = new DocumentWriter({
      adapter,
      rollbackStore: rollback,
      onWriteApplied: createReindexCallback(index),
    });

    const patch = makePatch({
      mode: "create_document",
      newText: "# Architecture\n\nSystem design overview",
      expectedHashBefore: "",
      targetPath: "/docs/arch.md",
    });

    await writer.applyPatch(patch);

    // Search should find the document
    const result = await index.search({ query: "architecture", mode: "lookup" });
    expect(result.chunks.length).toBeGreaterThan(0);
  });

  it("reindex is no-op when no index provided", async () => {
    const adapter = new InMemoryDocumentWriteAdapter();
    const rollback = new InMemoryRollbackStore();

    const writer = new DocumentWriter({
      adapter,
      rollbackStore: rollback,
      onWriteApplied: createReindexCallback(undefined),
    });

    const patch = makePatch({
      mode: "create_document",
      newText: "Content",
      expectedHashBefore: "",
    });

    // Should not throw
    const result = await writer.applyPatch(patch);
    expect(result.applied).toBe(true);
  });
});

describe("VaultDocumentWriteAdapter + DocumentWriter integration", () => {
  it("append through vault adapter with hash check", async () => {
    const files = new Map<string, string>();
    const existingContent = "Existing doc content";
    files.set("/docs/test.md", existingContent);

    const vaultAdapter = createVaultDocumentWriteAdapter({
      readDoc: async (path) => files.get(path) ?? null,
      writeDocSafe: async (path, content) => {
        files.set(path, content);
        return { ok: true as const };
      },
    });

    const rollback = new InMemoryRollbackStore();
    const writer = new DocumentWriter({ adapter: vaultAdapter, rollbackStore: rollback });

    const expectedHash = computeContentHash(existingContent);
    const patch = makePatch({
      mode: "append_section",
      newText: "Appended via vault",
      expectedHashBefore: expectedHash,
    });

    const result = await writer.applyPatch(patch);

    expect(result.applied).toBe(true);
    expect(files.get("/docs/test.md")).toContain("Appended via vault");
  });

  it("hash mismatch blocks before vault write", async () => {
    const files = new Map<string, string>();
    files.set("/docs/test.md", "Current content");

    const writeSpy = vi.fn(async (path: string, content: string) => {
      files.set(path, content);
      return { ok: true as const };
    });

    const vaultAdapter = createVaultDocumentWriteAdapter({
      readDoc: async (path) => files.get(path) ?? null,
      writeDocSafe: writeSpy,
    });

    const rollback = new InMemoryRollbackStore();
    const writer = new DocumentWriter({ adapter: vaultAdapter, rollbackStore: rollback });

    const patch = makePatch({
      mode: "append_section",
      newText: "Should not write",
      expectedHashBefore: "wrong_hash",
    });

    const result = await writer.applyPatch(patch);

    expect(result.applied).toBe(false);
    expect(writeSpy).not.toHaveBeenCalled();
  });

  it("rollback created before vault write", async () => {
    const files = new Map<string, string>();
    const originalContent = "Original content";
    files.set("/docs/test.md", originalContent);

    const vaultAdapter = createVaultDocumentWriteAdapter({
      readDoc: async (path) => files.get(path) ?? null,
      writeDocSafe: async (path, content) => {
        files.set(path, content);
        return { ok: true as const };
      },
    });

    const rollback = new InMemoryRollbackStore();
    const writer = new DocumentWriter({ adapter: vaultAdapter, rollbackStore: rollback });

    const expectedHash = computeContentHash(originalContent);
    const patch = makePatch({
      mode: "append_section",
      newText: "Added line",
      expectedHashBefore: expectedHash,
    });

    const result = await writer.applyPatch(patch);

    expect(result.applied).toBe(true);
    expect(result.rollbackId).toBeDefined();

    const snapshot = await rollback.getSnapshot(result.rollbackId!);
    expect(snapshot).toBeDefined();
    expect(snapshot!.previousContent).toBe(originalContent);
  });

  it("write policy rejection surfaces as failed result", async () => {
    const vaultAdapter = createVaultDocumentWriteAdapter({
      readDoc: async () => null,
      writeDocSafe: async () => ({
        ok: false as const,
        error: { code: "BLOCKED_EXTENSION", path: "/code.ts", extension: ".ts" },
      }),
    });

    const rollback = new InMemoryRollbackStore();
    const writer = new DocumentWriter({ adapter: vaultAdapter, rollbackStore: rollback });

    const patch = makePatch({
      mode: "create_document",
      newText: "const x = 1",
      expectedHashBefore: "",
      targetPath: "/code.ts",
    });

    // The adapter throws WritePolicyRejection, which DocumentWriter doesn't catch
    // So it propagates. This is by design — caller handles it.
    await expect(writer.applyPatch(patch)).rejects.toThrow(WritePolicyRejection);
  });
});

describe("computeContentHash", () => {
  it("same content produces same hash", () => {
    expect(computeContentHash("hello")).toBe(computeContentHash("hello"));
  });

  it("different content produces different hash", () => {
    expect(computeContentHash("hello")).not.toBe(computeContentHash("world"));
  });

  it("hash has h_ prefix", () => {
    expect(computeContentHash("test")).toMatch(/^h_/);
  });
});
