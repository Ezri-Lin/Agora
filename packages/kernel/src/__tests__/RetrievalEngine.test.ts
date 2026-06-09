import { describe, it, expect } from "vitest";
import { KeywordExcerptRetriever } from "../context/KeywordExcerptRetriever.js";
import { compileContextPackage } from "../context/ContextCompiler.js";
import { fitToBudget, estimateTokens } from "../context/TokenBudgeter.js";
import type { RetrievalQuery, ReadMode } from "../context/types.js";

const SAMPLE_DOCS = [
  {
    id: "doc_arch",
    title: "Architecture Overview",
    path: "/docs/architecture.md",
    content: `# Architecture Overview

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
  },
  {
    id: "doc_cost",
    title: "Cost Analysis",
    path: "/docs/cost.md",
    content: `# Cost Analysis

## Infrastructure Costs
Cloud infrastructure costs scale with the number of services.
Each microservice needs its own monitoring, logging, and deployment pipeline.

## Team Costs
Microservices require more DevOps expertise.
Teams need to understand distributed systems patterns.
`,
  },
  {
    id: "doc_empty",
    title: "Empty Doc",
    path: "/docs/empty.md",
    content: "Just a short doc with no relevant keywords.",
  },
];

describe("KeywordExcerptRetriever", () => {
  it("returns chunks for matching query", async () => {
    const retriever = new KeywordExcerptRetriever(SAMPLE_DOCS);
    const result = await retriever.retrieve({
      query: "microservices architecture migration",
      mode: "skim",
    });

    expect(result.chunks.length).toBeGreaterThan(0);
    expect(result.chunks[0].excerpt).toContain("Microservices");
  });

  it("returns empty chunks for no match", async () => {
    const retriever = new KeywordExcerptRetriever(SAMPLE_DOCS);
    const result = await retriever.retrieve({
      query: "quantum computing blockchain",
      mode: "skim",
    });

    expect(result.chunks).toEqual([]);
    expect(result.warnings).toBeDefined();
    expect(result.warnings![0]).toContain("No documents matched");
  });

  it("respects limit", async () => {
    const retriever = new KeywordExcerptRetriever(SAMPLE_DOCS);
    const result = await retriever.retrieve({
      query: "microservices cost architecture",
      mode: "skim",
      limit: 1,
    });

    expect(result.chunks).toHaveLength(1);
  });

  it("includes score and reason", async () => {
    const retriever = new KeywordExcerptRetriever(SAMPLE_DOCS);
    const result = await retriever.retrieve({
      query: "microservices",
      mode: "skim",
    });

    for (const chunk of result.chunks) {
      expect(chunk.score).toBeGreaterThan(0);
      expect(chunk.reason).toBeDefined();
    }
  });

  it("supports lookup mode (smaller budget)", async () => {
    const retriever = new KeywordExcerptRetriever(SAMPLE_DOCS);
    const result = await retriever.retrieve({
      query: "microservices architecture",
      mode: "lookup",
    });

    expect(result.chunks.length).toBeGreaterThan(0);
    // lookup mode has smaller char budget, so excerpt should be shorter
    expect(result.chunks[0].excerpt.length).toBeLessThan(5000);
  });

  it("supports deep_read mode (larger budget)", async () => {
    const retriever = new KeywordExcerptRetriever(SAMPLE_DOCS);
    const result = await retriever.retrieve({
      query: "microservices architecture",
      mode: "deep_read",
    });

    expect(result.chunks.length).toBeGreaterThan(0);
    // deep_read should include more content
    expect(result.chunks[0].excerpt.length).toBeGreaterThan(100);
  });

  it("returns warning for empty doc set", async () => {
    const retriever = new KeywordExcerptRetriever([]);
    const result = await retriever.retrieve({
      query: "anything",
      mode: "skim",
    });

    expect(result.chunks).toEqual([]);
    expect(result.warnings).toBeDefined();
    expect(result.warnings![0]).toContain("No documents available");
  });

  it("filters by scope paths", async () => {
    const retriever = new KeywordExcerptRetriever(SAMPLE_DOCS);
    const result = await retriever.retrieve({
      query: "microservices",
      mode: "skim",
      scope: { paths: ["/docs/cost.md"] },
    });

    // Only cost doc should match
    expect(result.chunks.every((c) => c.sourceId === "doc_cost")).toBe(true);
  });

  it("does not throw on empty query", async () => {
    const retriever = new KeywordExcerptRetriever(SAMPLE_DOCS);
    const result = await retriever.retrieve({
      query: "",
      mode: "skim",
    });

    expect(result.chunks).toEqual([]);
  });
});

describe("compileContextPackage", () => {
  it("maps chunks into relevantDocs", async () => {
    const retriever = new KeywordExcerptRetriever(SAMPLE_DOCS);
    const retrievalResult = await retriever.retrieve({
      query: "microservices",
      mode: "skim",
    });

    const pkg = compileContextPackage({
      task: "Analyze tradeoffs",
      retrievalResult,
    });

    expect(pkg.task).toBe("Analyze tradeoffs");
    expect(pkg.mode).toBe("skim");
    expect(pkg.relevantDocs.length).toBe(retrievalResult.chunks.length);
    expect(pkg.relevantDocs[0].sourceId).toBe(retrievalResult.chunks[0].sourceId);
    expect(pkg.relevantDocs[0].relevanceReason).toBeDefined();
  });

  it("includes constraints", async () => {
    const retriever = new KeywordExcerptRetriever(SAMPLE_DOCS);
    const retrievalResult = await retriever.retrieve({
      query: "microservices",
      mode: "skim",
    });

    const pkg = compileContextPackage({
      task: "Analyze",
      retrievalResult,
      constraints: ["Focus on cost", "Ignore performance"],
    });

    expect(pkg.constraints).toEqual(["Focus on cost", "Ignore performance"]);
  });

  it("defaults constraints to empty array", async () => {
    const retriever = new KeywordExcerptRetriever(SAMPLE_DOCS);
    const retrievalResult = await retriever.retrieve({
      query: "microservices",
      mode: "skim",
    });

    const pkg = compileContextPackage({
      task: "Analyze",
      retrievalResult,
    });

    expect(pkg.constraints).toEqual([]);
  });
});

describe("TokenBudgeter", () => {
  it("estimateTokens returns positive number", () => {
    expect(estimateTokens("hello world")).toBeGreaterThan(0);
  });

  it("fitToBudget does not exceed rough token budget", () => {
    const longText = "word ".repeat(1000); // ~5000 chars, ~1250 tokens
    const budget = { maxTokens: 100, reservedForSystem: 20 };
    const result = fitToBudget(longText, budget);

    // Should be truncated
    expect(result.length).toBeLessThan(longText.length);
    // Should have truncation marker
    expect(result).toContain("truncated");
  });

  it("fitToBudget returns original text when within budget", () => {
    const shortText = "hello";
    const budget = { maxTokens: 1000 };
    const result = fitToBudget(shortText, budget);

    expect(result).toBe(shortText);
  });

  it("fitToBudget accounts for reserved tokens", () => {
    const text = "word ".repeat(200); // ~1000 chars, ~250 tokens
    const budgetA = { maxTokens: 300 };
    const budgetB = { maxTokens: 300, reservedForSystem: 200 };

    const resultA = fitToBudget(text, budgetA);
    const resultB = fitToBudget(text, budgetB);

    // With less available budget, should truncate more aggressively
    expect(resultB.length).toBeLessThanOrEqual(resultA.length);
  });
});
