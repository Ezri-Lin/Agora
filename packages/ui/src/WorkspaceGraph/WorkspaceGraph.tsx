import React, { useEffect, useRef, useMemo, useCallback } from "react";
import Graph from "graphology";
import Sigma from "sigma";
import forceAtlas2 from "graphology-layout-forceatlas2";
import type { ScannedDoc } from "../AgoraBridge.js";
import { useTheme } from "../theme/ThemeContext.js";
import { graph as graphTokens } from "../theme/tokens.js";

interface RoomEntry {
  id: string;
  title: string;
  createdAt: string;
}

interface WorkspaceGraphProps {
  docs: ScannedDoc[];
  rooms: RoomEntry[];
}

function truncate(value: string, max: number) {
  return value.length > max ? `${value.slice(0, max - 1)}` : value;
}

function getNodeColor(kind: string): string {
  switch (kind) {
    case "document": return graphTokens.nodeGreen;
    case "room": return graphTokens.nodeYellow;
    case "workspace": return graphTokens.nodeGray;
    default: return graphTokens.nodeMuted;
  }
}

function getNodeSize(kind: string, degree: number): number {
  const base = kind === "workspace"
    ? graphTokens.nodeCoreRadius
    : kind === "room"
      ? graphTokens.nodeRoomRadius
      : graphTokens.nodeDocRadius;
  return base + degree * 0.2;
}

function buildGraphology(
  docs: ScannedDoc[],
  rooms: RoomEntry[],
  colors: { border: string },
): Graph {
  const g = new Graph();

  // Workspace hub
  g.addNode("workspace", {
    label: "Workspace",
    kind: "workspace",
    x: 0,
    y: 0,
    size: getNodeSize("workspace", 0),
    color: getNodeColor("workspace"),
  });

  // Docs (green)
  const docIds: string[] = [];
  for (const doc of docs) {
    const id = `doc:${doc.path}`;
    docIds.push(id);
    g.addNode(id, {
      label: truncate(doc.name, 30),
      kind: "document",
      x: (Math.random() - 0.5) * 0.5,
      y: (Math.random() - 0.5) * 0.5,
      size: getNodeSize("document", 0),
      color: getNodeColor("document"),
    });
    g.addEdge("workspace", id, {
      size: graphTokens.edgeWidth,
      color: colors.border,
    });
  }

  // Rooms (yellow)
  const roomIds: string[] = [];
  for (const room of rooms) {
    const id = `room:${room.id}`;
    roomIds.push(id);
    g.addNode(id, {
      label: truncate(room.title, 30),
      kind: "room",
      x: (Math.random() - 0.5) * 0.5,
      y: (Math.random() - 0.5) * 0.5,
      size: getNodeSize("room", 0),
      color: getNodeColor("room"),
    });
    g.addEdge("workspace", id, {
      size: graphTokens.edgeWidth,
      color: colors.border,
    });
  }

  // Real cross-edges: rooms reference specific docs
  // (In full implementation, room.sourceRefs would link to doc nodes)
  // For now, sparse room↔doc connections based on name similarity
  for (const roomId of roomIds) {
    const room = rooms.find(r => `room:${r.id}` === roomId);
    if (!room) continue;
    // Connect room to docs whose names partially match room title
    for (const docId of docIds) {
      const doc = docs.find(d => `doc:${d.path}` === docId);
      if (!doc) continue;
      const roomWords = room.title.toLowerCase().split(/\s+/);
      const docName = doc.name.toLowerCase();
      if (roomWords.some(w => w.length > 2 && docName.includes(w))) {
        g.addEdge(roomId, docId, {
          size: graphTokens.edgeWidth * 0.6,
          color: colors.border,
        });
      }
    }
  }

  // Scale node size by degree
  g.forEachNode((node, attrs) => {
    const degree = g.degree(node);
    const kind = attrs.kind as string;
    g.setNodeAttribute(node, "size", getNodeSize(kind, degree));
  });

  return g;
}

export const WorkspaceGraph: React.FC<WorkspaceGraphProps> = ({ docs, rooms }) => {
  console.log("[WorkspaceGraph] Rendering with", docs.length, "docs and", rooms.length, "rooms");
  const { colors } = useTheme();
  const containerRef = useRef<HTMLDivElement>(null);
  const sigmaRef = useRef<Sigma | null>(null);
  const hoveredRef = useRef<string | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const graph = useMemo(
    () => buildGraphology(docs, rooms, colors),
    [docs, rooms, colors],
  );

  const showTooltip = useCallback((label: string, x: number, y: number) => {
    const el = tooltipRef.current;
    if (!el) return;
    el.textContent = label;
    el.style.opacity = "1";
    el.style.left = `${x}px`;
    el.style.top = `${y - 32}px`;
  }, []);

  const hideTooltip = useCallback(() => {
    const el = tooltipRef.current;
    if (!el) return;
    el.style.opacity = "0";
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;

    if (graph.order > 1) {
      forceAtlas2.assign(graph, {
        iterations: 200,
        settings: {
          gravity: 0.8,
          scalingRatio: 10,
          strongGravityMode: false,
          barnesHutOptimize: true,
          edgeWeightInfluence: 0.2,
          linLogMode: true,
          outboundAttractionDistribution: false,
          adjustSizes: true,
          slowDown: 1,
        },
      });
    }

    const sigma = new Sigma(graph, containerRef.current, {
      renderLabels: false,
      renderEdgeLabels: false,
      defaultEdgeType: "line",
      allowInvalidContainer: true,
      minCameraRatio: 0.05,
      maxCameraRatio: 10,
      enableCameraRotation: false,
      labelColor: { color: colors.text },
      labelFont: "system-ui, -apple-system, sans-serif",
      labelSize: 10,
      labelWeight: "500",
      labelDensity: 0,
      nodeReducer: (node, data) => {
        const res = { ...data };
        if (hoveredRef.current === node) {
          res.size = (data.size as number) * 1.8;
          res.forceLabel = true;
        } else if (hoveredRef.current) {
          const hoveredEdges = graph.edges(hoveredRef.current);
          const connected = hoveredEdges.some(e =>
            graph.source(e) === node || graph.target(e) === node,
          );
          if (!connected) {
            res.color = graphTokens.nodeMuted;
            res.size = (data.size as number) * 0.6;
          }
        }
        return res;
      },
      edgeReducer: (edge, data) => {
        const res = { ...data };
        if (hoveredRef.current) {
          const hoveredEdges = graph.edges(hoveredRef.current);
          if (!hoveredEdges.includes(edge)) {
            res.hidden = true;
          }
        }
        return res;
      },
    });

    sigma.on("enterNode", ({ node }) => {
      hoveredRef.current = node;
      sigma.refresh();
      const attrs = graph.getNodeAttributes(node);
      const camera = sigma.getCamera();
      const rect = containerRef.current!.getBoundingClientRect();
      const sx = (attrs.x as number - camera.x) / camera.ratio + rect.width / 2;
      const sy = (attrs.y as number - camera.y) / camera.ratio + rect.height / 2;
      showTooltip(attrs.label as string, sx, sy);
    });

    sigma.on("leaveNode", () => {
      hoveredRef.current = null;
      sigma.refresh();
      hideTooltip();
    });

    sigmaRef.current = sigma;

    const ro = new ResizeObserver(() => sigma.refresh());
    ro.observe(containerRef.current);

    return () => {
      ro.disconnect();
      sigma.kill();
      sigmaRef.current = null;
    };
  }, [graph, colors, showTooltip, hideTooltip]);

  if (graph.order <= 1) {
    return (
      <div style={{ position: "relative", height: "100%", minHeight: 360, display: "flex", alignItems: "center", justifyContent: "center", background: colors.bg }}>
        <div style={{ textAlign: "center", color: colors.textMuted, fontSize: 13, lineHeight: 1.6 }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" style={{ width: 32, height: 32, margin: "0 auto 12px", opacity: 0.3 }}>
            <circle cx="12" cy="12" r="10" strokeWidth="1.5" />
            <circle cx="12" cy="12" r="3" strokeWidth="1.5" />
            <path d="M12 2v4M12 18v4M2 12h4M18 12h4" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <div>No documents or rooms yet</div>
          <div style={{ fontSize: 12, opacity: 0.6 }}>Open files or start a chat to build the graph</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ position: "relative", height: "100%", minHeight: 360 }}>
      <div ref={containerRef} style={{ width: "100%", height: "100%", position: "absolute", inset: 0 }} />
      <div
        ref={tooltipRef}
        style={{
          position: "absolute",
          pointerEvents: "none",
          opacity: 0,
          background: colors.surface,
          border: `1px solid ${colors.border}`,
          borderRadius: 4,
          padding: "4px 8px",
          fontSize: 11,
          fontWeight: 500,
          color: colors.text,
          whiteSpace: "nowrap",
          zIndex: 20,
          transition: "opacity 0.12s",
          boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
        }}
      />
    </div>
  );
};
