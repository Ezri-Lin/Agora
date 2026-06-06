import { readdir, stat } from "node:fs/promises";
import { join, extname } from "node:path";

export interface ScannedFile {
  path: string;
  name: string;
  ext: string;
  isDirectory: boolean;
}

const DOC_EXTENSIONS = new Set([".md", ".txt", ".json", ".yaml", ".yml"]);

/** Scan workspace for document files — shallow scan, non-recursive */
export async function scanWorkspace(root: string): Promise<ScannedFile[]> {
  const entries = await readdir(root, { withFileTypes: true });
  const results: ScannedFile[] = [];

  for (const entry of entries) {
    if (entry.name.startsWith(".")) continue;
    const fullPath = join(root, entry.name);
    const ext = extname(entry.name).toLowerCase();

    if (entry.isDirectory()) {
      results.push({ path: fullPath, name: entry.name, ext: "", isDirectory: true });
    } else if (DOC_EXTENSIONS.has(ext)) {
      results.push({ path: fullPath, name: entry.name, ext, isDirectory: false });
    }
  }

  return results;
}
