/**
 * SqliteDocumentIndex — FTS5-backed persistent document index.
 *
 * PR-13: Uses better-sqlite3 for synchronous SQLite with FTS5.
 * Drop-in replacement for InMemoryDocumentIndex.
 */

import type { DocumentMap, TextChunk } from "./documentTypes.js";
import type { RetrievalQuery, RetrievalResult, RetrievedContextChunk } from "./types.js";
import type { DocumentIndex, ParsedDocumentInput } from "./DocumentIndex.js";

/** Weight multipliers for different match locations. */
const SCORE_WEIGHTS = {
  ftsBase: 1,
  title: 0.25,
  heading: 0.15,
} as const;

const MAX_EXCERPT_CHARS = 2000;

export class SqliteDocumentIndex implements DocumentIndex {
  private db: import("better-sqlite3").Database;

  constructor(db: import("better-sqlite3").Database) {
    this.db = db;
    this.initSchema();
  }

  private initSchema() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS documents (
        id TEXT PRIMARY KEY,
        path TEXT NOT NULL UNIQUE,
        title TEXT NOT NULL,
        kind TEXT NOT NULL,
        content_hash TEXT NOT NULL,
        modified_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS chunks (
        id TEXT PRIMARY KEY,
        document_id TEXT NOT NULL,
        path TEXT NOT NULL,
        heading_path TEXT NOT NULL DEFAULT '[]',
        text TEXT NOT NULL,
        token_estimate INTEGER NOT NULL DEFAULT 0,
        summary TEXT,
        FOREIGN KEY(document_id) REFERENCES documents(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_chunks_document_id ON chunks(document_id);
    `);

    // FTS5 virtual table — must not use IF NOT EXISTS (SQLite limitation)
    const ftsExists = this.db.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='chunk_fts'"
    ).get();

    if (!ftsExists) {
      this.db.exec(`
        CREATE VIRTUAL TABLE chunk_fts USING fts5(
          chunk_id UNINDEXED,
          title,
          heading_path,
          text
        )
      `);
    }
  }

  async upsertDocument(input: ParsedDocumentInput): Promise<void> {
    const { document, chunks } = input;

    const upsert = this.db.transaction(() => {
      // Remove existing document by path (handles re-upsert with different docId)
      const existing = this.db.prepare(
        "SELECT id FROM documents WHERE path = ?"
      ).get(document.path) as { id: string } | undefined;

      if (existing) {
        this.deleteDocumentRows(existing.id);
      }

      // Also remove by docId if different
      this.deleteDocumentRows(document.docId);

      // Insert document
      this.db.prepare(`
        INSERT INTO documents (id, path, title, kind, content_hash, modified_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(
        document.docId,
        document.path,
        document.title,
        document.kind,
        document.contentHash,
        document.lastModified ?? new Date().toISOString(),
      );

      // Insert chunks
      const insertChunk = this.db.prepare(`
        INSERT INTO chunks (id, document_id, path, heading_path, text, token_estimate, summary)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);

      const insertFts = this.db.prepare(`
        INSERT INTO chunk_fts (chunk_id, title, heading_path, text)
        VALUES (?, ?, ?, ?)
      `);

      for (const chunk of chunks) {
        insertChunk.run(
          chunk.chunkId,
          chunk.docId,
          chunk.path,
          JSON.stringify(chunk.headingPath),
          chunk.text,
          chunk.tokenEstimate,
          chunk.summary ?? null,
        );

        insertFts.run(
          chunk.chunkId,
          document.title,
          chunk.headingPath.join(" "),
          chunk.text,
        );
      }
    });

    upsert();
  }

  async removeDocument(docId: string): Promise<void> {
    this.db.transaction(() => {
      this.deleteDocumentRows(docId);
    })();
  }

  async clear(): Promise<void> {
    this.db.exec(`
      DELETE FROM chunk_fts;
      DELETE FROM chunks;
      DELETE FROM documents;
    `);
  }

  async search(query: RetrievalQuery): Promise<RetrievalResult> {
    const { query: queryString, limit = 10, scope } = query;
    const warnings: string[] = [];

    const docCount = (this.db.prepare("SELECT COUNT(*) as c FROM documents").get() as { c: number }).c;
    if (docCount === 0) {
      warnings.push("Index is empty.");
      return { query, chunks: [], warnings };
    }

    const ftsQuery = toFtsQuery(queryString);
    if (!ftsQuery) {
      warnings.push("Query has no searchable keywords.");
      return { query, chunks: [], warnings };
    }

    // Build scope filter
    let scopeJoin = "";
    let scopeWhere = "";
    const params: unknown[] = [ftsQuery, limit];

    if (scope?.paths?.length) {
      const placeholders = scope.paths.map(() => "?").join(",");
      scopeWhere = `AND documents.path IN (${placeholders})`;
      params.splice(1, 0, ...scope.paths);
    }

    const rows = this.db.prepare(`
      SELECT
        chunks.id as chunk_id,
        chunks.document_id,
        documents.title,
        documents.path,
        chunks.heading_path,
        chunks.text,
        chunks.summary,
        bm25(chunk_fts, 1.0, 1.0, 0.5, 1.0) as rank
      FROM chunk_fts
      JOIN chunks ON chunks.id = chunk_fts.chunk_id
      JOIN documents ON documents.id = chunks.document_id
      WHERE chunk_fts MATCH ?
      ${scopeWhere}
      ORDER BY rank
      LIMIT ?
    `).all(...params) as Array<{
      chunk_id: string;
      document_id: string;
      title: string;
      path: string;
      heading_path: string;
      text: string;
      summary: string | null;
      rank: number;
    }>;

    const chunks: RetrievedContextChunk[] = rows.map((row) => {
      const headingPath: string[] = JSON.parse(row.heading_path);

      // Convert bm25 (lower = more relevant) to score (higher = more relevant)
      const ftsScore = 1 / (1 + Math.max(0, -row.rank));

      // Boost for title match
      let boost = 0;
      const queryLower = queryString.toLowerCase();
      if (row.title.toLowerCase().includes(queryLower)) {
        boost += SCORE_WEIGHTS.title;
      }
      const headingStr = headingPath.join(" ").toLowerCase();
      if (headingStr.includes(queryLower)) {
        boost += SCORE_WEIGHTS.heading;
      }

      const score = ftsScore + boost;

      return {
        id: row.chunk_id,
        sourceId: row.document_id,
        title: row.title,
        path: row.path,
        headingPath,
        excerpt: row.text.length > MAX_EXCERPT_CHARS
          ? row.text.slice(0, MAX_EXCERPT_CHARS) + "\n...[truncated]"
          : row.text,
        summary: row.summary ?? undefined,
        score,
        reason: buildReason(row.title, headingPath, queryString),
      };
    });

    return {
      query,
      chunks,
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  }

  private deleteDocumentRows(docId: string) {
    // Get chunk IDs for FTS cleanup
    const chunks = this.db.prepare(
      "SELECT id FROM chunks WHERE document_id = ?"
    ).all(docId) as Array<{ id: string }>;

    for (const chunk of chunks) {
      this.db.prepare("DELETE FROM chunk_fts WHERE chunk_id = ?").run(chunk.id);
    }

    this.db.prepare("DELETE FROM chunks WHERE document_id = ?").run(docId);
    this.db.prepare("DELETE FROM documents WHERE id = ?").run(docId);
  }
}

/** Convert user query to safe FTS5 query. */
function toFtsQuery(query: string): string {
  const terms = query
    .split(/\s+/)
    .filter(Boolean)
    .map((t) => t.replace(/"/g, '""'))
    .filter((t) => t.length >= 2);

  if (terms.length === 0) return "";

  return terms.map((t) => `"${t}"`).join(" OR ");
}

/** Build human-readable reason for match. */
function buildReason(title: string, headingPath: string[], query: string): string {
  const reasons: string[] = [];
  const queryLower = query.toLowerCase();

  if (title.toLowerCase().includes(queryLower)) reasons.push("title");
  if (headingPath.join(" ").toLowerCase().includes(queryLower)) reasons.push("heading");

  return reasons.length > 0 ? `Matched ${reasons.join(", ")}` : "FTS match";
}
