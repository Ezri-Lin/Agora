import React, { useMemo, useState, useCallback, useRef } from "react";
import type { CouncilMessage, RoleCard } from "@agora/shared";
import { useTheme } from "../theme/ThemeContext.js";
import type { ColorPalette } from "../theme/palettes.js";
import { useI18n } from "../i18n/I18nContext.js";

type NodeType = "topic" | "source" | "role" | "memory" | "output" | "summary";

interface CtxNode {
  id: string;
  label: string;
  shortCode: string;
  type: NodeType;
  content?: string;
  ring: number;
  angle: number;
}

interface ContextGraphProps {
  messages?: CouncilMessage[];
  selectedRefs?: Array<{ path: string; label: string }>;
  roles?: RoleCard[];
  roomId?: string | null;
  onNodeClick?: (msgId: string) => void;
}

function truncate(s: string, max: number): string {
  const clean = s.replace(/[#*_`>\-\n]+/g, " ").trim();
  return clean.length > max ? clean.slice(0, max) + "..." : clean;
}

function buildNodes(
  messages: CouncilMessage[],
  selectedRefs: Array<{ path: string; label: string }>,
  roles: RoleCard[],
): CtxNode[] {
  const nodes: CtxNode[] = [];

  const userMsg = messages.find((m) => m.senderType === "user");
  if (!userMsg) return nodes;
  nodes.push({
    id: "topic", label: truncate(userMsg.content, 40), shortCode: "T",
    type: "topic", content: userMsg.content, ring: 0, angle: 0,
  });

  const ring1: CtxNode[] = [];

  for (const ref of selectedRefs) {
    ring1.push({
      id: `source:${ref.path}`, label: ref.label, shortCode: ref.label.replace(/\.[^.]+$/, "").slice(0, 2).toUpperCase(),
      type: "source", ring: 1, angle: 0,
    });
  }

  const roleMsgs = messages.filter((m) => m.senderType === "role" && m.status !== "error");
  const seenRoles = new Set<string>();
  for (const msg of roleMsgs) {
    if (seenRoles.has(msg.senderId)) continue;
    seenRoles.add(msg.senderId);
    const roleDef = roles.find((r) => r.id === msg.senderId);
    const name = roleDef?.name ?? msg.senderId;
    ring1.push({
      id: `role:${msg.senderId}`, label: name,
      shortCode: name.split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase(),
      type: "role", content: msg.graphSummary || truncate(msg.content, 80), ring: 1, angle: 0,
    });
  }

  const ring2: CtxNode[] = [];

  const modMsgs = messages.filter((m) => m.senderType === "moderator");
  const summary = modMsgs.length > 1 ? modMsgs[modMsgs.length - 1] : null;
  if (summary) {
    ring2.push({
      id: "summary", label: "Summary", shortCode: "SM",
      type: "summary", content: truncate(summary.content, 100), ring: 2, angle: 0,
    });
  }

  for (let i = 0; i < ring1.length; i++) {
    ring1[i].angle = (i / ring1.length) * Math.PI * 2 - Math.PI / 2;
  }
  for (let i = 0; i < ring2.length; i++) {
    ring2[i].angle = (i / ring2.length) * Math.PI * 2 - Math.PI / 2;
  }

  nodes.push(...ring1, ...ring2);
  return nodes;
}

const TYPE_COLORS: Record<NodeType, (c: ColorPalette) => string> = {
  topic: (c) => c.accent,
  source: (c) => c.textMuted,
  role: (c) => c.text,
  memory: (c) => c.accentDim ?? c.textMuted,
  output: (c) => c.border,
  summary: (c) => c.accent,
};

const TYPE_RADIUS: Record<NodeType, number> = {
  topic: 22, source: 10, role: 12, memory: 9, output: 9, summary: 11,
};

function getRelatedIds(nodeId: string, nodes: CtxNode[]): Set<string> {
  const related = new Set<string>();
  related.add(nodeId);
  const node = nodes.find((n) => n.id === nodeId);
  if (!node) return related;

  // Same ring neighbors
  for (const n of nodes) {
    if (n.id !== nodeId && n.ring === node.ring) {
      related.add(n.id);
    }
  }

  // Parent (ring - 1) and children (ring + 1)
  for (const n of nodes) {
    if (n.ring === node.ring - 1 || n.ring === node.ring + 1) {
      related.add(n.id);
    }
  }

  return related;
}

export const ContextGraph: React.FC<ContextGraphProps> = ({ messages, selectedRefs, roles, onNodeClick }) => {
  const { colors } = useTheme();
  const { t } = useI18n();
  const styles = createStyles(colors);
  const containerRef = useRef<HTMLDivElement>(null);
  const [hovered, setHovered] = useState<CtxNode | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const hoverTimeout = useRef<ReturnType<typeof setTimeout>>();
  const [showTooltip, setShowTooltip] = useState(false);
  const [focusedNodeId, setFocusedNodeId] = useState<string | null>(null);

  const nodes = useMemo(() => {
    if (!messages || messages.length === 0) return [];
    return buildNodes(messages, selectedRefs ?? [], roles ?? []);
  }, [messages, selectedRefs, roles]);

  const relatedIds = useMemo(() => {
    if (!focusedNodeId) return null;
    return getRelatedIds(focusedNodeId, nodes);
  }, [focusedNodeId, nodes]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (rect) setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  }, []);

  const handleNodeEnter = useCallback((node: CtxNode) => {
    clearTimeout(hoverTimeout.current);
    setHovered(node);
    setShowTooltip(true);
  }, []);

  const handleNodeLeave = useCallback(() => {
    hoverTimeout.current = setTimeout(() => setShowTooltip(false), 200);
  }, []);

  const handleTooltipEnter = useCallback(() => clearTimeout(hoverTimeout.current), []);
  const handleTooltipLeave = useCallback(() => setShowTooltip(false), []);

  const handleClick = useCallback((node: CtxNode) => {
    if (focusedNodeId === node.id) {
      // Click again to unfocus
      setFocusedNodeId(null);
    } else {
      setFocusedNodeId(node.id);
    }
    if (node.type === "role" && onNodeClick) {
      const msgId = node.id.replace("role:", "msg_");
      onNodeClick(msgId);
    }
  }, [focusedNodeId, onNodeClick]);

  const handleBackgroundClick = useCallback(() => {
    setFocusedNodeId(null);
  }, []);

  if (nodes.length === 0) {
    return (
      <div style={styles.container}>
        <div style={styles.header}>{t.contextGraph}</div>
        <div style={styles.empty}>Send a message to build the map</div>
      </div>
    );
  }

  const cx = 140, cy = 140;
  const ringRadii = [0, 70, 120];

  const positioned = nodes.map((n) => {
    const r = ringRadii[n.ring] ?? 0;
    return {
      ...n,
      x: cx + Math.cos(n.angle) * r,
      y: cy + Math.sin(n.angle) * r,
    };
  });

  const edges = positioned
    .filter((n) => n.ring > 0)
    .map((n) => {
      const parent = positioned.find((p) => p.ring === n.ring - 1) ?? positioned[0];
      return { x1: parent.x, y1: parent.y, x2: n.x, y2: n.y };
    });

  return (
    <div ref={containerRef} style={styles.container} onMouseMove={handleMouseMove}>
      <div style={styles.header}>{t.contextGraph}</div>
      <div style={styles.svgWrap} onClick={handleBackgroundClick}>
        <svg width="100%" height="100%" viewBox="0 0 280 280">
          {[70, 120].map((r, i) => (
            <circle key={i} cx={cx} cy={cy} r={r} fill="none"
              stroke={colors.border} strokeWidth={0.5} strokeDasharray="3,3" opacity={0.4} />
          ))}
          {edges.map((e, i) => (
            <line key={i} x1={e.x1} y1={e.y1} x2={e.x2} y2={e.y2}
              stroke={colors.border} strokeWidth={0.8} opacity={0.5} />
          ))}
          {positioned.map((n) => {
            const r = TYPE_RADIUS[n.type];
            const fill = TYPE_COLORS[n.type](colors);
            const isHovered = hovered?.id === n.id;
            const isFocused = focusedNodeId === n.id;
            const isRelated = relatedIds ? relatedIds.has(n.id) : true;
            const opacity = focusedNodeId
              ? (isFocused ? 1 : isRelated ? 0.85 : 0.2)
              : (isHovered ? 1 : 0.75);
            const showLabel = isFocused || isHovered || (!focusedNodeId && n.type === "topic");
            return (
              <g key={n.id}
                onMouseEnter={() => handleNodeEnter(n)}
                onMouseLeave={handleNodeLeave}
                onClick={(e) => { e.stopPropagation(); handleClick(n); }}
                style={{ cursor: "pointer" }}
              >
                <circle cx={n.x} cy={n.y} r={r} fill={fill}
                  opacity={opacity}
                  stroke={isFocused ? colors.accent : isHovered ? colors.accent : "none"}
                  strokeWidth={isFocused ? 2.5 : isHovered ? 2 : 0} />
                <text x={n.x} y={n.y} textAnchor="middle" dominantBaseline="central"
                  fill={n.type === "topic" ? colors.bg : colors.bg}
                  fontSize={n.type === "topic" ? 10 : 8} fontWeight={700}
                  opacity={opacity}>
                  {n.shortCode}
                </text>
                {showLabel && (
                  <text x={n.x} y={n.y + r + 10} textAnchor="middle"
                    fill={colors.textMuted} fontSize={8} opacity={0.9}>
                    {n.label.length > 16 ? n.label.slice(0, 16) + "…" : n.label}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
        {showTooltip && hovered && (
          <div
            style={{
              ...styles.tooltip,
              left: Math.min(mousePos.x + 14, 260),
              top: Math.min(mousePos.y + 14, 260),
            }}
            onMouseEnter={handleTooltipEnter}
            onMouseLeave={handleTooltipLeave}
          >
            <div style={styles.tooltipType}>{hovered.type}</div>
            <div style={styles.tooltipLabel}>{hovered.label}</div>
            {hovered.content && (
              <div style={styles.tooltipContent}>{hovered.content}</div>
            )}
          </div>
        )}
      </div>
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
  svgWrap: {
    flex: 1, position: "relative", overflow: "hidden",
  },
  tooltip: {
    position: "absolute", maxWidth: 220, maxHeight: 240, overflowY: "auto",
    padding: "8px 10px", background: colors.surface,
    border: `1px solid ${colors.border}`, borderRadius: 6,
    boxShadow: "0 4px 12px rgba(0,0,0,0.2)", pointerEvents: "auto", zIndex: 10,
  },
  tooltipType: {
    fontSize: 9, fontWeight: 600, color: colors.textMuted,
    textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 2,
  },
  tooltipLabel: {
    fontSize: 12, fontWeight: 600, color: colors.text, marginBottom: 4,
  },
  tooltipContent: {
    fontSize: 11, lineHeight: 1.5, color: colors.textMuted,
    whiteSpace: "pre-wrap", wordBreak: "break-word",
  },
});
