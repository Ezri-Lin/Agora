import { describe, it, expect } from "vitest";
import { parseDocument } from "../context/DocumentParser.js";

describe("DocumentParser", () => {
  it("parses title from first H1", () => {
    const { document } = parseDocument({
      path: "/docs/arch.md",
      content: "# Architecture Overview\n\nSome content here.",
    });

    expect(document.title).toBe("Architecture Overview");
    expect(document.kind).toBe("markdown");
  });

  it("falls back to filename when no H1", () => {
    const { document } = parseDocument({
      path: "/docs/notes.md",
      content: "Just some text without a heading.",
    });

    expect(document.title).toBe("notes");
  });

  it("parses heading hierarchy", () => {
    const { document } = parseDocument({
      path: "/docs/test.md",
      content: `# Top

## Section A

### Sub A1

## Section B

### Sub B1

#### Sub B1a
`,
    });

    expect(document.headings.length).toBe(6);

    const sectionA = document.headings.find((h) => h.title === "Section A");
    expect(sectionA).toBeDefined();
    expect(sectionA!.headingPath).toEqual(["Top", "Section A"]);

    const subA1 = document.headings.find((h) => h.title === "Sub A1");
    expect(subA1).toBeDefined();
    expect(subA1!.headingPath).toEqual(["Top", "Section A", "Sub A1"]);

    const subB1a = document.headings.find((h) => h.title === "Sub B1a");
    expect(subB1a).toBeDefined();
    expect(subB1a!.headingPath).toEqual(["Top", "Section B", "Sub B1", "Sub B1a"]);
  });

  it("assigns headingPath correctly", () => {
    const { document } = parseDocument({
      path: "/docs/test.md",
      content: `# Root

## Child

### Grandchild
`,
    });

    const root = document.headings[0];
    expect(root.headingPath).toEqual(["Root"]);
    expect(root.level).toBe(1);

    const child = document.headings[1];
    expect(child.headingPath).toEqual(["Root", "Child"]);
    expect(child.level).toBe(2);

    const grandchild = document.headings[2];
    expect(grandchild.headingPath).toEqual(["Root", "Child", "Grandchild"]);
    expect(grandchild.level).toBe(3);
  });

  it("extracts markdown links", () => {
    const { document } = parseDocument({
      path: "/docs/test.md",
      content: `# Doc

See [this page](https://example.com) and [that one](/local/path).
`,
    });

    expect(document.links).toContain("https://example.com");
    expect(document.links).toContain("/local/path");
    expect(document.links).toHaveLength(2);
  });

  it("extracts inline tags", () => {
    const { document } = parseDocument({
      path: "/docs/test.md",
      content: `# Design

This is about #architecture and #microservices patterns.
`,
    });

    expect(document.tags).toContain("architecture");
    expect(document.tags).toContain("microservices");
  });

  it("extracts frontmatter tags", () => {
    const { document } = parseDocument({
      path: "/docs/test.md",
      content: `---
title: My Doc
tags: design, patterns
---

# Content here
`,
    });

    expect(document.title).toBe("My Doc");
    expect(document.tags).toContain("design");
    expect(document.tags).toContain("patterns");
  });

  it("preserves frontmatter", () => {
    const { document } = parseDocument({
      path: "/docs/test.md",
      content: `---
title: Test
author: Alice
status: draft
---

# Body
`,
    });

    expect(document.frontmatter).toBeDefined();
    expect(document.frontmatter!.title).toBe("Test");
    expect(document.frontmatter!.author).toBe("Alice");
    expect(document.frontmatter!.status).toBe("draft");
  });

  it("generates stable docId for same input", () => {
    const input = { path: "/docs/test.md", content: "# Hello\n\nWorld" };
    const result1 = parseDocument(input);
    const result2 = parseDocument(input);

    expect(result1.document.docId).toBe(result2.document.docId);
  });

  it("generates different docId for different content", () => {
    const result1 = parseDocument({ path: "/docs/test.md", content: "# Hello" });
    const result2 = parseDocument({ path: "/docs/test.md", content: "# Changed" });

    expect(result1.document.docId).not.toBe(result2.document.docId);
  });

  it("computes contentHash", () => {
    const { document } = parseDocument({
      path: "/docs/test.md",
      content: "# Test",
    });

    expect(document.contentHash).toBeDefined();
    expect(typeof document.contentHash).toBe("string");
  });

  it("chunks document by headings", () => {
    const { chunks } = parseDocument({
      path: "/docs/test.md",
      content: `# Title

Intro text here.

## Section A

Content for section A.

## Section B

Content for section B.
`,
    });

    // Should have at least one chunk per heading section
    expect(chunks.length).toBeGreaterThanOrEqual(3);

    // Each chunk should have headingPath
    for (const chunk of chunks) {
      expect(chunk.docId).toBeDefined();
      expect(chunk.path).toBe("/docs/test.md");
      expect(chunk.tokenEstimate).toBeGreaterThan(0);
    }
  });

  it("assigns headingPath to chunks", () => {
    const { chunks } = parseDocument({
      path: "/docs/test.md",
      content: `# Root

## Section

Some content.
`,
    });

    const sectionChunk = chunks.find(
      (c) => c.headingPath.includes("Section") && c.text.includes("Some content"),
    );
    expect(sectionChunk).toBeDefined();
    expect(sectionChunk!.headingPath).toEqual(["Root", "Section"]);
  });

  it("generates stable chunkId for same offsets", () => {
    const input = { path: "/docs/test.md", content: "# Hello\n\nWorld" };
    const result1 = parseDocument(input);
    const result2 = parseDocument(input);

    expect(result1.chunks[0].chunkId).toBe(result2.chunks[0].chunkId);
  });

  it("text file creates single chunk", () => {
    const { document, chunks } = parseDocument({
      path: "/data/config.txt",
      content: "some plain text content",
      kind: "text",
    });

    expect(document.kind).toBe("text");
    expect(document.headings).toEqual([]);
    expect(document.links).toEqual([]);
    expect(chunks).toHaveLength(1);
    expect(chunks[0].headingPath).toEqual([]);
  });

  it("detects kind from extension", () => {
    expect(parseDocument({ path: "/a.md", content: "" }).document.kind).toBe("markdown");
    expect(parseDocument({ path: "/a.json", content: "" }).document.kind).toBe("json");
    expect(parseDocument({ path: "/a.yaml", content: "" }).document.kind).toBe("yaml");
    expect(parseDocument({ path: "/a.txt", content: "" }).document.kind).toBe("text");
    expect(parseDocument({ path: "/a.ts", content: "" }).document.kind).toBe("code");
  });

  it("respects explicit kind over extension", () => {
    const { document } = parseDocument({
      path: "/file.xyz",
      content: "# Heading\n\nBody",
      kind: "markdown",
    });

    expect(document.kind).toBe("markdown");
    expect(document.headings.length).toBeGreaterThan(0);
  });

  it("handles empty document", () => {
    const { document, chunks } = parseDocument({
      path: "/empty.md",
      content: "",
    });

    expect(document.docId).toBeDefined();
    expect(document.title).toBe("empty");
    expect(chunks).toHaveLength(0);
  });

  it("does not extract tags from code blocks", () => {
    const { document } = parseDocument({
      path: "/docs/test.md",
      content: `# Doc

Real tag: #design

\`\`\`
This #should_not be extracted
\`\`\`
`,
    });

    expect(document.tags).toContain("design");
    expect(document.tags).not.toContain("should_not");
  });

  it("splits large sections into multiple chunks", () => {
    // Create content that exceeds MAX_CHUNK_TOKENS (~500 tokens = ~2000 chars)
    const paragraphs = Array.from(
      { length: 20 },
      (_, i) => `Paragraph ${i}: ${"word ".repeat(150)}`,
    ).join("\n\n");

    const { chunks } = parseDocument({
      path: "/docs/large.md",
      content: `# Large\n\n${paragraphs}`,
    });

    // Should be split into multiple chunks
    expect(chunks.length).toBeGreaterThan(1);

    // Each chunk should be under the token limit
    for (const chunk of chunks) {
      expect(chunk.tokenEstimate).toBeLessThanOrEqual(600); // some tolerance
    }
  });
});
