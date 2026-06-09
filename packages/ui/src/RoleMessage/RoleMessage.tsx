import React, { useState, useMemo } from "react";
import type { CouncilMessage, RoleCard } from "@agora/shared";
import { useTheme } from "../theme/ThemeContext.js";
import { useI18n } from "../i18n/I18nContext.js";
import type { ColorPalette } from "../theme/palettes.js";
import { getRoleColor, USER_COLOR } from "../theme/palettes.js";
import { MessageContent } from "../ChatBubble/MessageContent.js";
import { CopyButton } from "../ChatBubble/CopyButton.js";

interface RoleMessageProps {
  message: CouncilMessage;
  roles?: RoleCard[];
  streaming?: boolean;
  expanded?: boolean;
  onToggle?: () => void;
}

function truncate(s: string, max: number): string {
  const clean = s.replace(/[#*_`>\-\n]+/g, " ").trim();
  return clean.length > max ? clean.slice(0, max) + "..." : clean;
}

function formatTime(iso: string): string {
  try {
    const d = new Date(iso);
    const h = d.getHours().toString().padStart(2, "0");
    const m = d.getMinutes().toString().padStart(2, "0");
    return `${h}:${m}`;
  } catch {
    return "";
  }
}

function formatThinkingLen(n: number): string {
  return n > 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);
}

export const RoleMessage: React.FC<RoleMessageProps> = ({ message, roles, streaming, expanded = true, onToggle }) => {
  const { colors } = useTheme();
  const { t } = useI18n();
  const styles = createStyles(colors);

  // Catalog-driven meta: built from role catalog + stable hash colors
  const roleMetaMap = useMemo(() => {
    const map = new Map<string, { name: string; subtitle: string; color: string }>();
    map.set("user", { name: t.you, subtitle: "", color: USER_COLOR });
    map.set("moderator", { name: t.moderator, subtitle: "", color: getRoleColor("moderator") });
    for (const role of roles ?? []) {
      map.set(role.id, {
        name: role.name,
        subtitle: role.subtitle,
        color: getRoleColor(role.id),
      });
    }
    return map;
  }, [roles, t.you, t.moderator]);
  const isUser = message.senderType === "user";
  const isError = message.status === "error";

  // Error messages render as system warning
  if (isError) {
    const roleName = message.targetRoleId
      ? (roleMetaMap.get(message.targetRoleId)?.name ?? message.targetRoleId)
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

  const meta = roleMetaMap.get(message.senderId) ?? {
    name: message.senderId,
    subtitle: "",
    color: colors.textMuted,
  };

  // Collapsed preview: role name + graphSummary (4 lines)
  const preview = message.graphSummary || truncate(message.content, 200);

  return (
    <div id={message.id} style={{ ...styles.row, flexDirection: isUser ? "row-reverse" : "row" }}>
      <div style={{ ...styles.avatar, background: meta.color }}>
        {meta.name.charAt(0)}
      </div>
      <div style={styles.content}>
        <div
          style={{ ...styles.header, cursor: onToggle ? "pointer" : "default" }}
          onClick={onToggle}
        >
          <span style={{ ...styles.name, color: meta.color }}>{meta.name}</span>
          {meta.subtitle && <span style={styles.subtitle}>{meta.subtitle}</span>}
          {message.createdAt && <span style={styles.timestamp}>{formatTime(message.createdAt)}</span>}
        </div>
        {!expanded && !isUser && (
          <div style={styles.preview} onClick={onToggle}>
            {message.graphSummary && <span style={styles.summaryBadge}>Summary</span>}
            {preview}
            {onToggle && <span style={styles.expandIndicator}>▾</span>}
          </div>
        )}
        {expanded && (
          <div
            style={styles.bubbleWrapper}
            onClick={onToggle}
          >
            {message.thinking && message.thinking.trim().length > 0 && (
              <ThinkingBlock thinking={message.thinking} colors={colors} label={t.thinking} />
            )}
            <div style={{ ...styles.bubble, borderTopColor: meta.color }}>
              <MessageContent content={message.content} colors={colors} />
              {streaming && message.content.length < 10 && (
                <PulsingDots color={meta.color} />
              )}
              {!streaming && message.content.length > 0 && (
                <div style={styles.actionRow}>
                  <CopyButton text={message.content} colors={colors} size="medium" />
                </div>
              )}
            </div>
            {onToggle && (
              <div style={styles.collapseHint}>
                ▴
              </div>
            )}
          </div>
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
  timestamp: { fontSize: 10, color: colors.textMuted, marginLeft: 4 },
  preview: {
    fontSize: 12, color: colors.textMuted, lineHeight: 1.5,
    padding: "6px 10px", cursor: "pointer",
    background: colors.surface, borderRadius: "0 8px 8px 8px",
    border: `1px solid ${colors.border}`,
    display: "-webkit-box", WebkitLineClamp: 4, WebkitBoxOrient: "vertical",
    overflow: "hidden", position: "relative",
  },
  summaryBadge: {
    fontSize: 9, color: colors.accent, textTransform: "uppercase" as const,
    letterSpacing: 0.5, fontWeight: 600, marginBottom: 2, display: "block",
  },
  expandIndicator: {
    position: "absolute",
    bottom: 2,
    right: 6,
    fontSize: 10,
    color: colors.textMuted,
    opacity: 0.6,
  },
  bubbleWrapper: {
    cursor: "pointer",
    position: "relative",
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
  collapseHint: {
    textAlign: "center",
    fontSize: 10,
    color: colors.textMuted,
    opacity: 0.5,
    marginTop: 4,
    cursor: "pointer",
    userSelect: "none" as const,
  },
  actionRow: {
    display: "flex",
    justifyContent: "flex-end",
    marginTop: 6,
    paddingTop: 4,
    borderTop: `1px solid ${colors.border}`,
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
  const lenLabel = formatThinkingLen(thinking.length);
  return (
    <div style={{ marginBottom: 4 }}>
      <button
        onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
        style={{
          background: "none", border: "none", cursor: "pointer",
          fontSize: 10, color: colors.textMuted, padding: 0,
          display: "flex", alignItems: "center", gap: 4,
        }}
      >
        <span style={{ transform: expanded ? "rotate(90deg)" : "rotate(0deg)", transition: "0.15s", display: "inline-block", fontSize: 8 }}>&#9654;</span>
        {label} <span style={{ opacity: 0.6 }}>({lenLabel})</span>
      </button>
      {expanded && (
        <div style={{
          marginTop: 2, padding: "6px 10px", fontSize: 11, lineHeight: 1.5,
          color: colors.textMuted, background: colors.surface,
          borderLeft: `2px solid ${colors.accentDim}`, borderRadius: "0 4px 4px 0",
          maxHeight: 200, overflowY: "auto",
        }}>
          <MessageContent content={thinking} colors={colors} />
        </div>
      )}
    </div>
  );
};

const PulsingDots: React.FC<{ color: string }> = ({ color }) => {
  const [tick, setTick] = useState(0);
  React.useEffect(() => {
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
