import { writeFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import { existsSync } from "node:fs";
import type { Result } from "@agora/shared";
import { ok, err } from "@agora/shared";
import { checkWritePolicy, type WritePolicyError } from "./filePolicy.js";

/**
 * Write a file only if it passes the docs-only write policy.
 * Creates parent directories if needed.
 */
export async function writeDocSafe(
  filePath: string,
  content: string,
): Promise<Result<void, WritePolicyError>> {
  const check = checkWritePolicy(filePath);
  if (!check.ok) return check;

  const dir = dirname(filePath);
  if (!existsSync(dir)) {
    await mkdir(dir, { recursive: true });
  }

  await writeFile(filePath, content, "utf-8");
  return ok(undefined);
}
