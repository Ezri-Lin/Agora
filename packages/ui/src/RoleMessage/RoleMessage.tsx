import React from "react";
import type { CouncilMessage } from "@agora/shared";
import { colors } from "../theme/tokens.js";

interface RoleMessageProps {
  message: CouncilMessage;
}

const ROLE_META: Record<string, { name: string; subtitle: string; color: string }> = {
  user: { name: "You", subtitle: "", color: colors.user },
  moderator: { name: "Moderator", subtitle: "长期主持人", color: colors.moderator },
  skeptic_critic: { name: "Skeptic Critic", subtitle: "反驳者", color: colors.critic },
  historian: { name: "Historian", subtitle: "历史周期视角", color: colors.historian },
  product_strategist: { name: "Product Strategist", subtitle: "产品策略", color: colors.strategist },
};

export const RoleMessage: React.FC<RoleMessageProps> = ({ message }) => {
  const isUser = message.senderType === "user";
  const isError = message.status === "error";

  // Error messages render as system warning
  if (isError) {
    const roleName = message.targetRoleId
      ? (ROLE_META[message.targetRoleId]?.name ?? message.targetRoleId)
      : "Unknown";
    return (
      <div style={styles.errorRow}>
        <div style={styles.errorIcon}>!</div>
        <div style={styles.errorContent}>
          <div style={styles.errorTitle}>
            {roleName} — {message.errorCode ?? "error"}
          </div>
          <div style={styles.errorBody}>{message.errorMessage ?? message.content}</div>
        </div>
      </div>
    );
  }

  const meta = ROLE_META[message.senderId] ?? {
    name: message.senderId,
    subtitle: "",
    color: colors.textMuted,
  };

  return (
    <div style={{ ...styles.row, flexDirection: isUser ? "row-reverse" : "row" }}>
      <div style={{ ...styles.avatar, background: meta.color }}>
        {meta.name.charAt(0)}
      </div>
      <div style={styles.content}>
        <div style={styles.header}>
          <span style={{ ...styles.name, color: meta.color }}>{meta.name}</span>
          {meta.subtitle && <span style={styles.subtitle}>{meta.subtitle}</span>}
        </div>
        <div style={{ ...styles.bubble, borderTopColor: meta.color }}>
          {message.content}
        </div>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  row: {
    display: "flex",
    gap: 10,
    padding: "8px 0",
    alignItems: "flex-start",
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#fff",
    fontWeight: 700,
    fontSize: 13,
    flexShrink: 0,
  },
  content: { flex: 1, minWidth: 0 },
  header: { display: "flex", alignItems: "baseline", gap: 6, marginBottom: 4 },
  name: { fontSize: 12, fontWeight: 600 },
  subtitle: { fontSize: 10, color: colors.textMuted },
  bubble: {
    background: colors.surface,
    borderRadius: "0 8px 8px 8px",
    padding: "8px 12px",
    fontSize: 13,
    lineHeight: 1.6,
    color: colors.text,
    borderTop: "2px solid",
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
  },
  errorRow: {
    display: "flex",
    gap: 8,
    padding: "6px 0",
    alignItems: "flex-start",
  },
  errorIcon: {
    width: 24,
    height: 24,
    borderRadius: "50%",
    background: "rgba(231,76,60,0.15)",
    border: "1px solid rgba(231,76,60,0.3)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#e74c3c",
    fontWeight: 700,
    fontSize: 12,
    flexShrink: 0,
  },
  errorContent: {
    flex: 1,
    background: "rgba(231,76,60,0.05)",
    border: "1px solid rgba(231,76,60,0.15)",
    borderRadius: "0 6px 6px 6px",
    padding: "6px 10px",
  },
  errorTitle: {
    fontSize: 11,
    fontWeight: 600,
    color: "#e74c3c",
    marginBottom: 2,
  },
  errorBody: {
    fontSize: 11,
    color: "#c0392b",
    lineHeight: 1.4,
  },
};
