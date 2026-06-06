import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";

/** Load BOOT.md from workspace root — stub implementation */
export async function loadBootPack(workspaceRoot: string): Promise<string> {
  const bootPath = `${workspaceRoot}/.agora/BOOT.md`;
  if (!existsSync(bootPath)) return "";
  return readFile(bootPath, "utf-8");
}
