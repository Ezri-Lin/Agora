import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";

export async function ensureDir(path: string): Promise<void> {
  if (!existsSync(path)) {
    await mkdir(path, { recursive: true });
  }
}

export async function writeJSON(path: string, data: unknown): Promise<void> {
  await writeFile(path, JSON.stringify(data, null, 2), "utf-8");
}

export async function readJSON<T>(path: string): Promise<T> {
  const raw = await readFile(path, "utf-8");
  return JSON.parse(raw) as T;
}

export async function writeJSONL(path: string, records: unknown[]): Promise<void> {
  const lines = records.map((r) => JSON.stringify(r)).join("\n") + "\n";
  await writeFile(path, lines, "utf-8");
}

export async function appendJSONL(path: string, record: unknown): Promise<void> {
  const line = JSON.stringify(record) + "\n";
  await writeFile(path, line, { flag: "a" });
}

export async function readJSONL<T>(path: string): Promise<T[]> {
  const raw = await readFile(path, "utf-8");
  if (!raw.trim()) return [];
  return raw
    .trim()
    .split("\n")
    .map((line) => JSON.parse(line) as T);
}

export async function writeText(path: string, content: string): Promise<void> {
  await writeFile(path, content, "utf-8");
}

export async function readText(path: string): Promise<string> {
  return readFile(path, "utf-8");
}
