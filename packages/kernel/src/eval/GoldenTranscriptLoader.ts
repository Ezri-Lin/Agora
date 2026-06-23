/**
 * GoldenTranscriptLoader — 加载 golden transcript 文件
 */

import { readFile } from "fs/promises";
import { join } from "path";

export interface GoldenTranscript {
  id: string;
  metadata: TranscriptMetadata;
  content: string;
}

export interface TranscriptMetadata {
  sessionId: string;
  scenario: string;
  roles: string[];
  rounds: number;
  messageCount: number;
  validationPoints: string[];
}

export async function loadGoldenTranscript(
  transcriptPath: string
): Promise<GoldenTranscript> {
  const content = await readFile(transcriptPath, "utf-8");

  // Parse metadata from markdown frontmatter
  const metadata = parseMetadata(content);

  return {
    id: metadata.sessionId,
    metadata,
    content,
  };
}

function parseMetadata(content: string): TranscriptMetadata {
  // Extract metadata section
  const metadataMatch = content.match(/## 元数据\n\n([\s\S]*?)(?=\n## )/);
  if (!metadataMatch) {
    throw new Error("Failed to parse transcript metadata");
  }

  const metadataSection = metadataMatch[1];

  // Parse fields
  const sessionId = extractField(metadataSection, "Session ID");
  const scenario = extractField(metadataSection, "场景");
  const roles = extractList(metadataSection, "角色");
  const rounds = parseInt(extractField(metadataSection, "轮次"), 10);
  const messageCount = parseInt(extractField(metadataSection, "消息数"), 10);
  const validationPoints = extractList(metadataSection, "主要验证点");

  return {
    sessionId,
    scenario,
    roles,
    rounds,
    messageCount,
    validationPoints,
  };
}

function extractField(section: string, fieldName: string): string {
  const regex = new RegExp(`\\*\\*${fieldName}\\*\\*:\\s*(.+)`, "i");
  const match = section.match(regex);
  if (!match) {
    throw new Error(`Field "${fieldName}" not found in metadata`);
  }
  return match[1].trim();
}

function extractList(section: string, fieldName: string): string[] {
  const field = extractField(section, fieldName);
  return field.split(",").map((item) => item.trim());
}

export async function loadAllGoldenTranscripts(
  transcriptsDir: string
): Promise<GoldenTranscript[]> {
  const { readdir } = await import("fs/promises");
  const files = await readdir(transcriptsDir);

  const transcripts: GoldenTranscript[] = [];

  for (const file of files) {
    if (file.endsWith(".md")) {
      const transcriptPath = join(transcriptsDir, file);
      const transcript = await loadGoldenTranscript(transcriptPath);
      transcripts.push(transcript);
    }
  }

  return transcripts;
}
