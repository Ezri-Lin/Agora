import React, { useEffect, useRef, useMemo, useCallback } from "react";
import Graph from "graphology";
import Sigma from "sigma";
import forceAtlas2 from "graphology-layout-forceatlas2";
import type { CouncilMessage, RoleCard } from "@agora/shared";
import { useTheme } from "../theme/ThemeContext.js";
import type { ColorPalette } from "../theme/palettes.js";
import { graph as graphTokens, getRoleColor } from "../theme/tokens.js";

interface ContextGraphProps {
  messages?: CouncilMessage[];
  selectedRefs?: Array<{ path: string; label: string }>;
  roles?: RoleCard[];
  roomId?: string | null;
  onNodeClick?: (msgId: string) => void;
}

function truncate(s: string, max: number) {
  const clean = s.replace(/[#*_`>\-\n]+/g, " ").trim();
  return clean.length > max ? clean.slice(0, max) + "…" : clean;
}

type NodeKind = "topic" | "source" | "role" | "summary";

const NODE_BASE_SIZE: Record<NodeKind, number> = {
  topic: graphTokens.nodeRoomRadius,
  source: graphTokens.nodeDocRadius,
  role: graphTokens.nodeRoleRadius,
  summary: graphTokens.nodeClaimRadius,
};

// Obsidian-style colors: topic=accent, source=green, role=yellow
const NODE_COLOR: Record<NodeKind, string> = {
  topic: graphTokens.nodeYellow,
  source: graphTokens.nodeGreen,
  role: graphTokens.nodeYellow,
  summary: graphTokens.nodeGray,
};

function buildGraphology(
  messages: CouncilMessage[],
  selectedRefs: Array<{ path: string; label: string }>,
  roles: RoleCard[],
  colors: ColorPalette,
): Graph {
  const graph = new Graph();

  const userMsg = messages.find((m) => m.senderType === "user");
  if (!userMsg) return graph;

  graph.addNode("topic", {
    label: truncate(userMsg.content, 40),
    kind: "topic",
    content: userMsg.content,
    x: 0,
    y: 0,
    size: NODE_BASE_SIZE.topic,
    color: NODE_COLOR.topic,
  });

  // Source nodes (green)
  const sourceIds: string[] = [];
  for (const ref of selectedRefs) {
    const id = `source:${ref.path}`;
    sourceIds.push(id);
    graph.addNode(id, {
      label: ref.label,
      kind: "source",
      x: Math.random(),
      y: Math.random(),
      size: NODE_BASE_SIZE.source,
      color: NODE_COLOR.source,
    });
    graph.addEdge("topic", id, {
      size: graphTokens.edgeWidth,
      color: colors.border,
    });
  }

  // Role nodes (yellow/gold)
  const roleMsgs = messages.filter((m) => m.senderType === "role" && m.status !== "error");
  const seenRoles = new Set<string>();
  const roleIds: string[] = [];
  for (const msg of roleMsgs) {
    if (seenRoles.has(msg.senderId)) continue;
    seenRoles.add(msg.senderId);
    const roleDef = roles.find((r) => r.id === msg.senderId);
    const name = roleDef?.name ?? msg.senderId;
    const id = `role:${msg.senderId}`;
    roleIds.push(id);
    graph.addNode(id, {
      label: name,
      kind: "role",
      content: msg.graphSummary || truncate(msg.content, 80),
      x: Math.random(),
      y: Math.random(),
      size: NODE_BASE_SIZE.role,
      color: getRoleColor(msg.senderId),
    });

    const isCritic = roleDef?.type === "critic";
    const edgeColor = isCritic ? graphTokens.edgeChallenge : graphTokens.edgeSupport;

    graph.addEdge(id, "topic", {
      size: isCritic ? graphTokens.edgeWidth * 1.2 : graphTokens.edgeWidth,
      color: edgeColor,
    });
  }

  // Cross-edges: roles to each other (sparse)
  for (let i = 0; i < roleIds.length; i++) {
    for (let j = i + 1; j < roleIds.length; j++) {
      if (Math.random() < 0.4) {
        graph.addEdge(roleIds[i], roleIds[j], {
          size: graphTokens.edgeWidth * 0.5,
          color: colors.border,
        });
      }
    }
  }

  // Cross-edges: sources to roles
  for (const srcId of sourceIds) {
    for (const roleId of roleIds) {
      if (Math.random() < 0.3) {
        graph.addEdge(srcId, roleId, {
          size: graphTokens.edgeWidth * 0.4,
          color: colors.border,
        });
      }
    }
  }

  // Scale node size by degree
  graph.forEachNode((node, attrs) => {
    const degree = graph.degree(node);
    const kind = attrs.kind as NodeKind;
    const base = NODE_BASE_SIZE[kind] || 4;
    graph.setNodeAttribute(node, "size", base + degree * 0.4);
  });

  return graph;
}

export const ContextGraph: React.FC<ContextGraphProps> = ({ messages, selectedRefs, roles, onNodeClick }) => {
  const { colors } = useTheme();
  const containerRef = useRef<HTMLDivElement>(null);
  const sigmaRef = useRef<Sigma | null>(null);
  const hoveredRef = useRef<string | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const graph = useMemo(() => {
    if (!messages || messages.length === 0) return null;
    return buildGraphology(messages, selectedRefs ?? [], roles ?? [], colors);
  }, [messages, selectedRefs, roles, colors]);

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
    if (!containerRef.current || !graph) return;

    if (graph.order > 1) {
      forceAtlas2.assign(graph, {
        iterations: 300,
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
      minCameraRatio: 0.1,
      maxCameraRatio: 8,
      enableCameraRotation: false,
      allowInvalidContainer: true,
      labelColor: { color: colors.text },
      labelFont: "system-ui, -apple-system, sans-serif",
      labelSize: 11,
      labelWeight: "500",
      labelDensity: 0,
      nodeReducer: (node, data) => {
        const res = { ...data };
        if (hoveredRef.current === node) {
          res.size = (data.size as number) * 1.6;
          res.forceLabel = true;
        } else if (hoveredRef.current) {
          const hoveredEdges = graph.edges(hoveredRef.current);
          const connected = hoveredEdges.some(e =>
            graph.source(e) === node || graph.target(e) === node,
          );
          if (!connected) {
            res.color = graphTokens.nodeMuted;
            res.size = (data.size as number) * 0.7;
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

    sigma.on("clickNode", ({ node }) => {
      const attrs = graph.getNodeAttributes(node);
      if (onNodeClick && attrs.kind === "role") {
        onNodeClick(node.replace("role:", "msg_"));
      }
    });

    sigmaRef.current = sigma;

    const ro = new ResizeObserver(() => {
      sigma.refresh();
      if (graph.order > 1) {
        sigma.getCamera().animate({ ratio: 1.2 }, { duration: 300 });
      }
    });
    ro.observe(containerRef.current);

    return () => {
      ro.disconnect();
      sigma.kill();
      sigmaRef.current = null;
    };
  }, [graph, colors, onNodeClick, showTooltip, hideTooltip]);

  if (!graph || graph.order === 0) {
    return (
      <div style={styles.container}>
        <div style={styles.empty(colors)}>Send a message to see the context graph</div>
      </div>
    );
  }

  return (
    <div style={{ ...styles.container, background: colors.bg }}>
      <div ref={containerRef} style={styles.canvas} />
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

const styles = {
  container: {
    display: "flex",
    flexDirection: "column",
    height: "100%",
    position: "absolute",
    inset: 0,
    overflow: "hidden",
  } as React.CSSProperties,
  empty: (colors: ColorPalette): React.CSSProperties => ({
    flex: 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 11,
    color: colors.textMuted,
    textAlign: "center",
    padding: 16,
  }),
  canvas: {
    flex: 1,
    minHeight: 0,
  } as React.CSSProperties,
};
