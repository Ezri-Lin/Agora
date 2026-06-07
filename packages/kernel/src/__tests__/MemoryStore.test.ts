import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { MemoryStore } from "../memory/MemoryStore.js";
import { mkdir, rm, readFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

describe("MemoryStore", () => {
  let store: MemoryStore;
  let testDir: string;

  beforeEach(async () => {
    testDir = join(tmpdir(), `agora-test-${Date.now()}`);
    await mkdir(testDir, { recursive: true });
    store = new MemoryStore(testDir);
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  it("saves and loads a memory", async () => {
    const saved = await store.save({
      roomId: "room1",
      scope: "domain",
      domains: ["testing"],
      tags: ["unit", "test"],
      content: "Test memory content",
      confidence: 0.8,
    });

    expect(saved.id).toMatch(/^mem_/);
    expect(saved.status).toBe("candidate");
    expect(saved.content).toBe("Test memory content");

    const all = await store.loadAll();
    expect(all.length).toBe(1);
    expect(all[0]!.content).toBe("Test memory content");
  });

  it("loads by tags", async () => {
    const arch = await store.save({
      roomId: "room1",
      scope: "domain",
      domains: [],
      tags: ["architecture", "design"],
      content: "Architecture insight",
      confidence: 0.7,
    });

    await store.save({
      roomId: "room1",
      scope: "domain",
      domains: [],
      tags: ["cooking", "recipes"],
      content: "Cooking insight",
      confidence: 0.7,
    });

    await store.updateStatus(arch.id, "accepted");

    const matched = await store.loadByTags(["architecture"]);
    expect(matched.length).toBe(1);
    expect(matched[0]!.content).toBe("Architecture insight");
  });

  it("only loads accepted memories by tags", async () => {
    const saved = await store.save({
      roomId: "room1",
      scope: "domain",
      domains: [],
      tags: ["test"],
      content: "Candidate memory",
      confidence: 0.7,
    });

    const matched = await store.loadByTags(["test"]);
    expect(matched.length).toBe(0);

    await store.updateStatus(saved.id, "accepted");
    const accepted = await store.loadByTags(["test"]);
    expect(accepted.length).toBe(1);
  });

  it("updates memory status", async () => {
    const saved = await store.save({
      roomId: "room1",
      scope: "universal",
      domains: [],
      tags: ["test"],
      content: "Test",
      confidence: 0.7,
    });

    expect(saved.status).toBe("candidate");

    await store.updateStatus(saved.id, "accepted");
    const all = await store.loadAll();
    expect(all[0]!.status).toBe("accepted");

    await store.updateStatus(saved.id, "rejected");
    const updated = await store.loadAll();
    expect(updated[0]!.status).toBe("rejected");
  });

  it("persists to disk as JSONL", async () => {
    await store.save({
      roomId: "room1",
      scope: "domain",
      domains: [],
      tags: ["test"],
      content: "First",
      confidence: 0.7,
    });

    await store.save({
      roomId: "room1",
      scope: "universal",
      domains: [],
      tags: ["test"],
      content: "Second",
      confidence: 0.7,
    });

    const file = join(testDir, ".agora", "memory", "memories.jsonl");
    const raw = await readFile(file, "utf-8");
    const lines = raw.trim().split("\n");
    expect(lines.length).toBe(2);

    const first = JSON.parse(lines[0]!);
    expect(first.content).toBe("First");
  });

  it("returns empty array when no file exists", async () => {
    const all = await store.loadAll();
    expect(all).toEqual([]);
  });
});
