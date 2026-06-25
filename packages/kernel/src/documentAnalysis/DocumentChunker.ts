/**
 * DocumentChunker — 将文档分割为可检索的块
 *
 * 策略：
 * - text/markdown: 按段落/标题分块，有 overlap
 * - log/csv/jsonl: 按行分块，无 overlap
 * - 每个 chunk 记录 charRange + lineRange
 */

import type {
  DocumentFormat,
  DocumentChunk,
  ChunkingPolicy,
  ChunkType,
} from "./types.js";
import { DEFAULT_CHUNKING_POLICY, DEFAULT_POLICY } from "./constants.js";

export class DocumentChunker {
  chunk(
    content: string,
    type: DocumentFormat,
    policy?: ChunkingPolicy
  ): DocumentChunk[] {
    if (!content) return [];

    const p = policy ?? DEFAULT_CHUNKING_POLICY[type];

    switch (type) {
      case "markdown":
        return this.chunkByHeadings(content, p);
      case "log":
      case "csv":
      case "jsonl":
        return this.chunkByLines(content, type, p);
      case "json":
        return this.chunkByLines(content, "text", p);
      case "text":
      default:
        return this.chunkByParagraphs(content, p);
    }
  }

  private chunkByHeadings(
    content: string,
    policy: ChunkingPolicy
  ): DocumentChunk[] {
    const chunks: DocumentChunk[] = [];
    const lines = content.split("\n");
    let currentChunk = "";
    let chunkStartLine = 1;
    let chunkStartChar = 0;
    let charOffset = 0;
    let currentSection: string | undefined;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineStart = charOffset;
      charOffset += line.length + 1; // +1 for \n

      // Check if this line is a heading
      if (line.trim().startsWith("#")) {
        // Save current chunk if it has content
        if (currentChunk.trim()) {
          chunks.push(
            this.createChunk(
              chunks.length,
              currentChunk.trim(),
              chunkStartChar,
              charOffset - line.length - 1,
              chunkStartLine,
              i,
              currentSection,
              "text"
            )
          );
        }
        // Start new chunk
        currentChunk = line + "\n";
        chunkStartLine = i + 1;
        chunkStartChar = lineStart;
        currentSection = line.trim().replace(/^#+\s*/, "");
      } else {
        currentChunk += line + "\n";
      }

      // Check max size
      if (currentChunk.length > policy.maxCharsPerChunk) {
        chunks.push(
          this.createChunk(
            chunks.length,
            currentChunk.trim(),
            chunkStartChar,
            charOffset,
            chunkStartLine,
            i + 1,
            currentSection,
            "text"
          )
        );
        currentChunk = "";
        chunkStartLine = i + 2;
        chunkStartChar = charOffset;
      }
    }

    // Final chunk
    if (currentChunk.trim()) {
      chunks.push(
        this.createChunk(
          chunks.length,
          currentChunk.trim(),
          chunkStartChar,
          charOffset,
          chunkStartLine,
          lines.length,
          currentSection,
          "text"
        )
      );
    }

    return this.enforceMaxChunks(chunks);
  }

  private chunkByLines(
    content: string,
    format: DocumentFormat,
    policy: ChunkingPolicy
  ): DocumentChunk[] {
    const chunks: DocumentChunk[] = [];
    const lines = content.split("\n");
    let currentChunk = "";
    let chunkStartLine = 1;
    let chunkStartChar = 0;
    let charOffset = 0;
    let lineCount = 0;

    const chunkType: ChunkType = format === "log" ? "log" : "table";

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineStart = charOffset;
      charOffset += line.length + 1;

      currentChunk += line + "\n";
      lineCount++;

      // Check if we should flush
      const shouldFlush =
        currentChunk.length >= policy.maxCharsPerChunk ||
        (policy.preserveRecordBoundary && lineCount >= 50);

      if (shouldFlush) {
        chunks.push(
          this.createChunk(
            chunks.length,
            currentChunk.trim(),
            chunkStartChar,
            charOffset,
            chunkStartLine,
            i + 1,
            undefined,
            chunkType
          )
        );
        currentChunk = "";
        chunkStartLine = i + 2;
        chunkStartChar = charOffset;
        lineCount = 0;
      }
    }

    // Final chunk
    if (currentChunk.trim()) {
      chunks.push(
        this.createChunk(
          chunks.length,
          currentChunk.trim(),
          chunkStartChar,
          charOffset,
          chunkStartLine,
          lines.length,
          undefined,
          chunkType
        )
      );
    }

    return this.enforceMaxChunks(chunks);
  }

  private chunkByParagraphs(
    content: string,
    policy: ChunkingPolicy
  ): DocumentChunk[] {
    const chunks: DocumentChunk[] = [];
    // Split by double newline (paragraph boundary)
    const paragraphs = content.split(/\n\n+/);
    let currentChunk = "";
    let chunkStartLine = 1;
    let chunkStartChar = 0;
    let charOffset = 0;
    let lineOffset = 0;

    for (const para of paragraphs) {
      const paraStart = charOffset;
      const paraLines = para.split("\n").length;

      if (
        currentChunk.length + para.length > policy.maxCharsPerChunk &&
        currentChunk.trim()
      ) {
        // Flush current chunk
        chunks.push(
          this.createChunk(
            chunks.length,
            currentChunk.trim(),
            chunkStartChar,
            paraStart,
            chunkStartLine,
            lineOffset,
            undefined,
            "text"
          )
        );

        // Apply overlap
        if (policy.overlapChars > 0 && currentChunk.length > 0) {
          const overlapStart = Math.max(
            0,
            currentChunk.length - policy.overlapChars
          );
          currentChunk = currentChunk.slice(overlapStart);
          chunkStartChar = paraStart - currentChunk.length;
        } else {
          currentChunk = "";
          chunkStartChar = paraStart;
        }
        chunkStartLine = lineOffset + 1;
      }

      currentChunk += para + "\n\n";
      charOffset += para.length + 2;
      lineOffset += paraLines;
    }

    // Final chunk
    if (currentChunk.trim()) {
      chunks.push(
        this.createChunk(
          chunks.length,
          currentChunk.trim(),
          chunkStartChar,
          charOffset,
          chunkStartLine,
          lineOffset,
          undefined,
          "text"
        )
      );
    }

    return this.enforceMaxChunks(chunks);
  }

  private createChunk(
    index: number,
    content: string,
    charStart: number,
    charEnd: number,
    lineStart: number,
    lineEnd: number,
    section: string | undefined,
    type: ChunkType
  ): DocumentChunk {
    return {
      id: `chunk-${index}`,
      content,
      charRange: { start: charStart, end: charEnd },
      lineRange: { start: lineStart, end: lineEnd },
      section,
      type,
      tokenCount: this.estimateTokens(content),
    };
  }

  private estimateTokens(content: string): number {
    let count = 0;
    for (const char of content) {
      const code = char.charCodeAt(0);
      if (code >= 0x4e00 && code <= 0x9fff) {
        count += 0.5;
      } else {
        count += 0.25;
      }
    }
    return Math.ceil(count);
  }

  private enforceMaxChunks(chunks: DocumentChunk[]): DocumentChunk[] {
    if (chunks.length > DEFAULT_POLICY.maxChunks) {
      return chunks.slice(0, DEFAULT_POLICY.maxChunks);
    }
    return chunks;
  }
}
