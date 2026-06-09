/**
 * DocumentWriteAdapter — abstract boundary for document read/write.
 *
 * PR-11: InMemoryDocumentWriteAdapter for testing.
 * Real fs / vault-adapter integration deferred to PR-12.
 */

import { computeContentHash } from "./contentHash.js";

export interface DocumentWriteAdapter {
  read(path: string): Promise<{
    content: string;
    hash: string;
    kind?: "markdown" | "text" | "json" | "yaml" | "code";
  } | null>;

  write(path: string, content: string): Promise<{
    hash: string;
  }>;

  exists(path: string): Promise<boolean>;
}

export class InMemoryDocumentWriteAdapter implements DocumentWriteAdapter {
  private store = new Map<string, { content: string; hash: string }>();

  async read(path: string) {
    const entry = this.store.get(path);
    if (!entry) return null;
    return { content: entry.content, hash: entry.hash };
  }

  async write(path: string, content: string) {
    const hash = computeContentHash(content);
    this.store.set(path, { content, hash });
    return { hash };
  }

  async exists(path: string) {
    return this.store.has(path);
  }

  /** Seed content for testing. */
  seed(path: string, content: string) {
    const hash = computeContentHash(content);
    this.store.set(path, { content, hash });
    return hash;
  }
}
