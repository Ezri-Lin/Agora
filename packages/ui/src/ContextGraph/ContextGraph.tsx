/**
 * ContextGraph — thin wrapper around GraphSurface for council room context.
 */

import React, { useMemo } from "react";
import type { CouncilMessage, RoleCard } from "@agora/shared";
import { useTheme } from "../theme/ThemeContext.js";
import { GraphSurface } from "../GraphSurface/GraphSurface.js";
import type { GraphViewMode } from "../GraphSurface/model/coreTypes.js";
import { buildGraphViewModel } from "../GraphSurface/model/coreTypes.js";
import { buildContextCoreGraph, buildRoomGraphViewModel } from "../GraphSurface/adapters/ContextAdapter.js";
import type { GraphMessageCompactLike } from "../GraphSurface/adapters/ContextAdapter.js";
import { buildArgumentGraphFromCompacts } from "../GraphSurface/adapters/ArgumentGraphAdapter.js";

interface ContextGraphProps {
  messages?: CouncilMessage[];
  selectedRefs?: Array<{ path: string; label: string }>;
  roles?: RoleCard[];
  roomId?: string | null;
  graphMode?: GraphViewMode;
  compacts?: GraphMessageCompactLike[];
  decisions?: string[];
  onNodeClick?: (msgId: string) => void;
}

export const ContextGraph: React.FC<ContextGraphProps> = ({
  messages,
  selectedRefs,
  roles,
  graphMode,
  compacts,
  decisions,
  onNodeClick,
}) => {
  const { colors } = useTheme();

  const viewModel = useMemo(() => {
    if (!messages || messages.length === 0) return null;

    switch (graphMode) {
      case "room_graph":
        return buildRoomGraphViewModel(messages, selectedRefs ?? [], roles ?? [], compacts);

      case "argument_graph":
        if (!compacts || compacts.length === 0) {
          const graph = buildContextCoreGraph(messages, selectedRefs ?? [], roles ?? []);
          return buildGraphViewModel(graph);
        }
        return buildArgumentGraphFromCompacts(compacts, decisions);

      case "project_world":
      default: {
        const graph = buildContextCoreGraph(messages, selectedRefs ?? [], roles ?? []);
        return buildGraphViewModel(graph);
      }
    }
  }, [messages, selectedRefs, roles, graphMode, compacts, decisions]);

  const handleNodeClick = onNodeClick
    ? (nodeId: string) => {
        // Role nodes: "role:<senderId>" → "msg_<senderId>"
        if (nodeId.startsWith("role:")) {
          onNodeClick(nodeId.replace("role:", "msg_"));
        }
      }
    : undefined;

  if (!viewModel || viewModel.graph.nodes.length === 0) {
    return (
      <div style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        position: "absolute",
        inset: 0,
        overflow: "hidden",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 11,
        color: colors.textMuted,
        textAlign: "center",
        padding: 16,
      }}>
        Send a message to see the context graph
      </div>
    );
  }

  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      height: "100%",
      position: "absolute",
      inset: 0,
      overflow: "hidden",
      background: colors.bg,
    }}>
      <GraphSurface
        viewModel={viewModel}
        onNodeClick={handleNodeClick}
      />
    </div>
  );
};
