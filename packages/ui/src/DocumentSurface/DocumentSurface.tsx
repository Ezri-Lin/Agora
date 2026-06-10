import React, { useEffect, useMemo, useState } from "react";
import type { ScannedDoc } from "../AgoraBridge.js";
import { useTheme } from "../theme/ThemeContext.js";
import { useNarrowViewport } from "../hooks/useNarrowViewport.js";
import { createDocumentSurfaceStyles } from "./documentSurfaceStyles.js";

interface DocumentSurfaceProps {
  docs: ScannedDoc[];
  activeDoc: ScannedDoc | null;
  content: string;
  isLoading: boolean;
  onOpenDocument: (doc: ScannedDoc) => void;
  onAddReference: (doc: ScannedDoc) => void;
}

type DocumentMode = "preview" | "edit";

export const DocumentSurface: React.FC<DocumentSurfaceProps> = ({
  docs,
  activeDoc,
  content,
  isLoading,
  onOpenDocument,
  onAddReference,
}) => {
  const { colors } = useTheme();
  const isNarrow = useNarrowViewport();
  const styles = createDocumentSurfaceStyles(colors, isNarrow);
  const [mode, setMode] = useState<DocumentMode>("preview");
  const [draft, setDraft] = useState(content);

  useEffect(() => {
    setDraft(content);
    setMode("preview");
  }, [activeDoc?.path, content]);

  const previewBlocks = useMemo(() => renderPreview(draft), [draft]);

  return (
    <main style={styles.root} role="region" aria-label="Document Surface">
      <aside style={styles.rail} aria-label="Workspace documents">
        <div style={styles.sectionLabel}>Documents</div>
        <div style={styles.docList}>
          {docs.length === 0 && <div style={styles.empty}>No documents found</div>}
          {docs.map((doc) => {
            const selected = activeDoc?.path === doc.path;
            return (
              <button
                type="button"
                key={doc.path}
                style={{ ...styles.docRow, ...(selected ? styles.docRowActive : {}) }}
                onClick={() => onOpenDocument(doc)}
              >
                <span style={styles.ext}>{doc.ext.replace(".", "") || "doc"}</span>
                <span style={styles.docName}>{doc.name}</span>
              </button>
            );
          })}
        </div>
      </aside>
      <section style={styles.documentPane}>
        <header style={styles.header}>
          <div>
            <div style={styles.docTitle}>{activeDoc?.name ?? "Select a document"}</div>
            <div style={styles.docPath}>{activeDoc?.path ?? "Open a workspace document to read or quote it."}</div>
          </div>
          <div style={styles.actions}>
            <div style={styles.segmented} role="group" aria-label="Document mode">
              <button
                type="button"
                style={{ ...styles.segmentButton, ...(mode === "preview" ? styles.segmentButtonActive : {}) }}
                aria-pressed={mode === "preview"}
                onClick={() => setMode("preview")}
              >
                Preview
              </button>
              <button
                type="button"
                style={{ ...styles.segmentButton, ...(mode === "edit" ? styles.segmentButtonActive : {}) }}
                aria-pressed={mode === "edit"}
                onClick={() => setMode("edit")}
              >
                Edit
              </button>
            </div>
            {activeDoc && (
              <button type="button" style={styles.primaryButton} onClick={() => onAddReference(activeDoc)}>
                Reference in Chat
              </button>
            )}
          </div>
        </header>
        <div style={styles.body}>
          {isLoading && <div style={styles.empty}>Loading document...</div>}
          {!isLoading && !activeDoc && <div style={styles.empty}>Choose a document from the list.</div>}
          {!isLoading && activeDoc && mode === "preview" && (
            <article style={styles.preview}>{previewBlocks}</article>
          )}
          {!isLoading && activeDoc && mode === "edit" && (
            <textarea
              aria-label="Document editor"
              style={styles.editor}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
            />
          )}
        </div>
      </section>
    </main>
  );
};

function renderPreview(markdown: string): React.ReactNode[] {
  const lines = markdown.split(/\r?\n/);
  const blocks: React.ReactNode[] = [];
  let paragraph: string[] = [];

  const flushParagraph = () => {
    if (paragraph.length === 0) return;
    const text = paragraph.join(" ").trim();
    if (text) blocks.push(<p key={`p-${blocks.length}`}>{text}</p>);
    paragraph = [];
  };

  lines.forEach((line) => {
    if (!line.trim()) {
      flushParagraph();
      return;
    }
    const heading = line.match(/^(#{1,3})\s+(.+)$/);
    if (heading) {
      flushParagraph();
      blocks.push(<h1 key={`h-${blocks.length}`}>{heading[2]}</h1>);
      return;
    }
    paragraph.push(line);
  });
  flushParagraph();

  return blocks.length > 0 ? blocks : [<p key="empty">This document is empty.</p>];
}
