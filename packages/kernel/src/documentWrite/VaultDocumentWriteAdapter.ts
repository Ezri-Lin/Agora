/**
 * VaultDocumentWriteAdapter — bridges DocumentWriteAdapter to vault-adapter.
 *
 * PR-12: Uses readDoc + writeDocSafe from @agora/vault-adapter.
 * Hash computed via shared computeContentHash.
 * Policy rejection surfaces as null write (caller handles via warnings).
 */

import type { DocumentWriteAdapter } from "./DocumentWriteAdapter.js";
import { computeContentHash } from "./contentHash.js";
import { detectKind } from "./detectKind.js";

type ReadDocFn = (path: string) => Promise<string | null>;
type WriteDocSafeFn = (path: string, content: string) => Promise<{ ok: true } | { ok: false; error: unknown }>;

export interface VaultDocumentWriteAdapterDeps {
  readDoc: ReadDocFn;
  writeDocSafe: WriteDocSafeFn;
}

/**
 * Creates a DocumentWriteAdapter backed by vault-adapter functions.
 *
 * Accepts functions as deps for testability — no direct import of @agora/vault-adapter.
 */
export function createVaultDocumentWriteAdapter(
  deps: VaultDocumentWriteAdapterDeps,
): DocumentWriteAdapter {
  const { readDoc, writeDocSafe } = deps;

  return {
    async read(path: string) {
      const content = await readDoc(path);
      if (content === null) return null;
      return {
        content,
        hash: computeContentHash(content),
        kind: detectKind(path),
      };
    },

    async write(path: string, content: string) {
      const result = await writeDocSafe(path, content);
      if (!result.ok) {
        throw new WritePolicyRejection(result.error);
      }
      return { hash: computeContentHash(content) };
    },

    async exists(path: string) {
      const content = await readDoc(path);
      return content !== null;
    },
  };
}

/** Typed error for vault write policy rejections. */
export class WritePolicyRejection extends Error {
  readonly policyError: unknown;

  constructor(policyError: unknown) {
    super("Write blocked by vault policy");
    this.name = "WritePolicyRejection";
    this.policyError = policyError;
  }
}
