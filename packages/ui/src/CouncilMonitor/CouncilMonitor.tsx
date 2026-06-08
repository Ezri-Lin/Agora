import React, { useState, useEffect } from "react";
import type { RoleCard } from "@agora/shared";
import { useTheme } from "../theme/ThemeContext.js";
import { useI18n } from "../i18n/I18nContext.js";
import type { ColorPalette } from "../theme/palettes.js";
import type { Translations } from "../i18n/translations.js";

export interface RoleStreamState {
  status: "thinking" | "streaming" | "done" | "error";
  startedAt: number;
  microSummary: string;
}

interface CouncilMonitorProps {
  roles: RoleCard[];
  roleStates: Map<string, RoleStreamState>;
  onStopRole?: (roleId: string) => void;
}

export const CouncilMonitor: React.FC<CouncilMonitorProps> = ({ roles, roleStates, onStopRole }) => {
  const { colors } = useTheme();
  const { t } = useI18n();
  const styles = createStyles(colors);
  const [, setTick] = useState(0);

  // Tick every second to update elapsed time
  useEffect(() => {
    if (roleStates.size === 0) return;
    const id = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, [roleStates.size]);

  const activeRoles = roles.filter((r) => roleStates.has(r.id));

  if (activeRoles.length === 0) {
    return (
      <div style={styles.container}>
        <div style={styles.header}>{t.councilMonitor}</div>
        <div style={styles.empty}>Waiting for council round...</div>
      </div>
    );
  }

  const doneCount = activeRoles.filter((r) => roleStates.get(r.id)?.status === "done").length;

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        {t.councilMonitor}
        <span style={styles.count}>{doneCount}/{activeRoles.length}</span>
      </div>
      <div style={styles.list}>
        {activeRoles.map((role) => {
          const state = roleStates.get(role.id)!;
          return (
            <RoleCardEntry
              key={role.id}
              role={role}
              state={state}
              t={t}
              colors={colors}
              onStop={onStopRole ? () => onStopRole(role.id) : undefined}
            />
          );
        })}
      </div>
    </div>
  );
};

const RoleCardEntry: React.FC<{
  role: RoleCard;
  state: RoleStreamState;
  t: Translations;
  colors: ColorPalette;
  onStop?: () => void;
}> = ({ role, state, t, colors, onStop }) => {
  const styles = createStyles(colors);
  const elapsed = Math.floor((Date.now() - state.startedAt) / 1000);
  const statusConfig = getStatusConfig(state.status, t);

  return (
    <div style={styles.card}>
      <div style={styles.cardTop}>
        <div style={styles.avatarWrap}>
          <div style={{
            ...styles.avatar,
            borderColor: statusConfig.color,
            boxShadow: state.status === "streaming" || state.status === "thinking"
              ? `0 0 6px ${statusConfig.color}40`
              : "none",
          }}>
            {role.name.charAt(0)}
          </div>
          <div style={{ ...styles.statusDot, background: statusConfig.color }} />
        </div>
        <div style={styles.cardBody}>
          <div style={styles.cardName}>{role.name}</div>
          <div style={styles.cardStatus}>
            <span style={{ color: statusConfig.color }}>{statusConfig.label}</span>
            {(state.status === "thinking" || state.status === "streaming") && (
              <span style={styles.elapsed}> · {elapsed}s</span>
            )}
          </div>
        </div>
        {onStop && (state.status === "thinking" || state.status === "streaming") && (
          <button style={styles.stopBtn} onClick={onStop}>{t.stop}</button>
        )}
      </div>
      {state.microSummary && (
        <div style={styles.microSummary}>{state.microSummary}</div>
      )}
    </div>
  );
};

function getStatusConfig(status: RoleStreamState["status"], t: Translations): { color: string; label: string } {
  switch (status) {
    case "thinking": return { color: "#8b5cf6", label: t.roleThinking };
    case "streaming": return { color: "#22c55e", label: t.roleStreaming };
    case "done": return { color: "#6b7280", label: t.roleDone };
    case "error": return { color: "#ef4444", label: t.roleError };
  }
}

function truncate(s: string, max: number): string {
  const clean = s.replace(/[#*_`>\-\n]+/g, " ").trim();
  return clean.length > max ? clean.slice(0, max) + "..." : clean;
}

const createStyles = (colors: ColorPalette): Record<string, React.CSSProperties> => ({
  container: {
    display: "flex",
    flexDirection: "column",
    height: "100%",
    overflow: "hidden",
  },
  header: {
    fontSize: 11,
    fontWeight: 600,
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 1,
    padding: "10px 12px 6px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexShrink: 0,
  },
  count: {
    fontSize: 10,
    fontWeight: 400,
    color: colors.accent,
    textTransform: "none",
    letterSpacing: 0,
  },
  empty: {
    fontSize: 11,
    color: colors.textMuted,
    textAlign: "center",
    padding: 20,
  },
  list: {
    flex: 1,
    overflowY: "auto",
    padding: "0 8px 8px",
  },
  card: {
    background: colors.surface,
    border: `1px solid ${colors.border}`,
    borderRadius: 6,
    padding: "8px 10px",
    marginBottom: 6,
  },
  cardTop: {
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  avatarWrap: {
    position: "relative",
    flexShrink: 0,
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: "50%",
    border: "2px solid",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 11,
    fontWeight: 700,
    color: colors.text,
    background: colors.surfaceHover,
    transition: "border-color 0.3s, box-shadow 0.3s",
  },
  statusDot: {
    position: "absolute",
    bottom: -1,
    right: -1,
    width: 8,
    height: 8,
    borderRadius: "50%",
    border: `1.5px solid ${colors.surface}`,
  },
  cardBody: {
    flex: 1,
    minWidth: 0,
  },
  cardName: {
    fontSize: 12,
    fontWeight: 600,
    color: colors.text,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  cardStatus: {
    fontSize: 10,
    color: colors.textMuted,
    display: "flex",
    alignItems: "center",
  },
  elapsed: {
    fontSize: 10,
    color: colors.textMuted,
  },
  stopBtn: {
    background: "none",
    border: `1px solid ${colors.dangerBorder}`,
    borderRadius: 3,
    padding: "2px 6px",
    fontSize: 9,
    color: colors.danger,
    cursor: "pointer",
    flexShrink: 0,
  },
  microSummary: {
    fontSize: 11,
    color: colors.textMuted,
    lineHeight: 1.4,
    marginTop: 6,
    paddingLeft: 36,
    overflow: "hidden",
    display: "-webkit-box",
    WebkitLineClamp: 2,
    WebkitBoxOrient: "vertical",
  },
});
