/**
 * TableAnalyzer — 表格提取
 *
 * v1 支持: CSV, TSV, Markdown table, simple delimited text
 * v1 不支持: PDF table, merged cells, nested table, OCR table
 * v1 行为: 忽略 query，不做 row filtering
 */

import type {
  DocumentFormat,
  TableResult,
  TableData,
  TableFormat,
  CharRange,
  LineRange,
} from "../types.js";

export class TableAnalyzer {
  analyze(content: string, format: DocumentFormat): TableResult {
    if (!content || content.trim().length === 0) {
      return { tables: [], summary: "No content provided" };
    }

    switch (format) {
      case "csv":
        return this.analyzeDelimited(content, ",");
      case "jsonl":
        return this.analyzeDelimited(content, "\t"); // TSV-like
      case "markdown":
        return this.analyzeMarkdown(content);
      case "log":
      case "json":
      case "text":
      default:
        // Try to detect delimiter
        return this.analyzeAuto(content);
    }
  }

  private analyzeDelimited(
    content: string,
    delimiter: string
  ): TableResult {
    const lines = content.split("\n").filter((l) => l.trim());
    if (lines.length < 2) {
      return {
        tables: [],
        summary: "Not enough rows for a table",
      };
    }

    const format: TableFormat = delimiter === "," ? "csv" : "tsv";
    const tables: TableData[] = [];
    let charOffset = 0;

    // Find contiguous table blocks
    let blockStart = 0;
    let blockLines: string[] = [];
    let blockStartLine = 1;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const hasDelimiter = line.includes(delimiter);

      if (hasDelimiter) {
        if (blockLines.length === 0) {
          blockStart = charOffset;
          blockStartLine = i + 1;
        }
        blockLines.push(line);
      } else {
        if (blockLines.length >= 2) {
          tables.push(
            this.buildTable(
              blockLines,
              delimiter,
              format,
              blockStart,
              charOffset,
              blockStartLine,
              i
            )
          );
        }
        blockLines = [];
      }

      charOffset += line.length + 1;
    }

    // Final block
    if (blockLines.length >= 2) {
      tables.push(
        this.buildTable(
          blockLines,
          delimiter,
          format,
          blockStart,
          charOffset,
          blockStartLine,
          lines.length
        )
      );
    }

    return {
      tables,
      summary: this.buildSummary(tables),
    };
  }

  private analyzeMarkdown(content: string): TableResult {
    const lines = content.split("\n");
    const tables: TableData[] = [];
    let charOffset = 0;
    let i = 0;

    while (i < lines.length) {
      const line = lines[i].trim();

      // Look for markdown table: starts with |, next line is separator
      if (line.startsWith("|") && line.endsWith("|")) {
        const tableStart = charOffset;
        const tableStartLine = i + 1;
        const tableLines: string[] = [lines[i]];

        // Check if next line is separator (|---|---|)
        if (i + 1 < lines.length) {
          const nextLine = lines[i + 1].trim();
          if (/^\|[\s\-:|]+\|$/.test(nextLine)) {
            tableLines.push(lines[i + 1]);
            i += 2;

            // Collect remaining rows
            while (i < lines.length) {
              const rowLine = lines[i].trim();
              if (rowLine.startsWith("|") && rowLine.endsWith("|")) {
                tableLines.push(lines[i]);
                i++;
              } else {
                break;
              }
            }

            // Parse table
            const table = this.parseMarkdownTable(
              tableLines,
              tableStart,
              charOffset,
              tableStartLine,
              tableStartLine + tableLines.length - 1
            );
            if (table) {
              tables.push(table);
            }
          }
        }

        charOffset += line.length + 1;
      } else {
        charOffset += line.length + 1;
        i++;
      }
    }

    return {
      tables,
      summary: this.buildSummary(tables),
    };
  }

  private analyzeAuto(content: string): TableResult {
    // Detect delimiter
    const lines = content.split("\n").slice(0, 10);
    const delimiters = [",", "\t", ";"];
    let bestDelimiter = ",";
    let bestScore = 0;

    for (const delim of delimiters) {
      const counts = lines.map((l) => {
        let count = 0;
        for (const char of l) {
          if (char === delim) count++;
        }
        return count;
      });

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

    if (bestScore > 0.3) {
      return this.analyzeDelimited(content, bestDelimiter);
    }

    return { tables: [], summary: "No table structure detected" };
  }

  private buildTable(
    lines: string[],
    delimiter: string,
    format: TableFormat,
    charStart: number,
    charEnd: number,
    lineStart: number,
    lineEnd: number
  ): TableData {
    const rows = lines.map((line) =>
      line
        .split(delimiter)
        .map((cell) => cell.trim())
    );

    const headers = rows[0] ?? [];
    const dataRows = rows.slice(1);

    return {
      headers,
      rows: dataRows,
      charRange: { start: charStart, end: charEnd },
      lineRange: { start: lineStart, end: lineEnd },
      format,
    };
  }

  private parseMarkdownTable(
    lines: string[],
    charStart: number,
    charEnd: number,
    lineStart: number,
    lineEnd: number
  ): TableData | null {
    if (lines.length < 3) return null;

    // First line: headers
    const headerLine = lines[0].trim();
    const headers = headerLine
      .split("|")
      .filter((cell) => cell.trim())
      .map((cell) => cell.trim());

    // Second line: separator (skip)
    // Remaining lines: data rows
    const rows: string[][] = [];
    for (let i = 2; i < lines.length; i++) {
      const rowLine = lines[i].trim();
      const cells = rowLine
        .split("|")
        .filter((cell) => cell.trim())
        .map((cell) => cell.trim());
      if (cells.length > 0) {
        rows.push(cells);
      }
    }

    return {
      headers,
      rows,
      charRange: { start: charStart, end: charEnd },
      lineRange: { start: lineStart, end: lineEnd },
      format: "markdown",
    };
  }

  private buildSummary(tables: TableData[]): string {
    if (tables.length === 0) return "No tables found";

    const parts = tables.map((t, i) => {
      const cols = t.headers.length;
      const rows = t.rows.length;
      return `Table ${i + 1}: ${cols} columns × ${rows} rows (${t.format})`;
    });

    return parts.join("; ");
  }
}
