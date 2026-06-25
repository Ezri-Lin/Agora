/**
 * LogAnalyzer — 日志解析，提取错误和统计信息
 *
 * 支持格式：
 * - ISO timestamp + level: 2024-01-01T00:00:00Z [ERROR] message
 * - 简单格式: [ERROR] message
 * - 无 timestamp: ERROR: message
 *
 * 不使用 regex，用字符串匹配
 */

import type { LogResult, LogEntry, LogLevel, CharRange, LineRange } from "../types.js";

const LEVEL_KEYWORDS: Record<string, LogLevel> = {
  error: "error",
  err: "error",
  fatal: "error",
  warn: "warn",
  warning: "warn",
  info: "info",
  debug: "debug",
  trace: "debug",
};

export class LogAnalyzer {
  analyze(content: string): LogResult {
    if (!content || content.trim().length === 0) {
      return {
        entries: [],
        statistics: { errorCount: 0, warnCount: 0 },
      };
    }

    const lines = content.split("\n");
    const entries: LogEntry[] = [];
    let charOffset = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!line.trim()) {
        charOffset += line.length + 1;
        continue;
      }

      const entry = this.parseLine(line, i, charOffset);
      if (entry) {
        entries.push(entry);
      }

      charOffset += line.length + 1;
    }

    // Calculate statistics
    const errorCount = entries.filter((e) => e.level === "error").length;
    const warnCount = entries.filter((e) => e.level === "warn").length;

    // Find timespan
    const timestamps = entries
      .filter((e) => e.timestamp)
      .map((e) => e.timestamp!)
      .sort();

    const timespan =
      timestamps.length > 0
        ? { start: timestamps[0], end: timestamps[timestamps.length - 1] }
        : undefined;

    return {
      entries,
      statistics: { errorCount, warnCount, timespan },
    };
  }

  private parseLine(
    line: string,
    lineIndex: number,
    charOffset: number
  ): LogEntry | null {
    const trimmed = line.trim();
    if (!trimmed) return null;

    const lineNum = lineIndex + 1; // 1-based
    const lineRange: LineRange = { start: lineNum, end: lineNum };
    const charRange: CharRange = {
      start: charOffset,
      end: charOffset + line.length,
    };

    // Try to extract timestamp
    const timestamp = this.extractTimestamp(trimmed);

    // Try to extract level
    const level = this.extractLevel(trimmed);
    if (!level) return null;

    // Extract message (everything after level indicator)
    const message = this.extractMessage(trimmed, level);

    return {
      timestamp,
      level,
      message,
      charRange,
      lineRange,
    };
  }

  private extractTimestamp(line: string): string | undefined {
    // ISO format: 2024-01-01T00:00:00Z or 2024-01-01 00:00:00
    const isoPattern = /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}/;
    const match = line.match(isoPattern);
    if (match) return match[0];

    // Simple date: 01/01/2024 or 2024/01/01
    const datePattern = /^\d{2}\/\d{2}\/\d{4}/;
    const dateMatch = line.match(datePattern);
    if (dateMatch) return dateMatch[0];

    // Unix timestamp (10-13 digits at start)
    const unixPattern = /^\d{10,13}\b/;
    const unixMatch = line.match(unixPattern);
    if (unixMatch) return unixMatch[0];

    return undefined;
  }

  private extractLevel(line: string): LogLevel | null {
    const lower = line.toLowerCase();

    // Check for [LEVEL] pattern
    for (const [keyword, level] of Object.entries(LEVEL_KEYWORDS)) {
      const bracketPattern = `[${keyword}]`;
      if (lower.includes(bracketPattern)) return level;
    }

    // Check for LEVEL: pattern (at word boundary)
    for (const [keyword, level] of Object.entries(LEVEL_KEYWORDS)) {
      const colonPattern = `${keyword}:`;
      if (lower.includes(colonPattern)) return level;
    }

    // Check for standalone level words (after timestamp)
    for (const [keyword, level] of Object.entries(LEVEL_KEYWORDS)) {
      // Look for level as a standalone word
      const words = lower.split(/\s+/);
      if (words.some((w) => w === keyword || w === `[${keyword}]`)) {
        return level;
      }
    }

    return null;
  }

  private extractMessage(line: string, level: LogLevel): string {
    // Try to find message after [LEVEL]
    const levelStr = level;
    const bracketIndex = line.toLowerCase().indexOf(`[${levelStr}]`);
    if (bracketIndex !== -1) {
      return line.slice(bracketIndex + levelStr.length + 2).trim();
    }

    // Try to find message after LEVEL:
    const colonIndex = line.toLowerCase().indexOf(`${levelStr}:`);
    if (colonIndex !== -1) {
      return line.slice(colonIndex + levelStr.length + 1).trim();
    }

    // Fallback: return the whole line
    return line;
  }
}
