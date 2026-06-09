/**
 * InMemoryDocumentIndex — keyword-scoring document index.
 *
 * Stores DocumentMap + TextChunk[] in memory.
 * Search scores by title / heading / tag / text keyword matches.
 *
 * This is the MVP index for PR-6B.
 * SqliteDocumentIndex (PR-6C) will replace this for production use.
 */

import type { DocumentMap, TextChunk } from "./documentTypes.js";
import type { RetrievalQuery, RetrievalResult, RetrievedContextChunk } from "./types.js";
import type { DocumentIndex, ParsedDocumentInput } from "./DocumentIndex.js";

/** Weight multipliers for different match locations. */
const SCORE_WEIGHTS = {
  title: 5,
  heading: 3,
  tag: 2,
  text: 1,
  occurrence: 0.2,
} as const;

/** Max excerpts returned from a single chunk to keep results concise. */
const MAX_EXCERPT_CHARS = 2000;

export class InMemoryDocumentIndex implements DocumentIndex {
  private documents = new Map<string, DocumentMap>();
  private chunks = new Map<string, TextChunk>();

  async upsertDocument(input: ParsedDocumentInput): Promise<void> {
    const { document, chunks } = input;

    // Remove old document with same docId OR same path (re-upsert case)
    const existingByPath = [...this.documents.values()].find(
      (d) => d.path === document.path && d.docId !== document.docId,
    );
    if (existingByPath) {
      await this.removeDocument(existingByPath.docId);
    }
    await this.removeDocument(document.docId);

    this.documents.set(document.docId, document);
    for (const chunk of chunks) {
      this.chunks.set(chunk.chunkId, chunk);
    }
  }

  async removeDocument(docId: string): Promise<void> {
    this.documents.delete(docId);
    // Remove all chunks belonging to this document
    for (const [chunkId, chunk] of this.chunks) {
      if (chunk.docId === docId) {
        this.chunks.delete(chunkId);
      }
    }
  }

  async clear(): Promise<void> {
    this.documents.clear();
    this.chunks.clear();
  }

  async search(query: RetrievalQuery): Promise<RetrievalResult> {
    const { query: queryString, limit = 10, scope } = query;

    const warnings: string[] = [];

    if (this.chunks.size === 0) {
      warnings.push("Index is empty.");
      return { query, chunks: [], warnings };
    }

    const keywords = extractKeywords(queryString);
    if (keywords.length === 0) {
      warnings.push("Query has no searchable keywords.");
      return { query, chunks: [], warnings };
    }

    // Score all chunks
    const scored: Array<{ chunk: RetrievedContextChunk; score: number }> = [];

    for (const chunk of this.chunks.values()) {
      const doc = this.documents.get(chunk.docId);
      if (!doc) continue;

      // Apply scope filter
      if (scope?.paths?.length && !scope.paths.includes(chunk.path)) continue;

      const score = scoreChunk(chunk, doc, keywords);
      if (score <= 0) continue;

      scored.push({
        chunk: {
          id: chunk.chunkId,
          sourceId: chunk.docId,
          title: doc.title,
          path: chunk.path,
          headingPath: chunk.headingPath,
          excerpt: chunk.text.length > MAX_EXCERPT_CHARS
            ? chunk.text.slice(0, MAX_EXCERPT_CHARS) + "\n...[truncated]"
            : chunk.text,
          summary: chunk.summary,
          score,
          reason: buildReason(chunk, doc, keywords),
        },
        score,
      });
    }

    // Sort by score descending, apply limit
    scored.sort((a, b) => b.score - a.score);
    const limited = scored.slice(0, limit);

    return {
      query,
      chunks: limited.map((s) => s.chunk),
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  }

  /** Expose document count for testing. */
  get documentCount(): number {
    return this.documents.size;
  }

  /** Expose chunk count for testing. */
  get chunkCount(): number {
    return this.chunks.size;
  }
}

/** Extract searchable keywords from query string. */
function extractKeywords(query: string): string[] {
  return query
    .split(/[\s,，。、；：！？!?.\-\n]+/)
    .filter((w) => w.length >= 2)
    .map((w) => w.toLowerCase())
    .slice(0, 20);
}

/** Score a chunk against query keywords. */
function scoreChunk(chunk: TextChunk, doc: DocumentMap, keywords: string[]): number {
  let score = 0;

  const titleLower = doc.title.toLowerCase();
  const headingPathStr = chunk.headingPath.join(" ").toLowerCase();
  const textLower = chunk.text.toLowerCase();
  const tagStr = doc.tags.join(" ").toLowerCase();

  for (const kw of keywords) {
    let occurrences = 0;

    // Title match
    if (titleLower.includes(kw)) {
      score += SCORE_WEIGHTS.title;
      occurrences++;
    }

    // Heading match
    if (headingPathStr.includes(kw)) {
      score += SCORE_WEIGHTS.heading;
      occurrences++;
    }

    // Tag match
    if (tagStr.includes(kw)) {
      score += SCORE_WEIGHTS.tag;
      occurrences++;
    }

    // Text match
    const textMatches = countOccurrences(textLower, kw);
    if (textMatches > 0) {
      score += SCORE_WEIGHTS.text;
      occurrences += textMatches;
      // Bonus for repeated occurrences
      score += (textMatches - 1) * SCORE_WEIGHTS.occurrence;
    }
  }

  return score;
}

function countOccurrences(text: string, needle: string): number {
  let count = 0;
  let pos = 0;
  while (true) {
    const idx = text.indexOf(needle, pos);
    if (idx === -1) break;
    count++;
    pos = idx + needle.length;
  }
  return count;
}

/** Build a human-readable reason for why this chunk matched. */
function buildReason(chunk: TextChunk, doc: DocumentMap, keywords: string[]): string {
  const reasons: string[] = [];

  const titleLower = doc.title.toLowerCase();
  const headingPathStr = chunk.headingPath.join(" ").toLowerCase();
  const tagStr = doc.tags.join(" ").toLowerCase();

  for (const kw of keywords) {
    if (titleLower.includes(kw) && !reasons.includes("title")) {
      reasons.push("title");
    }
    if (headingPathStr.includes(kw) && !reasons.includes("heading")) {
      reasons.push("heading");
    }
    if (tagStr.includes(kw) && !reasons.includes("tag")) {
      reasons.push("tag");
    }
    if (chunk.text.toLowerCase().includes(kw) && !reasons.includes("text")) {
      reasons.push("text");
    }
  }

  return reasons.length > 0 ? `Matched ${reasons.join(", ")}` : "keyword match";
}
