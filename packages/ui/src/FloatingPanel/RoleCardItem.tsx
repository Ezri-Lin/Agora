import React, { useState } from "react";
import type { RoleRoundHistory } from "@agora/shared";
import type { RoleStreamState } from "../CouncilMonitor/CouncilMonitor.js";
import type { ColorPalette } from "../theme/palettes.js";
import { getRoleColor } from "../theme/palettes.js";
import { useI18n } from "../i18n/I18nContext.js";
import { RoleHistoryPopover } from "./RoleHistoryPopover.js";

interface RoleCardItemProps {
  roleId: string;
  roleName: string;
  description?: string;
  state?: RoleStreamState;
  history: RoleRoundHistory[];
  onStopTurn?: () => void;
  onRemove?: () => void;
  onJumpToMessage?: (messageId: string) => void;
  colors: ColorPalette;
  panelRef?: React.RefObject<HTMLDivElement | null>;
}

export const RoleCardItem: React.FC<RoleCardItemProps> = ({
  roleId,
  roleName,
  description,
  state,
  history,
  onStopTurn,
  onRemove,
  onJumpToMessage,
  colors,
  panelRef,
}) => {
  const { t } = useI18n();
  const [showHistory, setShowHistory] = useState(false);
  const [hoveredBtn, setHoveredBtn] = useState<string | null>(null);
  const [hovered, setHovered] = useState(false);
  const cardRef = React.useRef<HTMLDivElement>(null);

  const isActive = state?.status === "thinking" || state?.status === "streaming";
  const isDone = state?.status === "done";
  const isError = state?.status === "error";
  const elapsed = state ? Math.floor((Date.now() - state.startedAt) / 1000) : 0;
  const latestSummary = state?.microSummary || history[0]?.summary || "";

  const statusLabel = isActive ? (state?.status === "thinking" ? t.roleThinking : t.roleStreaming)
    : isDone ? t.roleDone
    : isError ? t.roleError
    : "";

  const accentColor = getRoleColor(roleId);

  return (
    <div
      ref={cardRef}
      style={cardStyle(colors)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="role-row" onClick={() => setShowHistory(!showHistory)} style={{ cursor: "pointer" }}>
        {/* Avatar */}
        <div className="role-dot" style={{ borderColor: accentColor }}>
          {roleName.charAt(0).toUpperCase()}
        </div>

        {/* Name + description */}
        <div style={{ minWidth: 0 }}>
          <b>{roleName}</b>
          <p>{description}</p>
        </div>

        {/* Icon actions */}
        <div style={actionsCol}>
          {isActive && onStopTurn && (
            <div style={iconBtnWrap} onMouseEnter={() => setHoveredBtn("stop")} onMouseLeave={() => setHoveredBtn(null)}>
              <button style={iconBtnStyle(colors)} onClick={(e) => { e.stopPropagation(); onStopTurn(); }}>⏹</button>
              {hoveredBtn === "stop" && <Tooltip text={t.stopTurn} colors={colors} />}
            </div>
          )}
          {onRemove && (
            <div style={iconBtnWrap} onMouseEnter={() => setHoveredBtn("remove")} onMouseLeave={() => setHoveredBtn(null)}>
              <button style={iconBtnStyle(colors)} onClick={(e) => { e.stopPropagation(); onRemove(); }}>✕</button>
              {hoveredBtn === "remove" && <Tooltip text={t.removeFromRoom} colors={colors} />}
            </div>
          )}
        </div>
      </div>

      {/* Summary snippet — shown on hover */}
      {latestSummary && !showHistory && hovered && (
        <div style={summaryStyle(colors)}>{latestSummary}</div>
      )}

      {/* History bubble — portal positioned to the left of the panel */}
      {showHistory && (
        <RoleHistoryPopover
          roleName={roleName}
          roleId={roleId}
          history={history}
          onJumpToMessage={onJumpToMessage}
          onClose={() => setShowHistory(false)}
          colors={colors}
          anchorRef={cardRef}
          panelRef={panelRef}
        />
      )}
    </div>
  );
};

// --- Tooltip ---

const Tooltip: React.FC<{ text: string; colors: ColorPalette }> = ({ text, colors }) => (
  <div style={{
    position: "absolute",
    right: "100%",
    top: "50%",
    transform: "translateY(-50%)",
    marginRight: 6,
    background: colors.text,
    color: colors.bg,
    fontSize: 9,
    padding: "2px 6px",
    borderRadius: 3,
    whiteSpace: "nowrap",
    pointerEvents: "none",
    zIndex: 10,
  }}>
    {text}
  </div>
);

// --- Styles ---

const cardStyle = (colors: ColorPalette): React.CSSProperties => ({
  padding: "8px 10px",
  borderBottom: `1px solid ${colors.border}`,
  position: "relative",
});

const cardTopRow: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
};

const avatarStyle = (color: string, active: boolean): React.CSSProperties => ({
  width: 28,
  height: 28,
  borderRadius: "50%",
  background: active ? `${color}dd` : color,
  color: "#fff",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 12,
  fontWeight: 700,
  flexShrink: 0,
  cursor: "pointer",
  outline: active ? `2px solid ${color}` : "none",
  outlineOffset: 1,
  transition: "outline 0.15s",
});

const infoCol: React.CSSProperties = {
  flex: 1,
  minWidth: 0,
  cursor: "pointer",
};

const nameStyle = (colors: ColorPalette): React.CSSProperties => ({
  fontSize: 11,
  fontWeight: 600,
  color: colors.text,
  display: "block",
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
});

const descStyle = (colors: ColorPalette): React.CSSProperties => ({
  fontSize: 10,
  color: colors.textMuted,
  lineHeight: 1.3,
  display: "block",
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
  marginTop: 1,
});

const statusRowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 6,
  marginTop: 2,
};

const statusBadgeStyle = (color: string, pulse: boolean): React.CSSProperties => ({
  fontSize: 9,
  fontWeight: 600,
  color,
  textTransform: "uppercase",
  letterSpacing: 0.3,
  animation: pulse ? "pulse 1.5s ease-in-out infinite" : undefined,
});

const elapsedStyle = (colors: ColorPalette): React.CSSProperties => ({
  fontSize: 9,
  color: colors.textMuted,
});

const actionsCol: React.CSSProperties = {
  display: "flex",
  gap: 2,
  alignItems: "center",
};

const iconBtnWrap: React.CSSProperties = {
  position: "relative",
};

const iconBtnStyle = (colors: ColorPalette): React.CSSProperties => ({
  background: "none",
  border: "none",
  color: colors.textMuted,
  fontSize: 12,
  cursor: "pointer",
  padding: "2px 4px",
  lineHeight: 1,
  borderRadius: 3,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  width: 20,
  height: 20,
});

const summaryStyle = (colors: ColorPalette): React.CSSProperties => ({
  fontSize: 10,
  color: colors.textMuted,
  lineHeight: 1.4,
  marginTop: 4,
  paddingLeft: 36,
  display: "-webkit-box",
  WebkitLineClamp: 2,
  WebkitBoxOrient: "vertical",
  overflow: "hidden",
});
