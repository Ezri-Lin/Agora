import React, { useState, useEffect } from "react";
import type { RoleCard } from "@agora/shared";
import type { RoleStreamState } from "../CouncilMonitor/CouncilMonitor.js";
import { useTheme } from "../theme/ThemeContext.js";
import { useI18n } from "../i18n/I18nContext.js";
import type { ColorPalette } from "../theme/palettes.js";
import type { Translations } from "../i18n/translations.js";

interface ProgressSectionProps {
  roles: RoleCard[];
  roleStates: Map<string, RoleStreamState>;
}

const STATUS_CONFIG: Record<string, (t: Translations) => { color: string; label: string }> = {
  thinking: (t) => ({ color: "#8b5cf6", label: t.roleThinking }),
  streaming: (t) => ({ color: "#22c55e", label: t.roleStreaming }),
  done: (t) => ({ color: "#6b7280", label: t.roleDone }),
  error: (t) => ({ color: "#ef4444", label: t.roleError }),
};

export const ProgressSection: React.FC<ProgressSectionProps> = ({ roles, roleStates }) => {
  const { colors } = useTheme();
  const { t } = useI18n();
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const hasActive = [...roleStates.values()].some((s) => s.status === "thinking" || s.status === "streaming");
    if (!hasActive) return;
    const id = setInterval(() => setTick((v) => v + 1), 1000);
    return () => clearInterval(id);
  }, [roleStates]);

  const activeRoles = roles.filter((r) => roleStates.has(r.id));
  if (activeRoles.length === 0) return null;

  return (
    <div style={wrapStyle}>
      {activeRoles.map((role) => {
        const state = roleStates.get(role.id)!;
        const cfg = STATUS_CONFIG[state.status]?.(t) ?? { color: "#6b7280", label: state.status };
        const elapsed = Math.floor((Date.now() - state.startedAt) / 1000);
        const isActive = state.status === "thinking" || state.status === "streaming";
        return (
          <div key={role.id} style={cardStyle(colors)}>
            <div style={avatarWrapStyle}>
              <div style={{ ...avatarStyle(colors), borderColor: cfg.color, boxShadow: isActive ? `0 0 6px ${cfg.color}40` : "none" }}>
                {role.name.charAt(0)}
              </div>
              <div style={{ ...dotStyle, background: cfg.color }} />
            </div>
            <div style={infoStyle}>
              <div style={nameRowStyle}>
                <span style={nameStyle(colors)}>{role.name}</span>
                <span style={statusStyle(cfg.color)}>{cfg.label}</span>
                {isActive && <span style={elapsedStyle(colors)}>{elapsed}s</span>}
              </div>
              {state.microSummary && (
                <div style={summaryStyle(colors)}>{state.microSummary}</div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

// --- Styles ---

const wrapStyle: React.CSSProperties = {
  padding: "8px 12px",
  display: "flex",
  flexDirection: "column",
  gap: 6,
  borderBottom: "1px solid var(--border, #333)",
};

const cardStyle = (colors: ColorPalette): React.CSSProperties => ({
  display: "flex",
  gap: 8,
  alignItems: "flex-start",
});

const avatarWrapStyle: React.CSSProperties = {
  position: "relative",
  flexShrink: 0,
};

const avatarStyle = (colors: ColorPalette): React.CSSProperties => ({
  width: 24,
  height: 24,
  borderRadius: "50%",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 10,
  fontWeight: 700,
  color: colors.text,
  background: colors.surface,
  border: "2px solid",
  transition: "border-color 0.2s, box-shadow 0.2s",
});

const dotStyle: React.CSSProperties = {
  position: "absolute",
  bottom: -1,
  right: -1,
  width: 7,
  height: 7,
  borderRadius: "50%",
  border: "1.5px solid var(--bg, #1a1a1a)",
};

const infoStyle: React.CSSProperties = {
  flex: 1,
  minWidth: 0,
};

const nameRowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "baseline",
  gap: 6,
};

const nameStyle = (colors: ColorPalette): React.CSSProperties => ({
  fontSize: 11,
  fontWeight: 600,
  color: colors.text,
});

const statusStyle = (color: string): React.CSSProperties => ({
  fontSize: 9,
  color,
  fontWeight: 500,
});

const elapsedStyle = (colors: ColorPalette): React.CSSProperties => ({
  fontSize: 9,
  color: colors.textMuted,
  marginLeft: "auto",
});

const summaryStyle = (colors: ColorPalette): React.CSSProperties => ({
  fontSize: 10,
  color: colors.textMuted,
  lineHeight: 1.4,
  marginTop: 2,
  overflow: "hidden",
  textOverflow: "ellipsis",
  display: "-webkit-box",
  WebkitLineClamp: 2,
  WebkitBoxOrient: "vertical",
});
