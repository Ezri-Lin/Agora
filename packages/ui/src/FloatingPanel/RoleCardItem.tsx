import React, { useRef, useState } from "react";
import type { RoleRoundHistory } from "@agora/shared";
import type { RoleStreamState } from "../CouncilMonitor/CouncilMonitor.js";
import type { ColorPalette } from "../theme/palettes.js";
import { getRoleColor } from "../theme/palettes.js";
import { SpiralLoader } from "../AgentTools/SpiralLoader.js";
import { RoleHistoryPopover } from "./RoleHistoryPopover.js";

interface RoleCardItemProps {
  roleId: string;
  roleName: string;
  description?: string;
  state?: RoleStreamState;
  onStopTurn?: () => void;
  onRemove?: () => void;
  onJumpToMessage?: (messageId: string) => void;
  colors: ColorPalette;
  history?: RoleRoundHistory[];
  panelRef?: React.RefObject<HTMLDivElement | null>;
}

export const RoleCardItem: React.FC<RoleCardItemProps> = ({
  roleId,
  roleName,
  description,
  state,
  onStopTurn,
  onRemove,
  onJumpToMessage,
  colors,
  history,
  panelRef,
}) => {
  const [hoveredBtn, setHoveredBtn] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const anchorRef = useRef<HTMLDivElement>(null);
  const hoverTimerRef = useRef<ReturnType<typeof setTimeout>>();

  const isActive = state?.status === "thinking" || state?.status === "streaming";
  const isDone = state?.status === "done";
  const accentColor = getRoleColor(roleId);

  const handleMouseEnter = () => {
    if (!history || history.length === 0) return;
    clearTimeout(hoverTimerRef.current);
    hoverTimerRef.current = setTimeout(() => setShowHistory(true), 300);
  };

  const handleMouseLeave = () => {
    clearTimeout(hoverTimerRef.current);
    hoverTimerRef.current = setTimeout(() => setShowHistory(false), 200);
  };

  const handleClick = () => {
    if (history && history.length > 0) {
      setShowHistory((v) => !v);
    } else if (state?.messageId && onJumpToMessage) {
      onJumpToMessage(state.messageId);
    }
  };

  return (
    <div style={cardStyle(colors)} ref={anchorRef} onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
      <div
        className="role-row"
        style={{ cursor: "pointer" }}
        onClick={handleClick}
      >
        {/* Avatar */}
        <div className="role-dot" style={{ borderColor: accentColor }}>
          {roleName.charAt(0).toUpperCase()}
        </div>

        {/* Name + description */}
        <div style={{ minWidth: 0, flex: 1 }}>
          <b>{roleName}</b>
          {description && <p style={{ margin: 0, fontSize: 10, color: colors.textMuted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{description}</p>}
        </div>

        {/* Status indicator */}
        {isActive && (
          <SpiralLoader size={12} style={{ color: accentColor, opacity: 0.7 }} />
        )}

        {/* Icon actions */}
        <div style={actionsCol}>
          {isActive && onStopTurn && (
            <div style={iconBtnWrap} onMouseEnter={() => setHoveredBtn("pause")} onMouseLeave={() => setHoveredBtn(null)}>
              <button
                style={iconBtnStyle(colors)}
                title="Pause"
                onClick={(e) => { e.stopPropagation(); onStopTurn(); }}
              >
                <svg viewBox="0 0 16 16" fill="currentColor" style={{ width: 10, height: 10 }}>
                  <rect x="3" y="2" width="3.5" height="12" rx="1" />
                  <rect x="9.5" y="2" width="3.5" height="12" rx="1" />
                </svg>
              </button>
              {hoveredBtn === "pause" && <Tooltip text="Pause role" colors={colors} />}
            </div>
          )}
          {onRemove && (
            <div style={iconBtnWrap} onMouseEnter={() => setHoveredBtn("remove")} onMouseLeave={() => setHoveredBtn(null)}>
              <button
                style={iconBtnStyle(colors)}
                title="Remove"
                onClick={(e) => { e.stopPropagation(); onRemove(); }}
              >✕</button>
              {hoveredBtn === "remove" && <Tooltip text="Remove from room" colors={colors} />}
            </div>
          )}
        </div>
      </div>
      {showHistory && history && history.length > 0 && (
        <RoleHistoryPopover
          roleName={roleName}
          roleId={roleId}
          history={history}
          onJumpToMessage={onJumpToMessage}
          onClose={() => setShowHistory(false)}
          colors={colors}
          anchorRef={anchorRef}
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
