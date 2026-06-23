import React, { useState } from "react";
import type { GraphAuditSnapshot } from "../GraphSurface/model/graphAudit.js";

interface GraphAuditPanelProps {
  snapshot: GraphAuditSnapshot | null;
}

export const GraphAuditPanel: React.FC<GraphAuditPanelProps> = ({ snapshot }) => {
  const [expanded, setExpanded] = useState(true);
  const [copied, setCopied] = useState(false);

  if (!snapshot) return null;

  const { nodes, edges, parser } = snapshot;

  const formatAudit = () => `Graph Audit Snapshot
Nodes: ${nodes.total}
  document: ${nodes.document} | tag: ${nodes.tag} | ghost: ${nodes.ghost}
  workspace: ${nodes.workspace} | room: ${nodes.room}
Edges: ${edges.total}
  wikilink: ${edges.wikilink} | tag: ${edges.tag} | ghost: ${edges.ghost}
  fallback: ${edges.fallback}
Files scanned: ${parser.filesScanned}
Files parsed: ${parser.filesParsed}
Wikilinks: ${parser.totalWikilinks} (resolved: ${parser.resolvedWikilinks})
Tags: ${parser.totalTags}
Markdown links: ${parser.totalMarkdownLinks}`;

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await navigator.clipboard.writeText(formatAudit());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      style={{
        position: "absolute",
        top: 8,
        right: 8,
        background: "rgba(0,0,0,0.85)",
        color: "#e0e0e0",
        padding: "8px 12px",
        borderRadius: 6,
        fontSize: 11,
        fontFamily: "monospace",
        lineHeight: 1.6,
        zIndex: 100,
        maxWidth: 280,
        cursor: "pointer",
        userSelect: "none",
      }}
      onClick={() => setExpanded(!expanded)}
      title="Click to expand/collapse"
    >
      <div style={{ fontWeight: 600, marginBottom: 4, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span>Graph Audit {expanded ? "▼" : "▶"}</span>
        <button
          onClick={handleCopy}
          style={{
            background: "rgba(255,255,255,0.15)",
            border: "none",
            color: "#e0e0e0",
            padding: "2px 8px",
            borderRadius: 4,
            fontSize: 10,
            cursor: "pointer",
          }}
        >
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>
      {expanded && (
        <>
          <div style={{ borderBottom: "1px solid #444", marginBottom: 4, paddingBottom: 4 }}>
            <div>Nodes: {nodes.total}</div>
            <div style={{ paddingLeft: 8 }}>
              document: {nodes.document} | tag: {nodes.tag} | ghost: {nodes.ghost}
            </div>
            <div style={{ paddingLeft: 8 }}>
              workspace: {nodes.workspace} | room: {nodes.room}
            </div>
          </div>
          <div style={{ borderBottom: "1px solid #444", marginBottom: 4, paddingBottom: 4 }}>
            <div>Edges: {edges.total}</div>
            <div style={{ paddingLeft: 8 }}>
              wikilink: {edges.wikilink} | tag: {edges.tag} | ghost: {edges.ghost}
            </div>
            <div style={{ paddingLeft: 8 }}>
              fallback: {edges.fallback}
            </div>
          </div>
          <div>
            <div>Files scanned: {parser.filesScanned}</div>
            <div>Files parsed: {parser.filesParsed}</div>
            <div>Wikilinks: {parser.totalWikilinks} (resolved: {parser.resolvedWikilinks})</div>
            <div>Tags: {parser.totalTags}</div>
          </div>
        </>
      )}
    </div>
  );
};
