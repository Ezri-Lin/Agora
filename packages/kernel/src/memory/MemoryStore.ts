import { join } from "node:path";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import type { MemoryCandidate } from "@agora/shared";
import { generateId, nowISO } from "@agora/shared";

const MEMORY_FILE = "memories.jsonl";

export class MemoryStore {
  private dir: string;

  constructor(workspaceRoot: string) {
    this.dir = join(workspaceRoot, ".agora", "memory");
  }

  private get filePath(): string {
    return join(this.dir, MEMORY_FILE);
  }

  private async ensureDir(): Promise<void> {
    if (!existsSync(this.dir)) {
      await mkdir(this.dir, { recursive: true });
    }
  }

  /** Load all memories from disk. */
  async loadAll(): Promise<MemoryCandidate[]> {
    if (!existsSync(this.filePath)) return [];
    const raw = await readFile(this.filePath, "utf-8");
    if (!raw.trim()) return [];
    return raw
      .trim()
      .split("\n")
      .map((line) => {
        try {
          return JSON.parse(line) as MemoryCandidate;
        } catch {
          return null;
        }
      })
      .filter((m): m is MemoryCandidate => m !== null);
  }

  /** Load accepted memories matching any of the given tags. */
  async loadByTags(tags: string[]): Promise<MemoryCandidate[]> {
    const all = await this.loadAll();
    const tagSet = new Set(tags.map((t) => t.toLowerCase()));
    return all.filter(
      (m) =>
        m.status === "accepted" &&
        m.tags.some((t) => tagSet.has(t.toLowerCase())),
    );
  }

  /** Save a new memory candidate. */
  async save(candidate: Omit<MemoryCandidate, "id" | "createdAt" | "status">): Promise<MemoryCandidate> {
    await this.ensureDir();
    const full: MemoryCandidate = {
      ...candidate,
      id: generateId("mem"),
      status: "candidate",
      createdAt: nowISO(),
    };
    await writeFile(this.filePath, JSON.stringify(full) + "\n", { flag: "a" });
    return full;
  }

  /** Update memory status. */
  async updateStatus(id: string, status: "accepted" | "rejected"): Promise<void> {
    const all = await this.loadAll();
    const idx = all.findIndex((m) => m.id === id);
    if (idx === -1) return;
    all[idx]!.status = status;
    await this.writeFile(all);
  }

  /** Overwrite the entire memories file. */
  private async writeFile(memories: MemoryCandidate[]): Promise<void> {
    await this.ensureDir();
    const content = memories.map((m) => JSON.stringify(m)).join("\n") + "\n";
    await writeFile(this.filePath, content);
  }
}
