/**
 * DocumentDetector — 检测文档类型和结构特征
 *
 * 策略：
 * - 采样前 1KB
 * - formatHint bias detection, 但不覆盖低置信度
 * - 正则匹配日志格式、CSV 分隔符、Markdown 结构
 */

import type {
  DocumentFormat,
  DocumentAnalysis,
  DetectionResult,
  StructureHint,
} from "./types.js";

const SAMPLE_SIZE = 1024;

// Log patterns (不用 regex 匹配内容，只做结构检测)
const LOG_LEVELS = ["error", "warn", "info", "debug", "fatal", "trace"];
const LOG_PREFIXES = ["[error]", "[warn]", "[info]", "[debug]", "[fatal]", "[trace]"];

export class DocumentDetector {
  detect(content: string, formatHint?: DocumentFormat): DetectionResult {
    if (!content || content.trim().length === 0) {
      return {
        type: formatHint ?? "text",
        tokenCount: 0,
        structureHints: [],
        lineCount: 0,
        detectedBy: "fallback",
        confidence: 0,
      };
    }

    const sample = content.slice(0, SAMPLE_SIZE);
    const lineCount = content.split("\n").length;
    const tokenCount = this.estimateTokens(content);

    // If formatHint provided, validate it
    if (formatHint) {
      const validation = this.validateFormatHint(sample, formatHint);
      if (validation.confidence > 0.6) {
        return {
          type: formatHint,
          tokenCount,
          structureHints: validation.hints,
          lineCount,
          detectedBy: "format_hint",
          confidence: validation.confidence,
        };
      }
    }

    // Content-based detection
    const detected = this.detectFromContent(sample);
    return {
      type: detected.type,
      tokenCount,
      structureHints: detected.hints,
      lineCount,
      detectedBy: "content_pattern",
      confidence: detected.confidence,
    };
  }

  private estimateTokens(content: string): number {
    // Rough estimate: 1 token ≈ 4 chars for English, ≈ 2 chars for CJK
    let count = 0;
    for (const char of content) {
      const code = char.charCodeAt(0);
      if (code >= 0x4e00 && code <= 0x9fff) {
        count += 0.5; // CJK
      } else {
        count += 0.25; // ASCII
      }
    }
    return Math.ceil(count);
  }

  private validateFormatHint(
    sample: string,
    hint: DocumentFormat
  ): { confidence: number; hints: StructureHint[] } {
    switch (hint) {
      case "json":
        return this.detectJSON(sample);
      case "jsonl":
        return this.detectJSONL(sample);
      case "csv":
        return this.detectCSV(sample);
      case "log":
        return this.detectLog(sample);
      case "markdown":
        return this.detectMarkdown(sample);
      case "text":
        return { confidence: 0.5, hints: [] };
    }
  }

  private detectFromContent(
    sample: string
  ): { type: DocumentFormat; hints: StructureHint[]; confidence: number } {
    // Try each format in order of specificity
    const jsonResult = this.detectJSON(sample);
    if (jsonResult.confidence > 0.8) {
      return { type: "json", ...jsonResult };
    }

    const jsonlResult = this.detectJSONL(sample);
    if (jsonlResult.confidence > 0.8) {
      return { type: "jsonl", ...jsonlResult };
    }

    const logResult = this.detectLog(sample);
    if (logResult.confidence > 0.7) {
      return { type: "log", ...logResult };
    }

    const csvResult = this.detectCSV(sample);
    if (csvResult.confidence > 0.7) {
      return { type: "csv", ...csvResult };
    }

    const mdResult = this.detectMarkdown(sample);
    if (mdResult.confidence > 0.6) {
      return { type: "markdown", ...mdResult };
    }

    return { type: "text", hints: [], confidence: 0.5 };
  }

  private detectJSON(
    sample: string
  ): { confidence: number; hints: StructureHint[] } {
    const trimmed = sample.trim();
    if (
      (trimmed.startsWith("{") && trimmed.endsWith("}")) ||
      (trimmed.startsWith("[") && trimmed.endsWith("]"))
    ) {
      try {
        JSON.parse(trimmed);
        return { confidence: 0.95, hints: [] };
      } catch {
        // Might be partial JSON
        return { confidence: 0.4, hints: [] };
      }
    }
    return { confidence: 0, hints: [] };
  }

  private detectJSONL(
    sample: string
  ): { confidence: number; hints: StructureHint[] } {
    const lines = sample.split("\n").filter((l) => l.trim());
    if (lines.length < 2) return { confidence: 0, hints: [] };

    let validCount = 0;
    for (const line of lines.slice(0, 5)) {
      try {
        JSON.parse(line);
        validCount++;
      } catch {
        // Not JSONL
      }
    }

    const ratio = validCount / Math.min(lines.length, 5);
    if (ratio > 0.8) {
      return {
        confidence: 0.9,
        hints: [{ type: "log_entry", count: lines.length, confidence: ratio }],
      };
    }
    return { confidence: 0, hints: [] };
  }

  private detectLog(
    sample: string
  ): { confidence: number; hints: StructureHint[] } {
    const lines = sample.split("\n").filter((l) => l.trim());
    if (lines.length < 3) return { confidence: 0, hints: [] };

    let logLineCount = 0;
    for (const line of lines.slice(0, 20)) {
      const lower = line.toLowerCase();
      if (
        LOG_LEVELS.some((level) => lower.includes(level)) ||
        LOG_PREFIXES.some((prefix) => lower.includes(prefix))
      ) {
        logLineCount++;
      }
    }

    const ratio = logLineCount / Math.min(lines.length, 20);
    if (ratio > 0.5) {
      return {
        confidence: Math.min(0.9, ratio),
        hints: [
          {
            type: "log_entry",
            count: lines.length,
            confidence: ratio,
          },
        ],
      };
    }
    return { confidence: 0, hints: [] };
  }

  private detectCSV(
    sample: string
  ): { confidence: number; hints: StructureHint[] } {
    const lines = sample.split("\n").filter((l) => l.trim());
    if (lines.length < 2) return { confidence: 0, hints: [] };

    // Detect delimiter
    const delimiters = [",", "\t", ";"];
    let bestDelimiter = ",";
    let bestScore = 0;

    for (const delim of delimiters) {
      const counts = lines.slice(0, 10).map((l) => {
        let count = 0;
        for (const char of l) {
          if (char === delim) count++;
        }
        return count;
      });

      // Check consistency
      const avg = counts.reduce((a, b) => a + b, 0) / counts.length;
      if (avg > 0) {
        const variance =
          counts.reduce((sum, c) => sum + (c - avg) ** 2, 0) / counts.length;
        const score = avg / (1 + variance);
        if (score > bestScore) {
          bestScore = score;
          bestDelimiter = delim;
        }
      }
    }

    if (bestScore > 0.5) {
      return {
        confidence: Math.min(0.85, bestScore),
        hints: [
          {
            type: "table",
            count: lines.length,
            confidence: bestScore,
          },
        ],
      };
    }
    return { confidence: 0, hints: [] };
  }

  private detectMarkdown(
    sample: string
  ): { confidence: number; hints: StructureHint[] } {
    const lines = sample.split("\n");
    const hints: StructureHint[] = [];
    let headingCount = 0;
    let tableCount = 0;
    let codeBlockCount = 0;
    let listCount = 0;

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith("#")) headingCount++;
      if (trimmed.startsWith("|") && trimmed.endsWith("|")) tableCount++;
      if (trimmed.startsWith("```")) codeBlockCount++;
      if (/^[-*+]\s/.test(trimmed) || /^\d+\.\s/.test(trimmed)) listCount++;
    }

    if (headingCount > 0) {
      hints.push({
        type: "heading",
        count: headingCount,
        confidence: Math.min(1, headingCount / 3),
      });
    }
    if (tableCount > 0) {
      hints.push({
        type: "table",
        count: tableCount,
        confidence: Math.min(1, tableCount / 4),
      });
    }
    if (codeBlockCount > 0) {
      hints.push({
        type: "code_block",
        count: codeBlockCount,
        confidence: Math.min(1, codeBlockCount / 2),
      });
    }
    if (listCount > 0) {
      hints.push({
        type: "list",
        count: listCount,
        confidence: Math.min(1, listCount / 3),
      });
    }

    const totalHints = hints.length;
    if (totalHints > 0) {
      return {
        confidence: Math.min(0.8, totalHints * 0.2 + 0.2),
        hints,
      };
    }
    return { confidence: 0, hints: [] };
  }
}
