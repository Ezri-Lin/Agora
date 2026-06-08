import React, { useRef, useEffect, useState, useMemo } from "react";
import type { CouncilMessage, RoleCard, SourceRef } from "@agora/shared";
import { useTheme } from "../theme/ThemeContext.js";
import type { ColorPalette } from "../theme/palettes.js";

// Lazy import to avoid SSR issues
let ForceGraph2D: any = null;

interface GraphNode {
  id: string;
  label: string;
  type: "room" | "doc" | "role";
  color: string;
  val: number;
}

interface GraphLink {
  source: string;
  target: string;
  color: string;
}

interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
}

interface ContextGraphProps {
  messages?: CouncilMessage[];
  selectedRefs?: Array<{ path: string; label: string; importance?: string }>;
  roles?: RoleCard[];
  roomId?: string | null;
}

const ROLE_COLORS: Record<string, string> = {
  moderator: "#7c4dff",
  skeptic_critic: "#ff5252",
  historian: "#ffa726",
  product_strategist: "#66bb6a",
  security_lens: "#26c6da",
  science_lens: "#42a5f5",
  psychology_lens: "#ec407a",
  architect_lens: "#ab47bc",
  devops_lens: "#78909c",
  data_eng_lens: "#5c6bc0",
  ux_lens: "#ff7043",
  legal_lens: "#8d6e63",
  finance_lens: "#26a69a",
  pm_lens: "#9ccc65",
};

function getRoleColor(senderId: string, colors: ColorPalette): string {
  return ROLE_COLORS[senderId] ?? colors.textMuted;
}

export const ContextGraph: React.FC<ContextGraphProps> = ({ messages, selectedRefs, roles, roomId }) => {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dims, setDims] = useState({ w: 200, h: 300 });
  const [fgLoaded, setFgLoaded] = useState(false);

  // Lazy load the graph component
  useEffect(() => {
    import("react-force-graph-2d").then((mod) => {
      ForceGraph2D = mod.default;
      setFgLoaded(true);
    }).catch(() => {
      // Failed to load — graph stays empty
    });
  }, []);

  // Resize observer
  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver(([entry]) => {
      setDims({ w: entry.contentRect.width, h: entry.contentRect.height });
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  // Compute graph data from domain data
  const graphData = useMemo<GraphData>(() => {
    const nodes: GraphNode[] = [];
    const links: GraphLink[] = [];
    const nodeIds = new Set<string>();

    // Room node (center)
    if (roomId) {
      nodes.push({ id: `room:${roomId}`, label: "Room", type: "room", color: colors.accent, val: 10 });
      nodeIds.add(`room:${roomId}`);
    }

    // Document nodes
    if (selectedRefs) {
      for (const ref of selectedRefs) {
        const id = `doc:${ref.path}`;
        if (!nodeIds.has(id)) {
          nodes.push({ id, label: ref.label.replace(/\.[^.]+$/, ""), type: "doc", color: colors.textMuted, val: 5 });
          nodeIds.add(id);
        }
        if (roomId) {
          links.push({ source: `room:${roomId}`, target: id, color: colors.border });
        }
      }
    }

    // Role nodes from messages
    if (messages) {
      const seenRoles = new Set<string>();
      for (const msg of messages) {
        if (msg.senderType === "role" && !seenRoles.has(msg.senderId)) {
          seenRoles.add(msg.senderId);
          const id = `role:${msg.senderId}`;
          const roleDef = roles?.find((r) => r.id === msg.senderId);
          const label = roleDef?.name ?? msg.senderId;
          const color = getRoleColor(msg.senderId, colors);
          nodes.push({ id, label, type: "role", color, val: 7 });
          nodeIds.add(id);
          if (roomId) {
            links.push({ source: `room:${roomId}`, target: id, color: `${color}66` });
          }
        }
      }
    }

    return { nodes, links };
  }, [messages, selectedRefs, roles, roomId, colors]);

  const FG = ForceGraph2D;

  return (
    <div ref={containerRef} style={styles.container}>
      <div style={styles.header}>Context Graph</div>
      {fgLoaded && FG && graphData.nodes.length > 0 ? (
        <FG
          graphData={graphData}
          width={dims.w}
          height={dims.h - 28}
          backgroundColor="transparent"
          nodeLabel="label"
          nodeColor={(n: GraphNode) => n.color}
          nodeVal={(n: GraphNode) => n.val}
          linkColor={(l: GraphLink) => l.color}
          linkWidth={1}
          linkDirectionalArrowLength={3}
          nodeCanvasObject={(n: any, ctx: CanvasRenderingContext2D) => {
            ctx.beginPath();
            ctx.arc(n.x, n.y, n.val, 0, 2 * Math.PI);
            ctx.fillStyle = n.color;
            ctx.fill();
            ctx.fillStyle = colors.text;
            ctx.font = "9px sans-serif";
            ctx.textAlign = "center";
            ctx.fillText(n.label, n.x, n.y + n.val + 10);
          }}
          cooldownTicks={50}
          d3AlphaDecay={0.02}
        />
      ) : (
        <div style={styles.empty}>
          {graphData.nodes.length === 0 ? "Send a message to build the graph" : "Loading graph..."}
        </div>
      )}
    </div>
  );
};

const createStyles = (colors: ColorPalette): Record<string, React.CSSProperties> => ({
  container: {
    display: "flex",
    flexDirection: "column",
    height: "100%",
    padding: 12,
    borderRight: `1px solid ${colors.border}`,
    background: colors.bg,
    overflow: "hidden",
  },
  header: {
    fontSize: 11,
    fontWeight: 600,
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 4,
    flexShrink: 0,
  },
  empty: {
    flex: 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 11,
    color: colors.textMuted,
    textAlign: "center",
    padding: 16,
  },
});
