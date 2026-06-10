import React, { useMemo } from "react";
import type { ScannedDoc } from "../AgoraBridge.js";
import { useTheme } from "../theme/ThemeContext.js";
import { graph, radius, spacing, typography } from "../theme/tokens.js";

interface RoomEntry {
  id: string;
  title: string;
  createdAt: string;
}

interface WorkspaceGraphProps {
  docs: ScannedDoc[];
  rooms: RoomEntry[];
}

type GraphNode = {
  id: string;
  label: string;
  kind: "workspace" | "document" | "room";
  x: number;
  y: number;
  r: number;
};

export const WorkspaceGraph: React.FC<WorkspaceGraphProps> = ({ docs, rooms }) => {
  const { colors } = useTheme();
  const nodes = useMemo(() => buildNodes(docs, rooms), [docs, rooms]);
  const center = nodes[0];

  return (
    <div style={{ position: "relative", height: "100%", minHeight: 360, overflow: "hidden" }}>
      <svg
        role="img"
        aria-label="Workspace Graph Canvas"
        width="100%"
        height="100%"
        viewBox="0 -50 900 660"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          <pattern id="agora-grid" width={graph.gridDotSpacing} height={graph.gridDotSpacing} patternUnits="userSpaceOnUse">
            <circle cx="1" cy="1" r={graph.gridDotSize} fill={colors.border} opacity="0.35" />
          </pattern>
        </defs>
        <rect x="0" y="-50" width="900" height="660" fill="url(#agora-grid)" />
        {nodes.slice(1).map((node) => (
          <line
            key={`edge-${node.id}`}
            x1={center.x}
            y1={center.y}
            x2={node.x}
            y2={node.y}
            stroke={node.kind === "room" ? colors.accent : colors.border}
            strokeWidth={node.kind === "room" ? graph.edgeWidthSemantic : graph.edgeWidth}
            opacity={node.kind === "room" ? 0.45 : 0.35}
          />
        ))}
        {nodes.map((node) => (
          <g key={node.id}>
            <circle
              cx={node.x}
              cy={node.y}
              r={node.r}
              fill={node.kind === "workspace" ? colors.accent : colors.surface}
              stroke={node.kind === "workspace" ? colors.accent : colors.border}
              strokeWidth={node.kind === "workspace" ? 1.5 : 1}
            />
            <text
              x={node.x}
              y={node.y + 4}
              textAnchor="middle"
              fill={node.kind === "workspace" ? colors.bg : colors.text}
              fontSize={node.kind === "workspace" ? 18 : 12}
              fontWeight={800}
            >
              {node.kind === "workspace" ? "A" : node.kind === "room" ? "R" : "D"}
            </text>
            <text
              x={node.x}
              y={node.y + node.r + 18}
              textAnchor="middle"
              fill={colors.text}
              fontSize={14}
              fontWeight={700}
            >
              {truncate(node.label, 24)}
            </text>
          </g>
        ))}
      </svg>
      {nodes.length === 1 && (
        <div style={{
          position: "absolute",
          left: spacing.xl,
          bottom: spacing.xl,
          border: `1px solid ${colors.border}`,
          borderRadius: radius.md,
          background: colors.surface,
          color: colors.textMuted,
          fontSize: typography.chatBody.size,
          padding: `${spacing.md}px ${spacing.lg}px`,
        }}>
          Add documents or create rooms to grow the workspace graph.
        </div>
      )}
    </div>
  );
};

function buildNodes(docs: ScannedDoc[], rooms: RoomEntry[]): GraphNode[] {
  const center = { x: 450, y: 280 };
  const items = [
    ...rooms.slice(0, 8).map((room) => ({
      id: `room:${room.id}`,
      label: room.title,
      kind: "room" as const,
      r: graph.nodeRoomRadius,
    })),
    ...docs.slice(0, 18).map((doc) => ({
      id: `doc:${doc.path}`,
      label: doc.name,
      kind: "document" as const,
      r: graph.nodeDocRadius,
    })),
  ];

  const outer = items.map((item, index) => {
    const angle = (index / Math.max(items.length, 1)) * Math.PI * 2 - Math.PI / 2;
    const spread = item.kind === "room" ? 180 : 225;
    return {
      ...item,
      x: center.x + Math.cos(angle) * spread,
      y: center.y + Math.sin(angle) * spread,
    };
  });

  return [
    {
      id: "workspace",
      label: "Workspace",
      kind: "workspace",
      x: center.x,
      y: center.y,
      r: graph.nodeCoreRadius,
    },
    ...outer,
  ];
}

function truncate(value: string, max: number): string {
  return value.length > max ? `${value.slice(0, max - 1)}...` : value;
}
