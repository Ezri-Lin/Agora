import { extname } from "node:path";
import type { Result } from "@agora/shared";
import { ok, err } from "@agora/shared";

const ALLOWED_EXTENSIONS = new Set([
  ".md", ".txt", ".json", ".jsonl",
  ".yaml", ".yml", ".toml", ".csv",
]);

const BLOCKED_EXTENSIONS = new Set([
  ".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs",
  ".py", ".swift", ".rs", ".go", ".java", ".kt",
  ".c", ".cpp", ".h", ".hpp", ".cs", ".rb",
  ".sh", ".bash", ".zsh",
  ".exe", ".dll", ".so", ".dylib", ".bin",
  ".wasm", ".node",
]);

export interface WritePolicyError {
  code: "BLOCKED_EXTENSION" | "UNKNOWN_EXTENSION";
  path: string;
  extension: string;
}

/**
 * Check if a file path is safe to write under docs-only policy.
 * Returns ok(void) if allowed, err(WritePolicyError) if blocked.
 */
export function checkWritePolicy(filePath: string): Result<void, WritePolicyError> {
  const ext = extname(filePath).toLowerCase();

  if (ALLOWED_EXTENSIONS.has(ext)) return ok(undefined);
  if (BLOCKED_EXTENSIONS.has(ext)) {
    return err({ code: "BLOCKED_EXTENSION", path: filePath, extension: ext });
  }

  // Unknown extensions default to blocked for safety
  return err({ code: "UNKNOWN_EXTENSION", path: filePath, extension: ext });
}
