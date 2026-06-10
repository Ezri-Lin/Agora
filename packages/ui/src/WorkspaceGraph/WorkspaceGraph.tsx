import React, { useEffect, useRef, useMemo } from "react";
import Graph from "graphology";
import Sigma from "sigma";
import forceAtlas2 from "graphology-layout-forceatlas2";
import type { ScannedDoc } from "../AgoraBridge.js";
import { useTheme } from "../theme/ThemeContext.js";
import type { ColorPalette } from "../theme/palettes.js";
import { radius, spacing, typography, graph as graphTokens } from "../theme/tokens.js";

interface RoomEntry {
  id: string;
  title: string;
  createdAt: string;
}

interface WorkspaceGraphProps {
  docs: ScannedDoc[];
  rooms: RoomEntry[];
}

function truncate(value: string, max: number): string {
  return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}

function buildGraphology(
  docs: ScannedDoc[],
  rooms: RoomEntry[],
  colors: ColorPalette,
): Graph {
  const g = new Graph();

  g.addNode("workspace", {
    label: "Workspace",
    kind: "workspace",
    x: 0,
    y: 0,
    size: graphTokens.nodeCoreRadius / 2,
    color: colors.accent,
  });

  const roomIds: string[] = [];
  for (const room of rooms.slice(0, 8)) {
    const id = `room:${room.id}`;
    roomIds.push(id);
    g.addNode(id, {
      label: truncate(room.title, 24),
      kind: "room",
      x: Math.random(),
      y: Math.random(),
      size: graphTokens.nodeRoomRadius / 2,
      color: colors.accent,
    });
    g.addEdge("workspace", id, { size: 1, color: colors.border });
  }

  const docIds: string[] = [];
  for (const doc of docs.slice(0, 18)) {
    const id = `doc:${doc.path}`;
    docIds.push(id);
    g.addNode(id, {
      label: truncate(doc.name, 24),
      kind: "document",
      x: Math.random(),
      y: Math.random(),
      size: graphTokens.nodeDocRadius / 2,
      color: colors.textMuted,
    });
    g.addEdge("workspace", id, { size: 1, color: colors.border });
  }

  // Cross-edges: rooms to each other
  for (let i = 0; i < roomIds.length; i++) {
    for (let j = i + 1; j < roomIds.length; j++) {
      g.addEdge(roomIds[i], roomIds[j], { size: 0.5, color: colors.border });
    }
  }

  // Cross-edges: docs to each other (neural web)
  for (let i = 0; i < docIds.length; i++) {
    for (let j = i + 1; j < Math.min(docIds.length, i + 3); j++) {
      if (!g.hasEdge(docIds[i], docIds[j])) {
        g.addEdge(docIds[i], docIds[j], { size: 0.4, color: colors.border });
      }
    }
  }

  // Scale by degree — gentle
  g.forEachNode((node, attrs) => {
    const degree = g.degree(node);
    const baseSize = (attrs.size as number) || 3;
    g.setNodeAttribute(node, "size", baseSize + degree * 0.4);
  });

  return g;
}

export const WorkspaceGraph: React.FC<WorkspaceGraphProps> = ({ docs, rooms }) => {
  const { colors } = useTheme();
  const containerRef = useRef<HTMLDivElement>(null);
  const sigmaRef = useRef<Sigma | null>(null);
  const hoveredRef = useRef<string | null>(null);

  const graph = useMemo(
    () => buildGraphology(docs, rooms, colors),
    [docs, rooms, colors],
  );

  useEffect(() => {
    if (!containerRef.current) return;

    if (graph.order > 1) {
      forceAtlas2.assign(graph, {
        iterations: 200,
        settings: {
          gravity: 3,
          scalingRatio: 6,
          strongGravityMode: true,
          barnesHutOptimize: true,
          edgeWeightInfluence: 0.5,
          linLogMode: true,
        },
      });
    }

    const sigma = new Sigma(graph, containerRef.current, {
      renderLabels: false,
      renderEdgeLabels: false,
      defaultEdgeType: "line",
      allowInvalidContainer: true,
      minCameraRatio: 0.1,
      maxCameraRatio: 6,
      enableCameraRotation: false,
      labelColor: { color: colors.text },
      labelFont: "system-ui, -apple-system, sans-serif",
      labelSize: 12,
      labelWeight: "600",
      labelDensity: 0,
    });

    sigma.on("enterNode", ({ node }) => {
      if (hoveredRef.current && hoveredRef.current !== node) {
        graph.removeNodeAttribute(hoveredRef.current, "forceLabel");
      }
      hoveredRef.current = node;
      graph.setNodeAttribute(node, "forceLabel", true);
    });

    sigma.on("leaveNode", ({ node }) => {
      graph.removeNodeAttribute(node, "forceLabel");
      hoveredRef.current = null;
    });

    sigmaRef.current = sigma;

    // Recenter and refresh when container size changes
    const ro = new ResizeObserver(() => {
      sigma.refresh();
      sigma.getCamera().animate({ x: 0.5, y: 0.5, ratio: 1.2 }, { duration: 300 });
    });
    ro.observe(containerRef.current);

    return () => {
      ro.disconnect();
      sigma.kill();
      sigmaRef.current = null;
    };
  }, [graph, colors]);

  if (graph.order <= 1) {
    return (
      <div style={{ position: "relative", height: "100%", minHeight: 360 }}>
        <div ref={containerRef} style={{ width: "100%", height: "100%", position: "absolute", inset: 0 }} />
      </div>
    );
  }

  return (
    <div style={{ position: "relative", height: "100%", minHeight: 360 }}>
      <div ref={containerRef} style={{ width: "100%", height: "100%", position: "absolute", inset: 0 }} />
    </div>
  );
};
