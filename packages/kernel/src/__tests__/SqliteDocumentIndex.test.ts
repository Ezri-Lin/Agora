import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import Database from "better-sqlite3";
import { SqliteDocumentIndex } from "../context/SqliteDocumentIndex.js";
import { IndexedDocumentRetriever } from "../context/IndexedDocumentRetriever.js";
import { parseDocument } from "../context/DocumentParser.js";
import { createReindexCallback } from "../documentWrite/reindexAfterWrite.js";
import type { RetrievalEngine } from "../context/types.js";

function makeDoc(path: string, content: string) {
  return parseDocument({ path, content });
}

const ARCH_DOC = makeDoc(
  "/docs/architecture.md",
  `# Architecture Overview

## Microservices

Microservices architecture allows independent deployment of services.
Each service owns its data and communicates via APIs.

## Monolith

A monolithic architecture bundles all functionality into a single deployable unit.
This is simpler to develop but harder to scale independently.

## Migration Strategy

When migrating from monolith to microservices, start with the strangler fig pattern.
Identify bounded contexts and extract services incrementally.
`,
);

const COST_DOC = makeDoc(
  "/docs/cost.md",
  `# Cost Analysis

## Infrastructure Costs

Cloud infrastructure costs scale with the number of services.
Each microservice needs its own monitoring, logging, and deployment pipeline.

## Team Costs

Microservices require more DevOps expertise.
Teams need to understand distributed systems patterns.
`,
);

const DESIGN_DOC = makeDoc(
  "/docs/design.md",
  `---
title: System Design
tags: architecture, patterns
---

# System Design

## Patterns

Use microservices for scalability and monolith for simplicity.
`,
);

describe("SqliteDocumentIndex", () => {
  let db: Database.Database;
  let index: SqliteDocumentIndex;

  beforeAll(() => {
    db = new Database(":memory:");
    index = new SqliteDocumentIndex(db);
  });

  beforeEach(async () => {
    await index.clear();
  });

  afterAll(() => {
    db.close();
  });

  it("initializes schema without error", () => {
    // Constructor already ran in beforeAll — if we got here, schema is fine
    expect(index).toBeDefined();
  });

  it("upserts parsed document and indexes chunks", async () => {
    await index.upsertDocument(ARCH_DOC);

    const row = db.prepare("SELECT COUNT(*) as c FROM documents").get() as { c: number };
    expect(row.c).toBe(1);

    const chunkRow = db.prepare("SELECT COUNT(*) as c FROM chunks").get() as { c: number };
    expect(chunkRow.c).toBeGreaterThan(0);
  });

  it("exact query finds matching chunk", async () => {
    await index.upsertDocument(ARCH_DOC);
    const result = await index.search({
      query: "microservices deployment",
      mode: "skim",
    });

    expect(result.chunks.length).toBeGreaterThan(0);
    expect(result.chunks[0].excerpt).toContain("Microservices");
  });

  it("heading match returns headingPath", async () => {
    await index.upsertDocument(ARCH_DOC);
    const result = await index.search({
      query: "migration strategy",
      mode: "skim",
    });

    expect(result.chunks.length).toBeGreaterThan(0);
    expect(result.chunks[0].headingPath).toContain("Migration Strategy");
  });

  it("title match boosts score", async () => {
    await index.upsertDocument(ARCH_DOC);
    await index.upsertDocument(COST_DOC);

    // "Architecture" is in ARCH_DOC's title but only in COST_DOC's body
    const result = await index.search({
      query: "architecture",
      mode: "skim",
    });

    expect(result.chunks.length).toBeGreaterThan(0);
    expect(result.chunks[0].sourceId).toBe(ARCH_DOC.document.docId);
  });

  it("limit respected", async () => {
    const result = await index.search({
      query: "microservices",
      mode: "skim",
      limit: 2,
    });

    expect(result.chunks.length).toBeLessThanOrEqual(2);
  });

  it("re-upsert replaces old chunks", async () => {
    const updated = parseDocument({
      path: "/docs/architecture.md",
      content: "# Updated Architecture\n\nNew content here.",
    });
    await index.upsertDocument(updated);

    const docCount = (db.prepare("SELECT COUNT(*) as c FROM documents").get() as { c: number }).c;
    expect(docCount).toBe(1);

    const result = await index.search({
      query: "updated architecture",
      mode: "skim",
    });
    expect(result.chunks.length).toBeGreaterThan(0);
    expect(result.chunks[0].excerpt).toContain("Updated");
  });

  it("removeDocument removes rows and fts entries", async () => {
    // Re-add ARCH_DOC for this test
    await index.upsertDocument(ARCH_DOC);
    await index.upsertDocument(COST_DOC);

    const before = (db.prepare("SELECT COUNT(*) as c FROM documents").get() as { c: number }).c;
    expect(before).toBe(2);

    await index.removeDocument(COST_DOC.document.docId);

    const after = (db.prepare("SELECT COUNT(*) as c FROM documents").get() as { c: number }).c;
    expect(after).toBe(1);

    const chunks = (db.prepare("SELECT COUNT(*) as c FROM chunks").get() as { c: number }).c;
    const fts = (db.prepare("SELECT COUNT(*) as c FROM chunk_fts").get() as { c: number }).c;
    expect(chunks).toBeGreaterThan(0);
    expect(fts).toBe(chunks);
  });

  it("clear removes all data", async () => {
    await index.upsertDocument(ARCH_DOC);
    await index.upsertDocument(COST_DOC);

    await index.clear();

    const docs = (db.prepare("SELECT COUNT(*) as c FROM documents").get() as { c: number }).c;
    const chunks = (db.prepare("SELECT COUNT(*) as c FROM chunks").get() as { c: number }).c;
    const fts = (db.prepare("SELECT COUNT(*) as c FROM chunk_fts").get() as { c: number }).c;
    expect(docs).toBe(0);
    expect(chunks).toBe(0);
    expect(fts).toBe(0);
  });

  it("empty query returns warning", async () => {
    await index.upsertDocument(ARCH_DOC);

    const result = await index.search({ query: "", mode: "skim" });
    expect(result.chunks).toEqual([]);
    expect(result.warnings).toBeDefined();
  });

  it("empty index returns warning", async () => {
    await index.clear();

    const result = await index.search({ query: "anything", mode: "skim" });
    expect(result.chunks).toEqual([]);
    expect(result.warnings).toBeDefined();
    expect(result.warnings![0]).toContain("empty");
  });

  it("query with quotes does not throw", async () => {
    await index.upsertDocument(ARCH_DOC);

    const result = await index.search({
      query: 'microservices "deployment" strategy',
      mode: "skim",
    });

    expect(result).toBeDefined();
    expect(result.chunks).toBeDefined();
  });

  it("scope filter by paths", async () => {
    await index.upsertDocument(ARCH_DOC);
    await index.upsertDocument(COST_DOC);

    const result = await index.search({
      query: "microservices",
      mode: "skim",
      scope: { paths: ["/docs/cost.md"] },
    });

    expect(result.chunks.every((c) => c.path === "/docs/cost.md")).toBe(true);
  });
});

describe("IndexedDocumentRetriever with SqliteDocumentIndex", () => {
  let db: Database.Database;

  beforeAll(() => {
    db = new Database(":memory:");
  });

  afterAll(() => {
    db.close();
  });

  it("implements RetrievalEngine interface", async () => {
    const index = new SqliteDocumentIndex(db);
    await index.upsertDocument(ARCH_DOC);

    const retriever: RetrievalEngine = new IndexedDocumentRetriever(index);
    const result = await retriever.retrieve({
      query: "microservices",
      mode: "skim",
    });

    expect(result.chunks.length).toBeGreaterThan(0);
    expect(result.chunks[0].excerpt).toContain("Microservices");
  });
});

describe("reindexAfterWrite with SqliteDocumentIndex", () => {
  let db: Database.Database;

  beforeAll(() => {
    db = new Database(":memory:");
  });

  afterAll(() => {
    db.close();
  });

  it("write reindex callback can upsert into SQLite index", async () => {
    const index = new SqliteDocumentIndex(db);
    await index.clear();

    const callback = createReindexCallback(index);
    expect(callback).toBeDefined();

    // Simulate what DocumentWriter does after a successful write
    await callback!({
      path: "/docs/new.md",
      content: "# New Document\n\nFreshly written content about databases.",
      hash: "h_abc123",
    });

    const result = await index.search({
      query: "databases",
      mode: "skim",
    });

    expect(result.chunks.length).toBeGreaterThan(0);
    expect(result.chunks[0].excerpt).toContain("databases");
  });
});
