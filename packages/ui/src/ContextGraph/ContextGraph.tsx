import React from "react";
import { colors } from "../theme/tokens.js";

interface GraphNode {
  id: string;
  label: string;
  type: "topic" | "doc" | "role";
  color: string;
}

const MOCK_NODES: GraphNode[] = [
  { id: "t1", label: "Current Topic", type: "topic", color: colors.accent },
  { id: "d1", label: "Doc 1", type: "doc", color: colors.textMuted },
  { id: "d2", label: "Doc 2", type: "doc", color: colors.textMuted },
  { id: "r1", label: "Moderator", type: "role", color: colors.moderator },
  { id: "r2", label: "Critic", type: "role", color: colors.critic },
  { id: "r3", label: "Historian", type: "role", color: colors.historian },
];

export const ContextGraph: React.FC = () => {
  return (
    <div style={styles.container}>
      <div style={styles.header}>Context Graph</div>
      <div style={styles.nodes}>
        {MOCK_NODES.map((node) => (
          <div key={node.id} style={styles.nodeRow}>
            <div style={{ ...styles.dot, background: node.color }} />
            <span style={styles.label}>{node.label}</span>
          </div>
        ))}
      </div>
      <div style={styles.placeholder}>
        Graph connections will render here
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: "flex",
    flexDirection: "column",
    height: "100%",
    padding: 12,
    borderRight: `1px solid ${colors.border}`,
    background: colors.bg,
  },
  header: {
    fontSize: 11,
    fontWeight: 600,
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 12,
  },
  nodes: { display: "flex", flexDirection: "column", gap: 8 },
  nodeRow: { display: "flex", alignItems: "center", gap: 8 },
  dot: { width: 8, height: 8, borderRadius: "50%", flexShrink: 0 },
  label: { fontSize: 12, color: colors.text },
  placeholder: {
    marginTop: "auto",
    fontSize: 11,
    color: colors.textMuted,
    textAlign: "center",
    padding: 16,
  },
};
