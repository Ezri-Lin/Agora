import React from "react";
import { colors } from "./theme/tokens.js";

interface EmptyStateProps {
  onOpen: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ onOpen }) => {
  return (
    <div style={styles.root}>
      <div style={styles.card}>
        <div style={styles.logo}>A</div>
        <h1 style={styles.title}>Agora</h1>
        <p style={styles.subtitle}>
          Local-first, memory-aware council room
        </p>
        <button style={styles.btn} onClick={onOpen}>
          Open Workspace
        </button>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  root: {
    height: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: colors.bg,
  },
  card: {
    textAlign: "center",
    padding: 48,
  },
  logo: {
    width: 64,
    height: 64,
    borderRadius: 12,
    background: colors.accent,
    color: "#fff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 700,
    fontSize: 32,
    margin: "0 auto 16px",
  },
  title: {
    fontSize: 28,
    fontWeight: 700,
    color: colors.text,
    margin: 0,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textMuted,
    marginTop: 8,
    marginBottom: 24,
  },
  btn: {
    padding: "10px 24px",
    borderRadius: 8,
    background: colors.accent,
    border: "none",
    color: "#fff",
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
  },
};
