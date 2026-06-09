import { describe, it, expect, vi } from "vitest";
import { compilePersonaPrompt } from "../prompt/compilePersonaPrompt.js";
import { retrieveAndCompileContext } from "../context/retrieveAndCompileContext.js";
import { InMemoryDocumentIndex } from "../context/InMemoryDocumentIndex.js";
import { IndexedDocumentRetriever } from "../context/IndexedDocumentRetriever.js";
import { parseDocument } from "../context/DocumentParser.js";
import type { ContextPackage } from "../context/ContextCompiler.js";
import type { PersonaContract } from "@agora/shared";

function makeContract(): PersonaContract {
  return {
    id: "test_persona",
    name: "Test Persona",
    nameCN: "测试角色",
    subtitle: "A test persona",
    domainId: "core",
    familyId: "test",
    mission: "Test mission",
    responsibilities: { must: ["Must do X"], should: ["Should do Y"], mustNot: [] },
    decisionRights: { may: ["May decide A"], mustNot: [] },
    analysisFrameworks: ["Framework 1"],
    evidencePolicy: { groundingRules: ["Ground claims"], uncertaintyRules: [] },
    collaborationRules: ["Collaborate"],
    voice: { tone: "analytical", styleRules: ["Be precise"] },
    outputSchema: { format: "markdown", template: "..." },
    compactSchema: {
      format: "json",
      fields: [{ key: "insight", description: "Core insight", required: true }],
    },
    routing: { aliases: ["test"], tags: ["testing"], triggerSituations: ["When testing"] },
    boundaries: [],
  };
}

const ROOM_CTX = {
  topic: "Should we adopt microservices?",
  userMessage: "Analyze the tradeoffs.",
};

const SAMPLE_DOC = parseDocument({
  path: "/docs/architecture.md",
  content: `# Architecture Guide

## Microservices

Microservices allow independent scaling of services.
Each service owns its data and communicates via APIs.

## Monolith

Monolithic architecture is simpler but harder to scale.
`,
});

describe("retrieveAndCompileContext", () => {
  it("retrieves and compiles chunks into ContextPackage", async () => {
    const index = new InMemoryDocumentIndex();
    await index.upsertDocument(SAMPLE_DOC);
    const retriever = new IndexedDocumentRetriever(index);

    const pkg = await retrieveAndCompileContext({
      task: "Analyze architecture",
      query: "microservices scaling",
      retrievalEngine: retriever,
    });

    expect(pkg).not.toBeNull();
    expect(pkg!.task).toBe("Analyze architecture");
    expect(pkg!.relevantDocs.length).toBeGreaterThan(0);
    expect(pkg!.relevantDocs[0].excerpt).toContain("Microservices");
  });

  it("returns null on retrieval failure", async () => {
    const failingEngine = {
      retrieve: vi.fn().mockRejectedValue(new Error("network error")),
    };

    const pkg = await retrieveAndCompileContext({
      task: "test",
      query: "anything",
      retrievalEngine: failingEngine,
    });

    expect(pkg).toBeNull();
  });

  it("respects limit parameter", async () => {
    const index = new InMemoryDocumentIndex();
    await index.upsertDocument(SAMPLE_DOC);
    const retriever = new IndexedDocumentRetriever(index);

    const pkg = await retrieveAndCompileContext({
      task: "test",
      query: "microservices",
      retrievalEngine: retriever,
      limit: 1,
    });

    expect(pkg!.relevantDocs.length).toBeLessThanOrEqual(1);
  });

  it("includes constraints in result", async () => {
    const index = new InMemoryDocumentIndex();
    await index.upsertDocument(SAMPLE_DOC);
    const retriever = new IndexedDocumentRetriever(index);

    const pkg = await retrieveAndCompileContext({
      task: "test",
      query: "microservices",
      retrievalEngine: retriever,
      constraints: ["Focus on cost"],
    });

    expect(pkg!.constraints).toEqual(["Focus on cost"]);
  });
});

describe("compilePersonaPrompt with contextPackage", () => {
  it("includes retrieved workspace context in prompt", () => {
    const contextPackage: ContextPackage = {
      task: "Analyze",
      mode: "skim",
      relevantDocs: [{
        sourceId: "doc_1",
        title: "Architecture Guide",
        path: "/docs/arch.md",
        headingPath: ["Architecture", "Microservices"],
        excerpt: "Microservices allow independent scaling.",
        relevanceReason: "Matched title",
      }],
      constraints: [],
    };

    const result = compilePersonaPrompt({
      personaContract: makeContract(),
      phase: "opening",
      roomContext: ROOM_CTX,
      contextPackage,
    });

    expect(result.system).toContain("Retrieved Workspace Context");
    expect(result.system).toContain("Architecture Guide");
    expect(result.system).toContain("/docs/arch.md");
    expect(result.system).toContain("Microservices");
    expect(result.system).toContain("Matched title");
  });

  it("includes context constraints in prompt", () => {
    const contextPackage: ContextPackage = {
      task: "Analyze",
      mode: "skim",
      relevantDocs: [{
        sourceId: "doc_1",
        excerpt: "Some content.",
      }],
      constraints: ["Focus on cost", "Ignore performance"],
    };

    const result = compilePersonaPrompt({
      personaContract: makeContract(),
      phase: "opening",
      roomContext: ROOM_CTX,
      contextPackage,
    });

    expect(result.system).toContain("Context Constraints");
    expect(result.system).toContain("Focus on cost");
    expect(result.system).toContain("Ignore performance");
  });

  it("omits context section when contextPackage has no docs", () => {
    const contextPackage: ContextPackage = {
      task: "Analyze",
      mode: "skim",
      relevantDocs: [],
      constraints: [],
    };

    const result = compilePersonaPrompt({
      personaContract: makeContract(),
      phase: "opening",
      roomContext: ROOM_CTX,
      contextPackage,
    });

    expect(result.system).not.toContain("Retrieved Workspace Context");
  });

  it("omits context section when contextPackage is undefined", () => {
    const result = compilePersonaPrompt({
      personaContract: makeContract(),
      phase: "opening",
      roomContext: ROOM_CTX,
    });

    expect(result.system).not.toContain("Retrieved Workspace Context");
  });

  it("renders heading path when present", () => {
    const contextPackage: ContextPackage = {
      task: "test",
      mode: "skim",
      relevantDocs: [{
        sourceId: "doc_1",
        headingPath: ["Root", "Section", "Subsection"],
        excerpt: "Content here.",
      }],
      constraints: [],
    };

    const result = compilePersonaPrompt({
      personaContract: makeContract(),
      phase: "opening",
      roomContext: ROOM_CTX,
      contextPackage,
    });

    expect(result.system).toContain("Root > Section > Subsection");
  });

  it("still includes all existing prompt sections", () => {
    const contextPackage: ContextPackage = {
      task: "test",
      mode: "skim",
      relevantDocs: [{ sourceId: "d1", excerpt: "Some text." }],
      constraints: [],
    };

    const result = compilePersonaPrompt({
      personaContract: makeContract(),
      phase: "opening",
      roomContext: ROOM_CTX,
      contextPackage,
    });

    // Existing sections should still be present
    expect(result.system).toContain("Test Persona");
    expect(result.system).toContain("Room Context");
    expect(result.system).toContain("User Message");
    expect(result.system).toContain("Phase: Opening Statement");
    expect(result.system).toContain("compact");
  });
});
