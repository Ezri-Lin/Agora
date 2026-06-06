import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";

export async function readDoc(path: string): Promise<string | null> {
  if (!existsSync(path)) return null;
  return readFile(path, "utf-8");
}
