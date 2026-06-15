/**
 * ContextGraph — thin wrapper around GraphSurface for council room context.
 */

import React, { useMemo } from "react";
import type { CouncilMessage, RoleCard } from "@agora/shared";
import { useTheme } from "../theme/ThemeContext.js";
import { GraphSurface } from "../GraphSurface/GraphSurface.js";
import { buildGraphViewModel } from "../GraphSurface/model/coreTypes.js";
import { buildContextCoreGraph } from "../GraphSurface/adapters/ContextAdapter.js";

interface ContextGraphProps {
  messages?: CouncilMessage[];
  selectedRefs?: Array<{ path: string; label: string }>;
  roles?: RoleCard[];
  roomId?: string | null;
  onNodeClick?: (msgId: string) => void;
}

export const ContextGraph: React.FC<ContextGraphProps> = ({
  messages,
  selectedRefs,
  roles,
  onNodeClick,
}) => {
  const { colors } = useTheme();

  const viewModel = useMemo(() => {
    if (!messages || messages.length === 0) return null;
    const graph = buildContextCoreGraph(messages, selectedRefs ?? [], roles ?? []);
    return buildGraphViewModel(graph);
  }, [messages, selectedRefs, roles]);

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
