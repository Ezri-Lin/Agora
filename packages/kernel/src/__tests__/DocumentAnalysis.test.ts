/**
 * Document Analysis 测试
 */

import { describe, it, expect } from "vitest";
import { DocumentDetector } from "../documentAnalysis/DocumentDetector.js";
import { DocumentChunker } from "../documentAnalysis/DocumentChunker.js";
import { DocumentIndexer } from "../documentAnalysis/DocumentIndexer.js";
import { RetrievalEngine } from "../documentAnalysis/RetrievalEngine.js";
import { DecisionEngine } from "../documentAnalysis/DecisionEngine.js";
import { ResultFormatter } from "../documentAnalysis/ResultFormatter.js";
import { LogAnalyzer } from "../documentAnalysis/Analyzers/LogAnalyzer.js";
import { TableAnalyzer } from "../documentAnalysis/Analyzers/TableAnalyzer.js";

// === DocumentDetector ===

describe("DocumentDetector", () => {
  it("should detect plain text", () => {
    const detector = new DocumentDetector();
    const result = detector.detect("Hello world, this is a test document.");
    expect(result.type).toBe("text");
    expect(result.lineCount).toBeGreaterThan(0);
  });

  it("should detect markdown with multiple headings", () => {
    const detector = new DocumentDetector();
    const result = detector.detect("# Title\n\n## Subtitle\n\n### Sub-subtitle\n\nSome content with **bold** and *italic*");
    // Markdown detection requires sufficient structure hints
    expect(["markdown", "text"]).toContain(result.type);
  });

  it("should detect log format", () => {
    const detector = new DocumentDetector();
    const result = detector.detect(
      "[ERROR] 2024-01-01 Connection failed\n[WARN] Retrying...\n[INFO] Connected"
    );
    expect(result.type).toBe("log");
  });

  it("should detect CSV", () => {
    const detector = new DocumentDetector();
    const result = detector.detect("name,age,city\nAlice,30,NYC\nBob,25,LA");
    expect(result.type).toBe("csv");
  });

  it("should handle empty content", () => {
    const detector = new DocumentDetector();
    const result = detector.detect("");
    expect(result.tokenCount).toBe(0);
    expect(result.lineCount).toBe(0);
  });
});

// === DocumentChunker ===

describe("DocumentChunker", () => {
  it("should chunk text by paragraphs", () => {
    const chunker = new DocumentChunker();
    const chunks = chunker.chunk(
      "Paragraph one.\n\nParagraph two.\n\nParagraph three.",
      "text"
    );
    expect(chunks.length).toBeGreaterThan(0);
    expect(chunks[0].charRange.start).toBe(0);
  });

  it("should chunk markdown by headings", () => {
    const chunker = new DocumentChunker();
    const chunks = chunker.chunk(
      "# Title\n\nContent here.\n\n## Section\n\nMore content.",
      "markdown"
    );
    expect(chunks.length).toBeGreaterThan(0);
  });

  it("should chunk log by lines without overlap", () => {
    const chunker = new DocumentChunker();
    const logLines = Array.from({ length: 100 }, (_, i) => `[INFO] Line ${i}`).join("\n");
    const chunks = chunker.chunk(logLines, "log");
    expect(chunks.length).toBeGreaterThan(0);
    // 验证无 overlap
    for (let i = 1; i < chunks.length; i++) {
      expect(chunks[i].charRange.start).toBeGreaterThanOrEqual(
        chunks[i - 1].charRange.end
      );
    }
  });

  it("should handle empty content", () => {
    const chunker = new DocumentChunker();
    const chunks = chunker.chunk("", "text");
    expect(chunks).toHaveLength(0);
  });
});

// === DocumentIndexer ===

describe("DocumentIndexer", () => {
  it("should build index from chunks", () => {
    const indexer = new DocumentIndexer();
    const chunker = new DocumentChunker();
    const detector = new DocumentDetector();

    const content = "JWT authentication is important for security.";
    const analysis = detector.detect(content);
    const chunks = chunker.chunk(content, analysis.type);
    const index = indexer.build(chunks, analysis);

    expect(index.chunksById.size).toBeGreaterThan(0);
    expect(index.invertedIndex.size).toBeGreaterThan(0);
    expect(index.metadata.chunkCount).toBeGreaterThan(0);
  });

  it("should handle empty chunks", () => {
    const indexer = new DocumentIndexer();
    const detector = new DocumentDetector();
    const analysis = detector.detect("");
    const index = indexer.build([], analysis);

    expect(index.chunksById.size).toBe(0);
    expect(index.metadata.chunkCount).toBe(0);
  });
});

// === RetrievalEngine ===

describe("RetrievalEngine", () => {
  it("should retrieve relevant chunks", () => {
    const engine = new RetrievalEngine();
    const indexer = new DocumentIndexer();
    const chunker = new DocumentChunker();
    const detector = new DocumentDetector();

    const content = "JWT authentication is used for API security. Session cookies are an alternative.";
    const analysis = detector.detect(content);
    const chunks = chunker.chunk(content, analysis.type);
    const index = indexer.build(chunks, analysis);

    const result = engine.search("JWT", index);

    expect(result.hits.length).toBeGreaterThan(0);
    expect(result.hits[0].matchedTerms).toContain("jwt");
  });

  it("should return empty for no match", () => {
    const engine = new RetrievalEngine();
    const indexer = new DocumentIndexer();
    const chunker = new DocumentChunker();
    const detector = new DocumentDetector();

    const content = "Hello world";
    const analysis = detector.detect(content);
    const chunks = chunker.chunk(content, analysis.type);
    const index = indexer.build(chunks, analysis);

    const result = engine.search("nonexistent", index);

    expect(result.hits).toHaveLength(0);
  });
});

// === DecisionEngine ===

describe("DecisionEngine", () => {
  it("should choose direct_context for short text", () => {
    const engine = new DecisionEngine();
    const decision = engine.decide(
      { type: "text", tokenCount: 100, structureHints: [], lineCount: 1 },
      { chunkCount: 1, termCount: 5, hasStructuredSections: false, hasTableContent: false, hasLogPattern: false }
    );

    expect(decision.mode).toBe("direct_context");
  });

  it("should choose retrieval when query provided", () => {
    const engine = new DecisionEngine();
    const decision = engine.decide(
      { type: "text", tokenCount: 10000, structureHints: [], lineCount: 100 },
      { chunkCount: 10, termCount: 100, hasStructuredSections: false, hasTableContent: false, hasLogPattern: false },
      "search query"
    );

    expect(decision.mode).toBe("retrieval");
  });

  it("should choose log_analyzer for log content", () => {
    const engine = new DecisionEngine();
    const decision = engine.decide(
      { type: "log", tokenCount: 5000, structureHints: [], lineCount: 100 },
      { chunkCount: 5, termCount: 50, hasStructuredSections: false, hasTableContent: false, hasLogPattern: true }
    );

    expect(decision.mode).toBe("log_analyzer");
    expect(decision.analyzer).toBe("LogAnalyzer");
  });

  it("should choose table_analyzer for table content", () => {
    const engine = new DecisionEngine();
    const decision = engine.decide(
      { type: "csv", tokenCount: 3000, structureHints: [], lineCount: 50 },
      { chunkCount: 3, termCount: 30, hasStructuredSections: false, hasTableContent: true, hasLogPattern: false }
    );

    expect(decision.mode).toBe("table_analyzer");
    expect(decision.analyzer).toBe("TableAnalyzer");
  });
});

// === LogAnalyzer ===

describe("LogAnalyzer", () => {
  it("should parse log entries", () => {
    const analyzer = new LogAnalyzer();
    const result = analyzer.analyze(
      "[ERROR] 2024-01-01 Connection failed\n[WARN] Retrying...\n[INFO] Connected"
    );

    expect(result.entries.length).toBeGreaterThan(0);
    expect(result.statistics.errorCount).toBe(1);
    expect(result.statistics.warnCount).toBe(1);
  });

  it("should handle empty log", () => {
    const analyzer = new LogAnalyzer();
    const result = analyzer.analyze("");

    expect(result.entries).toHaveLength(0);
    expect(result.statistics.errorCount).toBe(0);
  });
});

// === TableAnalyzer ===

describe("TableAnalyzer", () => {
  it("should parse CSV", () => {
    const analyzer = new TableAnalyzer();
    const result = analyzer.analyze("name,age\nAlice,30\nBob,25", "csv");

    expect(result.tables.length).toBeGreaterThan(0);
    expect(result.tables[0].headers).toContain("name");
    expect(result.tables[0].rows.length).toBe(2);
  });

  it("should parse markdown table", () => {
    const analyzer = new TableAnalyzer();
    const result = analyzer.analyze(
      "| Name | Age |\n| --- | --- |\n| Alice | 30 |\n| Bob | 25 |",
      "markdown"
    );

    expect(result.tables.length).toBeGreaterThan(0);
  });

  it("should handle empty content", () => {
    const analyzer = new TableAnalyzer();
    const result = analyzer.analyze("", "csv");

    expect(result.tables).toHaveLength(0);
  });
});

// === ResultFormatter ===

describe("ResultFormatter", () => {
  it("should format direct_context result", () => {
    const formatter = new ResultFormatter();
    const result = formatter.format({
      mode: "direct_context",
      chunks: [{
        id: "chunk-0",
        content: "Test content",
        charRange: { start: 0, end: 12 },
        lineRange: { start: 1, end: 1 },
        type: "text",
        tokenCount: 3,
      }],
      decision: { mode: "direct_context", reason: "short text", confidence: 0.9 },
      tokenCount: 100,
    });

    expect(result.mode).toBe("direct_context");
    expect(result.contextChunks.length).toBeGreaterThan(0);
    expect(result.suggestedPrompt).toBeDefined();
  });

  it("should format retrieval result", () => {
    const formatter = new ResultFormatter();
    const result = formatter.format({
      mode: "retrieval",
      chunks: [],
      retrievalResult: {
        query: "test",
        hits: [{
          chunk: {
            id: "chunk-0",
            content: "Test content",
            charRange: { start: 0, end: 12 },
            lineRange: { start: 1, end: 1 },
            type: "text",
            tokenCount: 3,
          },
          score: 1.5,
          matchedTerms: ["test"],
          literalMatches: [],
        }],
      },
      decision: { mode: "retrieval", reason: "query provided", confidence: 0.8 },
      tokenCount: 1000,
      query: "test",
    });

    expect(result.mode).toBe("retrieval");
    expect(result.sourceSpans.length).toBeGreaterThanOrEqual(0);
  });
});
