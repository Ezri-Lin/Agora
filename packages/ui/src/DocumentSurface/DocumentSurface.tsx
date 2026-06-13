import React, { useCallback, useEffect, useMemo, useState } from "react";
import type { ScannedDoc } from "../AgoraBridge.js";
import { useTheme } from "../theme/ThemeContext.js";
import { useNarrowViewport } from "../hooks/useNarrowViewport.js";
import { createDocumentSurfaceStyles } from "./documentSurfaceStyles.js";
import { MessageContent } from "../ChatBubble/MessageContent.js";
import { DocTree } from "../DocTree/DocTree.js";

interface DocumentSurfaceProps {
  docs: ScannedDoc[];
  activeDoc: ScannedDoc | null;
  content: string;
  isLoading: boolean;
  workspacePath?: string;
  onOpenDocument: (doc: ScannedDoc) => void;
  onAddReference: (doc: ScannedDoc) => void;
}

type DocumentMode = "preview" | "edit";

export const DocumentSurface: React.FC<DocumentSurfaceProps> = ({
  docs,
  activeDoc,
  content,
  isLoading,
  workspacePath,
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

  // Convert [[wikilinks]] to markdown links
  const processedContent = useMemo(() => {
    return draft.replace(/\[\[([^\]]+)\]\]/g, (match, target) => {
      return `[${target}](wikilink:${encodeURIComponent(target)})`;
    });
  }, [draft]);

  // Handle wikilink click: find doc by name and open it
  const handleWikiLink = useCallback((target: string) => {
    const decodedTarget = decodeURIComponent(target);
    const match = docs.find(
      (d) => d.name === decodedTarget || d.name.replace(/\.[^.]+$/, "") === decodedTarget,
    );
    if (match) onOpenDocument(match);
  }, [docs, onOpenDocument]);

  return (
    <aside className="docs-sidecar" style={{ display: "grid", position: "relative", width: "100%", height: "100%" }} role="region" aria-label="Document Surface">
      <div className="doc-head">
        <b>Project files</b>
        <div className="doc-tabs">
          <span className={mode === "preview" ? "on" : ""} onClick={() => setMode("preview")} style={{ cursor: "pointer" }}>Preview</span>
          <span className={mode === "edit" ? "on" : ""} onClick={() => setMode("edit")} style={{ cursor: "pointer" }}>Edit</span>
          {activeDoc && <span onClick={() => onAddReference(activeDoc)} style={{ cursor: "pointer", color: colors.accent }}>Reference</span>}
        </div>
      </div>
      <div className="doc-body">
        <div className="filetree">
          <div className="filter">Filter files…</div>
          <DocTree docs={docs} activeDocPath={activeDoc?.path} workspacePath={workspacePath} onSelect={onOpenDocument} colors={colors} />
        </div>
        <article className="preview">
          {isLoading && <div style={{ color: colors.textMuted }}>Loading document...</div>}
          {!isLoading && !activeDoc && <div style={{ color: colors.textMuted }}>Choose a document from the list.</div>}
          
          {!isLoading && activeDoc && (
            <>
              <h1>{activeDoc.name}</h1>
              {mode === "preview" && (
                <MessageContent content={processedContent} colors={colors} onWikiLink={handleWikiLink} />
              )}
              {mode === "edit" && (
                <textarea
                  aria-label="Document editor"
                  style={{
                    width: "100%", height: "100%", minHeight: "300px",
                    background: "transparent", color: "inherit", border: "1px solid #333",
                    padding: "10px", borderRadius: "8px", font: "inherit", resize: "none"
                  }}
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                />
              )}
            </>
          )}
        </article>
      </div>
    </aside>
  );
};
