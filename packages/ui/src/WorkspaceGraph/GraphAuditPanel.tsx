import React, { useEffect, useState } from "react";
import type { GraphAuditSnapshot } from "../GraphSurface/model/graphAudit.js";
import { OBSIDIAN_PROFILE } from "../GraphSurface/layout/layoutProfile.js";
import type { LayoutMetrics } from "../GraphSurface/model/layoutMetrics.js";

interface GraphAuditPanelProps {
  snapshot: GraphAuditSnapshot | null;
  rawSnapshot?: GraphAuditSnapshot | null;
}

export const GraphAuditPanel: React.FC<GraphAuditPanelProps> = ({ snapshot, rawSnapshot }) => {
  const [expanded, setExpanded] = useState(true);
  const [copied, setCopied] = useState(false);
  const [zoomScale, setZoomScale] = useState(1);
  const [layoutMetrics, setLayoutMetrics] = useState<LayoutMetrics | null>(null);

  // Poll zoom scale from window.__cameraZoom
  useEffect(() => {
    const interval = setInterval(() => {
      const z = (window as any).__cameraZoom;
      if (typeof z === "number") setZoomScale(z);
      const metrics = (window as any).__graphLayoutMetrics;
      if (metrics && typeof metrics.nodeCount === "number") {
        setLayoutMetrics(metrics);
      }
    }, 200);
    return () => clearInterval(interval);
  }, []);

  if (!snapshot) return null;

  const { nodes, edges, parser, clusters } = snapshot;
  const rawNodes = rawSnapshot?.nodes;
  const rawEdges = rawSnapshot?.edges;

  const nodeScale = Math.sqrt(1 / Math.max(zoomScale, 0.001));
  const edgeWidthScreen = 1.0 * zoomScale;

  const formatAudit = () => `Graph Audit Snapshot
Visible Nodes: ${nodes.total}
  document: ${nodes.document} | tag: ${nodes.tag} | ghost: ${nodes.ghost}
  workspace: ${nodes.workspace} | room: ${nodes.room}
Visible Edges: ${edges.total}
  wikilink: ${edges.wikilink} | tag: ${edges.tag} | ghost: ${edges.ghost}
  fallback: ${edges.fallback}
Raw Nodes: ${rawNodes?.total ?? nodes.total}
  document: ${rawNodes?.document ?? nodes.document} | tag: ${rawNodes?.tag ?? nodes.tag} | ghost: ${rawNodes?.ghost ?? nodes.ghost}
Raw Edges: ${rawEdges?.total ?? edges.total}
  wikilink: ${rawEdges?.wikilink ?? edges.wikilink} | tag: ${rawEdges?.tag ?? edges.tag} | ghost: ${rawEdges?.ghost ?? edges.ghost}
Files scanned: ${parser.filesScanned}
Files parsed: ${parser.filesParsed}
Wikilinks: ${parser.totalWikilinks} (resolved: ${parser.resolvedWikilinks})
Tags: ${parser.totalTags}
Markdown links: ${parser.totalMarkdownLinks}

Zoom: ${zoomScale.toFixed(2)}x

Render LOD
  nodeScale: ${nodeScale.toFixed(2)}x
  edge width: ${edgeWidthScreen.toFixed(2)}px

Layout:
  linkDistance: ${OBSIDIAN_PROFILE.linkDistance}
  linkStrength: ${OBSIDIAN_PROFILE.linkStrength}
  manyBodyStrength: ${OBSIDIAN_PROFILE.manyBodyStrength}
  collisionRadius: ${OBSIDIAN_PROFILE.collisionRadius ?? 60}
  centerStrength: ${OBSIDIAN_PROFILE.centerStrength ?? 0.1}
Labels:
  delayed log fade | fontSize: 10-12px
Metrics:
  nnMean: ${layoutMetrics?.nearestNeighborMean.toFixed(1) ?? "n/a"}
  nnCV: ${layoutMetrics?.nearestNeighborCoefficientOfVariation.toFixed(2) ?? "n/a"}`;

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
            <div>Visible Nodes: {nodes.total}</div>
            <div style={{ paddingLeft: 8 }}>
              document: {nodes.document} | tag: {nodes.tag} | ghost: {nodes.ghost}
            </div>
            <div style={{ paddingLeft: 8 }}>
              workspace: {nodes.workspace} | room: {nodes.room}
            </div>
          </div>
          <div style={{ borderBottom: "1px solid #444", marginBottom: 4, paddingBottom: 4 }}>
            <div>Visible Edges: {edges.total}</div>
            <div style={{ paddingLeft: 8 }}>
              wikilink: {edges.wikilink} | tag: {edges.tag} | ghost: {edges.ghost}
            </div>
            <div style={{ paddingLeft: 8 }}>
              fallback: {edges.fallback}
            </div>
          </div>
          {rawSnapshot && (
            <div style={{ borderBottom: "1px solid #444", marginBottom: 4, paddingBottom: 4 }}>
              <div>Raw: {rawSnapshot.nodes.total} nodes / {rawSnapshot.edges.total} edges</div>
              <div style={{ paddingLeft: 8 }}>
                tag: {rawSnapshot.nodes.tag} | ghost: {rawSnapshot.nodes.ghost}
              </div>
              <div style={{ paddingLeft: 8 }}>
                tag edges: {rawSnapshot.edges.tag} | ghost edges: {rawSnapshot.edges.ghost}
              </div>
            </div>
          )}
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
          <div style={{ borderTop: "1px solid #444", marginTop: 4, paddingTop: 4 }}>
            <div>Zoom: {zoomScale.toFixed(2)}x | nodeScale: {nodeScale.toFixed(2)}x</div>
            {layoutMetrics && (
              <>
                <div>NN mean: {layoutMetrics.nearestNeighborMean.toFixed(1)}</div>
                <div>NN cv: {layoutMetrics.nearestNeighborCoefficientOfVariation.toFixed(2)}</div>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
};
