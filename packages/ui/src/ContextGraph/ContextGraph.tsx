import React, { useEffect, useRef, useMemo } from "react";
import Graph from "graphology";
import Sigma from "sigma";
import forceAtlas2 from "graphology-layout-forceatlas2";
import type { CouncilMessage, RoleCard } from "@agora/shared";
import { useTheme } from "../theme/ThemeContext.js";
import type { ColorPalette } from "../theme/palettes.js";
import { useI18n } from "../i18n/I18nContext.js";
import { graph as graphTokens } from "../theme/tokens.js";
import { getRoleColor } from "../theme/tokens.js";

interface ContextGraphProps {
  messages?: CouncilMessage[];
  selectedRefs?: Array<{ path: string; label: string }>;
  roles?: RoleCard[];
  roomId?: string | null;
  onNodeClick?: (msgId: string) => void;
}

function truncate(s: string, max: number): string {
  const clean = s.replace(/[#*_`>\-\n]+/g, " ").trim();
  return clean.length > max ? clean.slice(0, max) + "…" : clean;
}

type NodeKind = "topic" | "source" | "role" | "summary";

const NODE_BASE_SIZE: Record<NodeKind, number> = {
  topic: graphTokens.nodeRoomRadius / 2,
  source: graphTokens.nodeDocRadius / 2,
  role: graphTokens.nodeRoleRadius / 2,
  summary: graphTokens.nodeClaimRadius / 2,
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
    color: colors.accent,
  });

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
      color: colors.textMuted,
    });
    graph.addEdge("topic", id, { size: 1, color: colors.border });
  }

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
    
    // Determine edge type by role type
    const isCritic = roleDef?.type === "critic";
    const edgeColor = isCritic ? graphTokens.edgeChallenge : graphTokens.edgeSupport;
    
    graph.addEdge(id, "topic", { size: isCritic ? 1.5 : 2, color: edgeColor });
  }

  // Cross-edges: connect roles to each other
  for (let i = 0; i < roleIds.length; i++) {
    for (let j = i + 1; j < roleIds.length; j++) {
      if (!graph.hasEdge(roleIds[i], roleIds[j])) {
        graph.addEdge(roleIds[i], roleIds[j], { size: 0.6, color: colors.border });
      }
    }
  }

  // Cross-edges: connect sources to roles that might reference them
  for (const srcId of sourceIds) {
    for (const roleId of roleIds) {
      if (!graph.hasEdge(srcId, roleId)) {
        graph.addEdge(srcId, roleId, { size: 0.5, color: colors.border });
      }
    }
  }

  // Scale node size by degree
  graph.forEachNode((node, attrs) => {
    const degree = graph.degree(node);
    const baseSize = (attrs.size as number) || 4;
    graph.setNodeAttribute(node, "size", baseSize + degree * 0.5);
  });

  return graph;
}

export const ContextGraph: React.FC<ContextGraphProps> = ({ messages, selectedRefs, roles, onNodeClick }) => {
  const { colors } = useTheme();
  const { t } = useI18n();
  const containerRef = useRef<HTMLDivElement>(null);
  const sigmaRef = useRef<Sigma | null>(null);
  const hoveredRef = useRef<string | null>(null);

  const graph = useMemo(() => {
    if (!messages || messages.length === 0) return null;
    return buildGraphology(messages, selectedRefs ?? [], roles ?? [], colors);
  }, [messages, selectedRefs, roles, colors]);

  useEffect(() => {
    if (!containerRef.current || !graph) return;

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
      minCameraRatio: 0.1,
      maxCameraRatio: 5,
      enableCameraRotation: false,
      allowInvalidContainer: true,
      labelColor: { color: colors.text },
      labelFont: "system-ui, -apple-system, sans-serif",
      labelSize: 11,
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

    sigma.on("clickNode", ({ node }) => {
      const attrs = graph.getNodeAttributes(node);
      if (onNodeClick && attrs.kind === "role") {
        onNodeClick(node.replace("role:", "msg_"));
      }
    });

    sigmaRef.current = sigma;

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
  }, [graph, colors, onNodeClick]);

  if (!graph || graph.order === 0) {
    return (
      <div style={styles.container}>
        <div style={styles.empty(colors)}>Send a message to build the map</div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div ref={containerRef} style={styles.canvas} />
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
