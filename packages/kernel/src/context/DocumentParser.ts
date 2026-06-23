/**
 * DocumentParser — pure function that parses document content into
 * DocumentMap + TextChunk[] for the retrieval pipeline.
 *
 * No Node fs dependency. Takes raw content string, returns structured data.
 */

import type { DocumentMap, DocumentHeading, TextChunk } from "./documentTypes.js";
import { stableHashInt } from "../documentWrite/contentHash.js";

interface ParseDocumentInput {
  path: string;
  content: string;
  kind?: DocumentMap["kind"];
}

interface ParseDocumentOutput {
  document: DocumentMap;
  chunks: TextChunk[];
}

/** Rough token estimation: ~4 chars per token for mixed CJK/English. */
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}


function detectKind(path: string): DocumentMap["kind"] {
  const ext = path.split(".").pop()?.toLowerCase();
  switch (ext) {
    case "md":
    case "markdown":
      return "markdown";
    case "json":
      return "json";
    case "yaml":
    case "yml":
      return "yaml";
    case "txt":
    case "text":
      return "text";
    default:
      return "code";
  }
}

/** Extract frontmatter from markdown (YAML between --- fences). */
function extractFrontmatter(content: string): {
  frontmatter?: Record<string, unknown>;
  bodyOffset: number;
} {
  const trimmed = content.trimStart();
  if (!trimmed.startsWith("---")) return { bodyOffset: 0 };

  const end = trimmed.indexOf("\n---", 3);
  if (end === -1) return { bodyOffset: 0 };

  const yamlStr = trimmed.slice(3, end + 1).trim();
  const bodyOffset = content.indexOf("---") + 3 + end + 4;

  // Simple key: value extraction (not full YAML parser)
  const fm: Record<string, unknown> = {};
  for (const line of yamlStr.split("\n")) {
    const match = line.match(/^(\w[\w-]*)\s*:\s*(.+)/);
    if (match) {
      fm[match[1]] = match[2].trim().replace(/^["']|["']$/g, "");
    }
  }

  return Object.keys(fm).length > 0 ? { frontmatter: fm, bodyOffset } : { bodyOffset };
}

/** Extract markdown links as [text](url). */
function extractLinks(content: string): string[] {
  const links: string[] = [];
  const regex = /\[([^\]]*)\]\(([^)]+)\)/g;
  let match;
  while ((match = regex.exec(content)) !== null) {
    links.push(match[2]);
  }
  return [...new Set(links)];
}

/** Extract [[wikilinks]] — supports [[target]], [[target|alias]], [[target#heading]]. */
function extractWikilinks(content: string): string[] {
  const wikilinks: string[] = [];
  // Match [[target]], [[target|alias]], [[target#heading]], [[target#heading|alias]]
  // Exclude [[ ]] (empty) and images ![[...]]
  const regex = /(?<!!)\[\[([^\]]+?)\]\]/g;
  let match;
  while ((match = regex.exec(content)) !== null) {
    const raw = match[1].trim();
    // Take only the target part (before | or #)
    const target = raw.split("|")[0].split("#")[0].trim();
    if (target) wikilinks.push(target);
  }
  return [...new Set(wikilinks)];
}

/** Extract aliases from frontmatter. */
function extractAliases(frontmatter?: Record<string, unknown>): string[] {
  if (!frontmatter) return [];

  const aliases: string[] = [];

  // aliases: [Foo, Bar]
  const fmAliases = frontmatter.aliases;
  if (typeof fmAliases === "string") {
    aliases.push(...fmAliases.split(",").map((t) => t.trim()));
  } else if (Array.isArray(fmAliases)) {
    aliases.push(...fmAliases.map(String));
  }

  // alias: Baz (singular form)
  const fmAlias = frontmatter.alias;
  if (typeof fmAlias === "string") {
    aliases.push(...fmAlias.split(",").map((t) => t.trim()));
  } else if (Array.isArray(fmAlias)) {
    aliases.push(...fmAlias.map(String));
  }

  return [...new Set(aliases.filter(Boolean))];
}

/** Extract tags: #tag or frontmatter tags. */
function extractTags(content: string, frontmatter?: Record<string, unknown>): string[] {
  const tags: string[] = [];

  // From frontmatter
  const fmTags = frontmatter?.tags;
  if (typeof fmTags === "string") {
    tags.push(...fmTags.split(",").map((t) => t.trim()));
  } else if (Array.isArray(fmTags)) {
    tags.push(...fmTags.map(String));
  }

  // Inline #tags (not inside code blocks)
  const codeBlockRegex = /```[\s\S]*?```/g;
  const withoutCode = content.replace(codeBlockRegex, "");
  const tagRegex = /(?:^|\s)#([\w-]+)/g;
  let match;
  while ((match = tagRegex.exec(withoutCode)) !== null) {
    tags.push(match[1]);
  }

  return [...new Set(tags)];
}

/** Extract title: first H1, or filename. */
function extractTitle(content: string, path: string): string {
  const h1Match = content.match(/^#\s+(.+)$/m);
  if (h1Match) return h1Match[1].trim();

  const filename = path.split("/").pop() ?? path;
  return filename.replace(/\.\w+$/, "");
}

/** Parse headings from markdown content. */
function parseHeadings(
  content: string,
  docId: string,
): DocumentHeading[] {
  const headings: DocumentHeading[] = [];
  const lines = content.split("\n");
  const stack: Array<{ level: number; title: string }> = [];
  let offset = 0;

  for (const line of lines) {
    const match = line.match(/^(#{1,6})\s+(.+)$/);
    if (match) {
      const level = match[1].length;
      const title = match[2].trim();

      // Pop stack to find parent level
      while (stack.length > 0 && stack[stack.length - 1].level >= level) {
        stack.pop();
      }
      stack.push({ level, title });

      const headingPath = stack.map((s) => s.title);
      const id = `${docId}_h${stableHashInt(headingPath.join(">"))}`;

      headings.push({
        id,
        level,
        title,
        headingPath,
        startOffset: offset,
        endOffset: offset + line.length, // will be updated when next heading found
      });
    }
    offset += line.length + 1; // +1 for newline
  }

  // Update endOffsets
  for (let i = 0; i < headings.length - 1; i++) {
    headings[i].endOffset = headings[i + 1].startOffset;
  }
  if (headings.length > 0) {
    headings[headings.length - 1].endOffset = content.length;
  }

  return headings;
}

const MAX_CHUNK_TOKENS = 500;

/**
 * Split content into TextChunks based on headings.
 * Each heading section becomes one or more chunks.
 */
function buildChunks(
  docId: string,
  path: string,
  content: string,
  headings: DocumentHeading[],
): TextChunk[] {
  if (headings.length === 0) {
    // No headings — treat entire doc as one chunk (or split if large)
    if (!content.trim()) return [];
    return splitLargeChunk(docId, path, [], content, 0, content.length);
  }

  const chunks: TextChunk[] = [];

  // Content before first heading
  if (headings[0].startOffset > 0) {
    const preamble = content.slice(0, headings[0].startOffset).trim();
    if (preamble) {
      chunks.push(...splitLargeChunk(docId, path, [], preamble, 0, headings[0].startOffset));
    }
  }

  // Each heading section
  for (const heading of headings) {
    const sectionText = content.slice(heading.startOffset, heading.endOffset).trim();
    if (!sectionText) continue;

    chunks.push(
      ...splitLargeChunk(
        docId,
        path,
        heading.headingPath,
        sectionText,
        heading.startOffset,
        heading.endOffset,
      ),
    );
  }

  return chunks;
}

function splitLargeChunk(
  docId: string,
  path: string,
  headingPath: string[],
  text: string,
  startOffset: number,
  endOffset: number,
): TextChunk[] {
  const tokens = estimateTokens(text);
  if (tokens <= MAX_CHUNK_TOKENS) {
    return [{
      chunkId: `${docId}_c${stableHashInt(startOffset + ":" + endOffset)}`,
      docId,
      path,
      headingPath,
      text,
      tokenEstimate: tokens,
      startOffset,
      endOffset,
    }];
  }

  // Split by paragraphs (double newline)
  const paragraphs = text.split(/\n\n+/);
  const result: TextChunk[] = [];
  let current = "";
  let currentStart = startOffset;

  for (const para of paragraphs) {
    const candidate = current ? current + "\n\n" + para : para;
    if (estimateTokens(candidate) > MAX_CHUNK_TOKENS && current) {
      result.push({
        chunkId: `${docId}_c${stableHashInt(currentStart + ":" + (currentStart + current.length))}`,
        docId,
        path,
        headingPath,
        text: current,
        tokenEstimate: estimateTokens(current),
        startOffset: currentStart,
        endOffset: currentStart + current.length,
      });
      current = para;
      currentStart = currentStart + current.length + 2;
    } else {
      current = candidate;
    }
  }

  if (current.trim()) {
    result.push({
      chunkId: `${docId}_c${stableHashInt(currentStart + ":" + (currentStart + current.length))}`,
      docId,
      path,
      headingPath,
      text: current,
      tokenEstimate: estimateTokens(current),
      startOffset: currentStart,
      endOffset: endOffset,
    });
  }

  return result;
}

/**
 * Parse a document into structured DocumentMap + TextChunk[].
 *
 * Pure function — no fs, no side effects.
 */
export function parseDocument(input: ParseDocumentInput): ParseDocumentOutput {
  const { path, content } = input;
  const kind = input.kind ?? detectKind(path);
  const contentHash = String(stableHashInt(content));
  const docId = `doc_${stableHashInt(path + ":" + contentHash)}`;

  const { frontmatter, bodyOffset } = kind === "markdown"
    ? extractFrontmatter(content)
    : { bodyOffset: 0 };

  const body = bodyOffset > 0 ? content.slice(bodyOffset) : content;
  const title = frontmatter?.title
    ? String(frontmatter.title)
    : extractTitle(body, path);

  const headings = kind === "markdown" ? parseHeadings(body, docId) : [];
  const links = kind === "markdown" ? extractLinks(body) : [];
  const wikilinks = kind === "markdown" ? extractWikilinks(body) : [];
  const tags = extractTags(body, frontmatter);
  const aliases = extractAliases(frontmatter);

  const document: DocumentMap = {
    docId,
    path,
    title,
    kind,
    headings,
    links,
    wikilinks,
    tags,
    aliases,
    frontmatter,
    contentHash,
  };

  const chunks = buildChunks(docId, path, body, headings);

  return { document, chunks };
}
