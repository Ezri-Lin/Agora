import React, { useEffect, useState } from "react";
import type { GraphAuditSnapshot } from "../GraphSurface/model/graphAudit.js";
import { OBSIDIAN_PROFILE } from "../GraphSurface/layout/layoutProfile.js";

interface GraphAuditPanelProps {
  snapshot: GraphAuditSnapshot | null;
}

export const GraphAuditPanel: React.FC<GraphAuditPanelProps> = ({ snapshot }) => {
  const [expanded, setExpanded] = useState(true);
  const [copied, setCopied] = useState(false);
  const [zoomScale, setZoomScale] = useState(1);

  // Poll zoom scale from window.__cameraZoom
  useEffect(() => {
    const interval = setInterval(() => {
      const z = (window as any).__cameraZoom;
      if (typeof z === "number") setZoomScale(z);
    }, 200);
    return () => clearInterval(interval);
  }, []);

  if (!snapshot) return null;

  const { nodes, edges, parser, clusters } = snapshot;

  // Calculate screen-space node sizes at current zoom
  const docMinScreen = 3.8 * zoomScale;
  const docMaxScreen = 16 * zoomScale;
  const tagMinScreen = 3.2 * zoomScale;
  const tagMaxScreen = 12 * zoomScale;
  const ghostMinScreen = 3.2 * zoomScale;
  const ghostMaxScreen = 12 * zoomScale;
  const edgeWidthScreen = 1.0 * zoomScale;

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
Markdown links: ${parser.totalMarkdownLinks}

Zoom: ${zoomScale.toFixed(2)}x

Screen-Space Sizes (at current zoom)
  document: ${docMinScreen.toFixed(1)}-${docMaxScreen.toFixed(1)}px
  tag: ${tagMinScreen.toFixed(1)}-${tagMaxScreen.toFixed(1)}px
  ghost: ${ghostMinScreen.toFixed(1)}-${ghostMaxScreen.toFixed(1)}px
  edge width: ${edgeWidthScreen.toFixed(2)}px

Visual Defaults (world-space)
  doc min: 3.8 | doc max: 16
  tag min: 3.2 | tag max: 12
  ghost min: 3.2 | ghost max: 12
  edge width: 1.0 | edge opacity: 0.42
Layout:
  linkDistance: ${OBSIDIAN_PROFILE.linkDistance}
  linkStrength: ${OBSIDIAN_PROFILE.linkStrength}
  manyBodyStrength: ${OBSIDIAN_PROFILE.manyBodyStrength}
  centerStrength: 0.16
Labels:
  budget: 240 | fontSize: 11-12px`;

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
          <div style={{ borderTop: "1px solid #444", marginTop: 4, paddingTop: 4 }}>
            <div>Clusters: {clusters.total} (largest: {clusters.largest}, unclustered: {clusters.unclustered})</div>
            {clusters.topClusters.length > 0 && (
              <div style={{ paddingLeft: 8, fontSize: 10 }}>
                {clusters.topClusters.slice(0, 5).map((c) => `${c.id}(${c.count})`).join(" ")}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};
