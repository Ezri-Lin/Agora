/**
 * Document types for the retrieval pipeline.
 *
 * DocumentMap: structural metadata for a parsed document.
 * TextChunk: a retrieval-ready segment with heading context.
 */

export interface DocumentMap {
  docId: string;
  path: string;
  title: string;
  kind: "markdown" | "text" | "json" | "yaml" | "code";
  headings: DocumentHeading[];
  links: string[];
  tags: string[];
  frontmatter?: Record<string, unknown>;
  lastModified?: string;
  contentHash: string;
}

export interface DocumentHeading {
  id: string;
  level: number;
  title: string;
  headingPath: string[];
  startOffset: number;
  endOffset: number;
  summary?: string;
}

export interface TextChunk {
  chunkId: string;
  docId: string;
  path: string;
  headingPath: string[];
  text: string;
  tokenEstimate: number;
  startOffset: number;
  endOffset: number;
  summary?: string;
}
