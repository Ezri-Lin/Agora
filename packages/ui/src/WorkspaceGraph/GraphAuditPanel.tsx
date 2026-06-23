import React, { useState } from "react";
import type { GraphAuditSnapshot } from "../GraphSurface/model/graphAudit.js";

interface GraphAuditPanelProps {
  snapshot: GraphAuditSnapshot | null;
}

export const GraphAuditPanel: React.FC<GraphAuditPanelProps> = ({ snapshot }) => {
  const [expanded, setExpanded] = useState(true);

  if (!snapshot) return null;

  const { nodes, edges, parser } = snapshot;

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
      <div style={{ fontWeight: 600, marginBottom: 4 }}>
        Graph Audit {expanded ? "▼" : "▶"}
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
