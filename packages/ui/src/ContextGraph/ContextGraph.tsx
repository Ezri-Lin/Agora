import React, { useRef, useEffect, useState, useMemo, useCallback } from "react";
import type { CouncilMessage, RoleCard } from "@agora/shared";
import { useTheme } from "../theme/ThemeContext.js";
import type { ColorPalette } from "../theme/palettes.js";
import { useI18n } from "../i18n/I18nContext.js";

let ForceGraph2D: any = null;

type NodeType = "topic" | "doc" | "analysis" | "viewpoint" | "cross" | "summary";

interface GraphNode {
  id: string;
  label: string;
  type: NodeType;
  content?: string;
  val: number;
  x?: number;
  y?: number;
}

interface GraphLink {
  source: string;
  target: string;
}

interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
}

interface ContextGraphProps {
  messages?: CouncilMessage[];
  selectedRefs?: Array<{ path: string; label: string }>;
  roles?: RoleCard[];
  roomId?: string | null;
}

function truncate(s: string, max: number): string {
  const clean = s.replace(/[#*_`>\-\n]+/g, " ").trim();
  return clean.length > max ? clean.slice(0, max) + "..." : clean;
}

function buildGraphData(
  messages: CouncilMessage[],
  selectedRefs: Array<{ path: string; label: string }>,
  roles: RoleCard[],
  colors: ColorPalette,
): GraphData {
  const nodes: GraphNode[] = [];
  const links: GraphLink[] = [];

  // Topic — first user message
  const userMsg = messages.find((m) => m.senderType === "user");
  if (!userMsg) return { nodes, links };

  const topicId = "topic";
  nodes.push({ id: topicId, label: truncate(userMsg.content, 30), type: "topic", content: userMsg.content, val: 5 });

  // Docs
  for (const ref of selectedRefs) {
    const docId = `doc:${ref.path}`;
    nodes.push({ id: docId, label: ref.label.replace(/\.[^.]+$/, ""), type: "doc", val: 2 });
    links.push({ source: topicId, target: docId });
  }

  // Moderator analysis — first moderator message
  const modMsgs = messages.filter((m) => m.senderType === "moderator");
  const analysis = modMsgs[0];
  if (analysis) {
    nodes.push({ id: "analysis", label: "Analysis", type: "analysis", content: analysis.content, val: 3 });
    links.push({ source: topicId, target: "analysis" });
  }

  // Role viewpoints
  const roleMsgs = messages.filter((m) => m.senderType === "role" && m.status !== "error");
  for (const msg of roleMsgs) {
    const roleDef = roles.find((r) => r.id === msg.senderId);
    const roleName = roleDef?.name ?? msg.senderId;
    const vpId = `vp:${msg.id}`;
    nodes.push({
      id: vpId,
      label: truncate(msg.content, 25),
      type: "viewpoint",
      content: msg.content,
      val: 2,
    });
    links.push({ source: analysis ? "analysis" : topicId, target: vpId });
  }

  // Cross-examination
  const crossMsgs = messages.filter((m) => m.senderType === "role" && m.targetRoleId);
  for (const msg of crossMsgs) {
    const crossId = `cross:${msg.id}`;
    nodes.push({ id: crossId, label: "Cross", type: "cross", content: msg.content, val: 2 });
    // Connect to the target role's viewpoint
    const targetVp = nodes.find((n) => n.type === "viewpoint" && n.id.includes(msg.targetRoleId!));
    if (targetVp) links.push({ source: crossId, target: targetVp.id });
    links.push({ source: topicId, target: crossId });
  }

  // Summary — last moderator message (if more than one)
  const summary = modMsgs.length > 1 ? modMsgs[modMsgs.length - 1] : null;
  if (summary && summary !== analysis) {
    nodes.push({ id: "summary", label: "Summary", type: "summary", content: summary.content, val: 3 });
    links.push({ source: topicId, target: "summary" });
  }

  return { nodes, links };
}

const TYPE_COLORS: Record<NodeType, (c: ColorPalette) => string> = {
  topic: (c) => c.text,
  doc: (c) => c.textMuted,
  analysis: (c) => c.textMuted,
  viewpoint: (c) => c.text,
  cross: (c) => c.border,
  summary: (c) => c.accent,
};

export const ContextGraph: React.FC<ContextGraphProps> = ({ messages, selectedRefs, roles, roomId }) => {
  const { colors } = useTheme();
  const { t } = useI18n();
  const styles = createStyles(colors);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dims, setDims] = useState({ w: 200, h: 300 });
  const [fgLoaded, setFgLoaded] = useState(false);
  const [hovered, setHovered] = useState<GraphNode | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    import("react-force-graph-2d").then((mod) => {
      ForceGraph2D = mod.default;
      setFgLoaded(true);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver(([entry]) => {
      setDims({ w: entry.contentRect.width, h: entry.contentRect.height });
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  const graphData = useMemo<GraphData>(() => {
    if (!messages || messages.length === 0) return { nodes: [], links: [] };
    return buildGraphData(messages, selectedRefs ?? [], roles ?? [], colors);
  }, [messages, selectedRefs, roles, colors]);

  const handleNodeHover = useCallback((node: GraphNode | null) => {
    setHovered(node);
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (rect) {
      setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    }
  }, []);

  const FG = ForceGraph2D;

  return (
    <div ref={containerRef} style={styles.container} onMouseMove={handleMouseMove}>
      <div style={styles.header}>{t.contextGraph}</div>
      {fgLoaded && FG && graphData.nodes.length > 0 ? (
        <div style={{ position: "relative", flex: 1 }}>
          <FG
            graphData={graphData}
            width={dims.w}
            height={dims.h - 28}
            backgroundColor="transparent"
            nodeLabel={() => ""}
            nodeColor={(n: any) => TYPE_COLORS[n.type as NodeType]?.(colors) ?? colors.textMuted}
            nodeVal={(n: any) => n.val}
            linkColor={() => colors.border}
            linkWidth={0.5}
            nodeCanvasObject={(n: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
              const r = n.val;
              ctx.beginPath();
              ctx.arc(n.x, n.y, r, 0, 2 * Math.PI);
              ctx.fillStyle = TYPE_COLORS[n.type as NodeType]?.(colors) ?? colors.textMuted;
              ctx.fill();
              // Show label only for topic/analysis/summary or when zoomed in
              if (n.type === "topic" || n.type === "summary" || globalScale > 1.5) {
                ctx.fillStyle = colors.textMuted;
                ctx.font = `${Math.max(8, 10 / globalScale)}px sans-serif`;
                ctx.textAlign = "center";
                ctx.fillText(n.label, n.x, n.y + r + 8);
              }
            }}
            onNodeHover={handleNodeHover}
            cooldownTicks={50}
            d3AlphaDecay={0.03}
            d3VelocityDecay={0.3}
          />
          {hovered && hovered.content && (
            <div
              style={{
                ...styles.tooltip,
                left: Math.min(mousePos.x + 12, dims.w - 240),
                top: mousePos.y + 12,
              }}
            >
              <div style={styles.tooltipType}>{hovered.type}</div>
              <div style={styles.tooltipContent}>{truncate(hovered.content, 120)}</div>
            </div>
          )}
        </div>
      ) : (
        <div style={styles.empty}>
          {graphData.nodes.length === 0 ? "Send a message to build the graph" : "Loading..."}
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
  tooltip: {
    position: "absolute",
    maxWidth: 220,
    padding: "8px 10px",
    background: colors.surface,
    border: `1px solid ${colors.border}`,
    borderRadius: 6,
    boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
    pointerEvents: "none",
    zIndex: 10,
  },
  tooltipType: {
    fontSize: 9,
    fontWeight: 600,
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  tooltipContent: {
    fontSize: 11,
    lineHeight: 1.5,
    color: colors.text,
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
  },
});
