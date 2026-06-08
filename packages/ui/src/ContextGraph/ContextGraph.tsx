import React, { useRef, useEffect, useState, useMemo, useCallback } from "react";
import type { CouncilMessage, RoleCard } from "@agora/shared";
import { useTheme } from "../theme/ThemeContext.js";
import type { ColorPalette } from "../theme/palettes.js";
import { useI18n } from "../i18n/I18nContext.js";

function useDebouncedValue<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

let ForceGraph2D: any = null;

type NodeType = "topic" | "doc" | "analysis" | "viewpoint" | "cross" | "summary";

interface GraphNode {
  id: string;
  label: string;
  type: NodeType;
  content?: string;
  graphSummary?: string;
  msgId?: string;
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
  onNodeClick?: (msgId: string) => void;
}

const NODE_SIZES: Record<NodeType, number> = {
  topic: 6, doc: 3, analysis: 4, viewpoint: 3, cross: 3, summary: 4,
};

const NODE_COLORS: Record<NodeType, (c: ColorPalette) => string> = {
  topic: (c) => c.text,
  doc: (c) => c.textMuted,
  analysis: (c) => c.textMuted,
  viewpoint: (c) => c.text,
  cross: (c) => c.border,
  summary: (c) => c.accent,
};

function truncate(s: string, max: number): string {
  const clean = s.replace(/[#*_`>\-\n]+/g, " ").trim();
  return clean.length > max ? clean.slice(0, max) + "..." : clean;
}

function buildGraphData(
  messages: CouncilMessage[],
  selectedRefs: Array<{ path: string; label: string }>,
  roles: RoleCard[],
): GraphData {
  const nodes: GraphNode[] = [];
  const links: GraphLink[] = [];

  const userMsg = messages.find((m) => m.senderType === "user");
  if (!userMsg) return { nodes, links };

  const topicId = "topic";
  nodes.push({ id: topicId, label: truncate(userMsg.content, 20), type: "topic", content: userMsg.content, val: NODE_SIZES.topic });

  for (const ref of selectedRefs) {
    const docId = `doc:${ref.path}`;
    nodes.push({ id: docId, label: ref.label.replace(/\.[^.]+$/, ""), type: "doc", val: NODE_SIZES.doc });
    links.push({ source: topicId, target: docId });
  }

  const modMsgs = messages.filter((m) => m.senderType === "moderator");
  const analysis = modMsgs[0];
  if (analysis) {
    nodes.push({ id: "analysis", label: "Analysis", type: "analysis", content: analysis.content, val: NODE_SIZES.analysis });
    links.push({ source: topicId, target: "analysis" });
  }

  const roleMsgs = messages.filter((m) => m.senderType === "role" && m.status !== "error");
  for (const msg of roleMsgs) {
    const roleDef = roles.find((r) => r.id === msg.senderId);
    const roleName = roleDef?.name ?? msg.senderId;
    const vpId = `vp:${msg.id}`;
    nodes.push({
      id: vpId,
      label: roleName,
      type: "viewpoint",
      content: msg.content,
      graphSummary: msg.graphSummary,
      msgId: msg.id,
      val: NODE_SIZES.viewpoint,
    });
    links.push({ source: analysis ? "analysis" : topicId, target: vpId });
  }

  const crossMsgs = messages.filter((m) => m.senderType === "role" && m.targetRoleId);
  for (const msg of crossMsgs) {
    const crossId = `cross:${msg.id}`;
    const roleDef = roles.find((r) => r.id === msg.senderId);
    nodes.push({
      id: crossId,
      label: roleDef?.name ?? "Cross",
      type: "cross",
      content: msg.content,
      msgId: msg.id,
      val: NODE_SIZES.cross,
    });
    const targetVp = nodes.find((n) => n.type === "viewpoint" && n.msgId?.includes(msg.targetRoleId!));
    if (targetVp) links.push({ source: crossId, target: targetVp.id });
    links.push({ source: topicId, target: crossId });
  }

  const summary = modMsgs.length > 1 ? modMsgs[modMsgs.length - 1] : null;
  if (summary && summary !== analysis) {
    nodes.push({ id: "summary", label: "Summary", type: "summary", content: summary.content, val: NODE_SIZES.summary });
    links.push({ source: topicId, target: "summary" });
  }

  return { nodes, links };
}

export const ContextGraph: React.FC<ContextGraphProps> = ({ messages, selectedRefs, roles, roomId, onNodeClick }) => {
  const { colors } = useTheme();
  const { t } = useI18n();
  const styles = createStyles(colors);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dims, setDims] = useState({ w: 200, h: 300 });
  const [fgLoaded, setFgLoaded] = useState(false);
  const [hovered, setHovered] = useState<GraphNode | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const [showTooltip, setShowTooltip] = useState(false);

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

  const rawGraphData = useMemo<GraphData>(() => {
    if (!messages || messages.length === 0) return { nodes: [], links: [] };
    return buildGraphData(messages, selectedRefs ?? [], roles ?? []);
  }, [messages, selectedRefs, roles]);

  // Debounce graph updates to prevent jumping during streaming
  const graphData = useDebouncedValue(rawGraphData, 800);

  const handleNodeHover = useCallback((node: any) => {
    clearTimeout(hoverTimeoutRef.current);
    if (node) {
      setHovered(node);
      setShowTooltip(true);
    } else {
      // Delay hiding so mouse can move to tooltip
      hoverTimeoutRef.current = setTimeout(() => setShowTooltip(false), 300);
    }
  }, []);

  const handleTooltipEnter = useCallback(() => {
    clearTimeout(hoverTimeoutRef.current);
  }, []);

  const handleTooltipLeave = useCallback(() => {
    setShowTooltip(false);
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (rect) {
      setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    }
  }, []);

  const handleNodeClick = useCallback((node: any) => {
    if (node?.msgId && onNodeClick) {
      onNodeClick(node.msgId);
    }
  }, [onNodeClick]);

  const FG = ForceGraph2D;
  const displayLabel = hovered?.graphSummary || hovered?.label || "";

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
            nodeColor={(n: any) => NODE_COLORS[n.type as NodeType]?.(colors) ?? colors.textMuted}
            nodeVal={(n: any) => n.val}
            linkColor={() => colors.border}
            linkWidth={0.5}
            nodeCanvasObject={(n: any, ctx: CanvasRenderingContext2D) => {
              const r = n.val;
              ctx.beginPath();
              ctx.arc(n.x, n.y, r, 0, 2 * Math.PI);
              ctx.fillStyle = NODE_COLORS[n.type as NodeType]?.(colors) ?? colors.textMuted;
              ctx.fill();
              // Role name label
              if (n.type === "viewpoint" || n.type === "cross") {
                ctx.fillStyle = colors.textMuted;
                ctx.font = "8px sans-serif";
                ctx.textAlign = "center";
                ctx.fillText(n.label, n.x, n.y + r + 9);
              }
            }}
            onNodeHover={handleNodeHover}
            onNodeClick={handleNodeClick}
            cooldownTicks={50}
            d3AlphaDecay={0.03}
            d3VelocityDecay={0.3}
          />
          {showTooltip && hovered && (
            <div
              style={{
                ...styles.tooltip,
                left: Math.min(mousePos.x + 14, dims.w - 240),
                top: Math.min(mousePos.y + 14, dims.h - 200),
              }}
              onMouseEnter={handleTooltipEnter}
              onMouseLeave={handleTooltipLeave}
            >
              <div style={styles.tooltipType}>{hovered.type}</div>
              <div style={styles.tooltipLabel}>{hovered.label}</div>
              {hovered.graphSummary && (
                <div style={styles.tooltipSummary}>{hovered.graphSummary}</div>
              )}
              {hovered.content && (
                <div style={styles.tooltipContent}>{truncate(hovered.content, 200)}</div>
              )}
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
    display: "flex", flexDirection: "column", height: "100%", padding: 12,
    borderRight: `1px solid ${colors.border}`, background: colors.bg, overflow: "hidden",
  },
  header: {
    fontSize: 11, fontWeight: 600, color: colors.textMuted,
    textTransform: "uppercase", letterSpacing: 1, marginBottom: 4, flexShrink: 0,
  },
  empty: {
    flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: 11, color: colors.textMuted, textAlign: "center", padding: 16,
  },
  tooltip: {
    position: "absolute", maxWidth: 230, maxHeight: 280, overflowY: "auto",
    padding: "10px 12px", background: colors.surface,
    border: `1px solid ${colors.border}`, borderRadius: 8,
    boxShadow: "0 4px 16px rgba(0,0,0,0.2)", pointerEvents: "auto", zIndex: 10,
  },
  tooltipType: {
    fontSize: 9, fontWeight: 600, color: colors.textMuted,
    textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 2,
  },
  tooltipLabel: {
    fontSize: 13, fontWeight: 600, color: colors.text, marginBottom: 6,
  },
  tooltipSummary: {
    fontSize: 11, lineHeight: 1.5, color: colors.accent, marginBottom: 6,
    fontStyle: "italic",
  },
  tooltipContent: {
    fontSize: 11, lineHeight: 1.5, color: colors.textMuted,
    whiteSpace: "pre-wrap", wordBreak: "break-word",
  },
});
