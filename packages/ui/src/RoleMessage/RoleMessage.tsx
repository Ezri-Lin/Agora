import React, { useState, useEffect, useRef } from "react";
import type { CouncilMessage } from "@agora/shared";
import { useTheme } from "../theme/ThemeContext.js";
import { useI18n } from "../i18n/I18nContext.js";
import type { ColorPalette } from "../theme/palettes.js";

interface RoleMessageProps {
  message: CouncilMessage;
  streaming?: boolean;
}

function truncate(s: string, max: number): string {
  const clean = s.replace(/[#*_`>\-\n]+/g, " ").trim();
  return clean.length > max ? clean.slice(0, max) + "..." : clean;
}

export const RoleMessage: React.FC<RoleMessageProps> = ({ message, streaming }) => {
  const { colors } = useTheme();
  const { t } = useI18n();
  const styles = createStyles(colors);
  const [expanded, setExpanded] = useState<boolean>(!!streaming);
  const collapseTimerRef = useRef<ReturnType<typeof setTimeout>>();

  // Auto-expand when streaming, auto-collapse 3s after done
  useEffect(() => {
    if (streaming) {
      setExpanded(true);
      clearTimeout(collapseTimerRef.current);
    } else if (expanded && message.senderType === "role" && message.content.length > 50) {
      collapseTimerRef.current = setTimeout(() => setExpanded(false), 3000);
    }
    return () => clearTimeout(collapseTimerRef.current);
  }, [streaming]);

  const ROLE_META: Record<string, { name: string; subtitle: string; color: string }> = {
    user: { name: "You", subtitle: "", color: colors.user },
    moderator: { name: "Moderator", subtitle: "长期主持人", color: colors.moderator },
    skeptic_critic: { name: "Skeptic Critic", subtitle: "反驳者", color: colors.critic },
    historian: { name: "Historian", subtitle: "历史周期视角", color: colors.historian },
    product_strategist: { name: "Product Strategist", subtitle: "产品策略", color: colors.strategist },
  };
  const isUser = message.senderType === "user";
  const isError = message.status === "error";

  // Error messages render as system warning
  if (isError) {
    const roleName = message.targetRoleId
      ? (ROLE_META[message.targetRoleId]?.name ?? message.targetRoleId)
      : "Unknown";
    return (
      <div id={message.id} style={styles.errorRow}>
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

  // User messages and moderator messages are always expanded
  const alwaysExpand = isUser || message.senderType === "moderator";
  const showExpanded = alwaysExpand || expanded;

  // Collapsed preview: role name + graphSummary
  const preview = message.graphSummary || truncate(message.content, 60);

  return (
    <div id={message.id} style={{ ...styles.row, flexDirection: isUser ? "row-reverse" : "row" }}>
      <div style={{ ...styles.avatar, background: meta.color }}>
        {meta.name.charAt(0)}
      </div>
      <div style={styles.content}>
        <div
          style={{ ...styles.header, cursor: alwaysExpand ? "default" : "pointer" }}
          onClick={alwaysExpand ? undefined : () => setExpanded(!expanded)}
        >
          <span style={{ ...styles.name, color: meta.color }}>{meta.name}</span>
          {meta.subtitle && <span style={styles.subtitle}>{meta.subtitle}</span>}
          {!alwaysExpand && (
            <span style={styles.expandToggle}>{expanded ? "▾" : "▸"}</span>
          )}
        </div>
        {!showExpanded && !isUser && (
          <div style={styles.preview} onClick={() => setExpanded(true)}>
            {preview}
          </div>
        )}
        {showExpanded && (
          <>
            {message.thinking && message.thinking.trim().length > 0 && (
              <ThinkingBlock thinking={message.thinking} colors={colors} label={t.thinking} />
            )}
            <div style={{ ...styles.bubble, borderTopColor: meta.color }}>
              {message.content}
              {streaming && message.content.length < 10 && (
                <PulsingDots color={meta.color} />
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

const createStyles = (colors: ColorPalette): Record<string, React.CSSProperties> => ({
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
    color: colors.text,
    fontWeight: 700,
    fontSize: 13,
    flexShrink: 0,
  },
  content: { flex: 1, minWidth: 0 },
  header: { display: "flex", alignItems: "baseline", gap: 6, marginBottom: 4 },
  name: { fontSize: 12, fontWeight: 600 },
  subtitle: { fontSize: 10, color: colors.textMuted },
  expandToggle: {
    fontSize: 10, color: colors.textMuted, marginLeft: "auto", cursor: "pointer",
    userSelect: "none" as const,
  },
  preview: {
    fontSize: 12, color: colors.textMuted, lineHeight: 1.4,
    padding: "2px 0", cursor: "pointer",
    overflow: "hidden", textOverflow: "ellipsis",
    display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical",
  },
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
    background: colors.dangerBg,
    border: `1px solid ${colors.dangerBorder}`,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: colors.danger,
    fontWeight: 700,
    fontSize: 12,
    flexShrink: 0,
  },
  errorContent: {
    flex: 1,
    background: colors.dangerBg,
    border: `1px solid ${colors.dangerBorder}`,
    borderRadius: "0 6px 6px 6px",
    padding: "6px 10px",
  },
  errorTitle: {
    fontSize: 11,
    fontWeight: 600,
    color: colors.danger,
    marginBottom: 2,
  },
  errorBody: {
    fontSize: 11,
    color: colors.danger,
    lineHeight: 1.4,
  },
});

const ThinkingBlock: React.FC<{ thinking: string; colors: ColorPalette; label: string }> = ({ thinking, colors, label }) => {
  const [expanded, setExpanded] = useState(false);
  return (
    <div style={{ marginBottom: 4 }}>
      <button
        onClick={() => setExpanded(!expanded)}
        style={{
          background: "none", border: "none", cursor: "pointer",
          fontSize: 10, color: colors.textMuted, padding: 0,
          display: "flex", alignItems: "center", gap: 4,
        }}
      >
        <span style={{ transform: expanded ? "rotate(90deg)" : "rotate(0deg)", transition: "0.15s", display: "inline-block", fontSize: 8 }}>&#9654;</span>
        {label}
      </button>
      {expanded && (
        <div style={{
          marginTop: 2, padding: "6px 10px", fontSize: 11, lineHeight: 1.5,
          color: colors.textMuted, background: colors.surface,
          borderLeft: `2px solid ${colors.accentDim}`, borderRadius: "0 4px 4px 0",
          whiteSpace: "pre-wrap", wordBreak: "break-word", maxHeight: 200, overflowY: "auto",
        }}>
          {thinking}
        </div>
      )}
    </div>
  );
};

const PulsingDots: React.FC<{ color: string }> = ({ color }) => {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => (t + 1) % 3), 400);
    return () => clearInterval(id);
  }, []);
  return (
    <span style={{ display: "inline-flex", gap: 3, marginLeft: 4, verticalAlign: "middle" }}>
      {[0, 1, 2].map((i) => (
        <span key={i} style={{
          width: 5, height: 5, borderRadius: "50%", background: color,
          opacity: tick === i ? 1 : 0.3, transition: "opacity 0.15s",
        }} />
      ))}
    </span>
  );
};
