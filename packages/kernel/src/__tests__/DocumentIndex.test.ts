import { describe, it, expect } from "vitest";
import { InMemoryDocumentIndex } from "../context/InMemoryDocumentIndex.js";
import { IndexedDocumentRetriever } from "../context/IndexedDocumentRetriever.js";
import { parseDocument } from "../context/DocumentParser.js";
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

Use #microservices for scalability and #monolith for simplicity.
`,
);

describe("InMemoryDocumentIndex", () => {
  it("upsertDocument indexes chunks", async () => {
    const index = new InMemoryDocumentIndex();
    await index.upsertDocument(ARCH_DOC);

    expect(index.documentCount).toBe(1);
    expect(index.chunkCount).toBeGreaterThan(0);
  });

  it("search finds text match", async () => {
    const index = new InMemoryDocumentIndex();
    await index.upsertDocument(ARCH_DOC);

    const result = await index.search({
      query: "microservices deployment",
      mode: "skim",
    });

    expect(result.chunks.length).toBeGreaterThan(0);
    expect(result.chunks[0].excerpt).toContain("Microservices");
  });

  it("title match ranks above body-only match", async () => {
    const index = new InMemoryDocumentIndex();
    await index.upsertDocument(ARCH_DOC);
    await index.upsertDocument(COST_DOC);

    // "Architecture" is in ARCH_DOC's title but only in COST_DOC's body
    const result = await index.search({
      query: "architecture",
      mode: "skim",
    });

    expect(result.chunks.length).toBeGreaterThan(0);
    // First result should be from the doc with title match
    expect(result.chunks[0].sourceId).toBe(ARCH_DOC.document.docId);
  });

  it("heading match ranks above body-only match", async () => {
    const index = new InMemoryDocumentIndex();
    await index.upsertDocument(ARCH_DOC);

    // "Migration Strategy" is a heading
    const result = await index.search({
      query: "migration strategy",
      mode: "skim",
    });

    expect(result.chunks.length).toBeGreaterThan(0);
    const topChunk = result.chunks[0];
    expect(topChunk.headingPath).toContain("Migration Strategy");
  });

  it("tags are searchable", async () => {
    const index = new InMemoryDocumentIndex();
    await index.upsertDocument(DESIGN_DOC);

    const result = await index.search({
      query: "architecture patterns",
      mode: "skim",
    });

    expect(result.chunks.length).toBeGreaterThan(0);
  });

  it("respects limit", async () => {
    const index = new InMemoryDocumentIndex();
    await index.upsertDocument(ARCH_DOC);
    await index.upsertDocument(COST_DOC);

    const result = await index.search({
      query: "microservices",
      mode: "skim",
      limit: 2,
    });

    expect(result.chunks.length).toBeLessThanOrEqual(2);
  });

  it("removeDocument removes chunks", async () => {
    const index = new InMemoryDocumentIndex();
    await index.upsertDocument(ARCH_DOC);
    await index.upsertDocument(COST_DOC);

    expect(index.chunkCount).toBeGreaterThan(0);

    await index.removeDocument(ARCH_DOC.document.docId);

    expect(index.documentCount).toBe(1);
    // All remaining chunks should be from COST_DOC
    const result = await index.search({
      query: "microservices",
      mode: "skim",
    });
    for (const chunk of result.chunks) {
      expect(chunk.sourceId).toBe(COST_DOC.document.docId);
    }
  });

  it("re-upsert replaces old chunks", async () => {
    const index = new InMemoryDocumentIndex();
    await index.upsertDocument(ARCH_DOC);
    const initialCount = index.chunkCount;

    // Re-parse with different content
    const updated = parseDocument({
      path: "/docs/architecture.md",
      content: "# Updated Architecture\n\nNew content.",
    });
    await index.upsertDocument(updated);

    expect(index.documentCount).toBe(1);
    // Chunk count should change (different content)
    const result = await index.search({
      query: "updated architecture",
      mode: "skim",
    });
    expect(result.chunks.length).toBeGreaterThan(0);
    expect(result.chunks[0].excerpt).toContain("Updated");
  });

  it("empty query returns warning", async () => {
    const index = new InMemoryDocumentIndex();
    await index.upsertDocument(ARCH_DOC);

    const result = await index.search({
      query: "",
      mode: "skim",
    });

    expect(result.chunks).toEqual([]);
    expect(result.warnings).toBeDefined();
  });

  it("empty index returns warning", async () => {
    const index = new InMemoryDocumentIndex();

    const result = await index.search({
      query: "anything",
      mode: "skim",
    });

    expect(result.chunks).toEqual([]);
    expect(result.warnings).toBeDefined();
    expect(result.warnings![0]).toContain("empty");
  });

  it("clear removes all documents", async () => {
    const index = new InMemoryDocumentIndex();
    await index.upsertDocument(ARCH_DOC);
    await index.upsertDocument(COST_DOC);

    await index.clear();

    expect(index.documentCount).toBe(0);
    expect(index.chunkCount).toBe(0);
  });

  it("scope filter by paths", async () => {
    const index = new InMemoryDocumentIndex();
    await index.upsertDocument(ARCH_DOC);
    await index.upsertDocument(COST_DOC);

    const result = await index.search({
      query: "microservices",
      mode: "skim",
      scope: { paths: ["/docs/cost.md"] },
    });

    expect(result.chunks.every((c) => c.path === "/docs/cost.md")).toBe(true);
  });

  it("lookup mode works", async () => {
    const index = new InMemoryDocumentIndex();
    await index.upsertDocument(ARCH_DOC);

    const result = await index.search({
      query: "microservices",
      mode: "lookup",
    });

    expect(result.chunks.length).toBeGreaterThan(0);
    expect(result.query.mode).toBe("lookup");
  });

  it("no throw on unknown keywords", async () => {
    const index = new InMemoryDocumentIndex();
    await index.upsertDocument(ARCH_DOC);

    const result = await index.search({
      query: "quantum blockchain xyz",
      mode: "skim",
    });

    expect(result.chunks).toEqual([]);
  });
});

describe("IndexedDocumentRetriever", () => {
  it("implements RetrievalEngine interface", async () => {
    const index = new InMemoryDocumentIndex();
    await index.upsertDocument(ARCH_DOC);

    const retriever: RetrievalEngine = new IndexedDocumentRetriever(index);
    const result = await retriever.retrieve({
      query: "microservices",
      mode: "skim",
    });

    expect(result.chunks.length).toBeGreaterThan(0);
    expect(result.chunks[0].excerpt).toContain("Microservices");
  });

  it("delegates to index.search", async () => {
    const index = new InMemoryDocumentIndex();
    await index.upsertDocument(ARCH_DOC);
    await index.upsertDocument(COST_DOC);

    const retriever = new IndexedDocumentRetriever(index);
    const result = await retriever.retrieve({
      query: "infrastructure costs",
      mode: "skim",
    });

    expect(result.chunks.length).toBeGreaterThan(0);
    expect(result.chunks[0].sourceId).toBe(COST_DOC.document.docId);
  });
});
