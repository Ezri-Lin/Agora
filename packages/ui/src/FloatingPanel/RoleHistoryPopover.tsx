import React, { useEffect, useRef, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import type { RoleRoundHistory } from "@agora/shared";
import type { ColorPalette } from "../theme/palettes.js";
import { useI18n } from "../i18n/I18nContext.js";
import { getRoleColor } from "../theme/palettes.js";

interface RoleHistoryPopoverProps {
  roleName: string;
  roleId: string;
  history: RoleRoundHistory[];
  maxItems?: number;
  onJumpToMessage?: (messageId: string) => void;
  onClose: () => void;
  colors: ColorPalette;
  anchorRef: React.RefObject<HTMLDivElement | null>;
  panelRef?: React.RefObject<HTMLDivElement | null>;
}

/**
 * Portal-positioned history bubble.
 * Renders to the LEFT of the floating panel.
 */
export const RoleHistoryPopover: React.FC<RoleHistoryPopoverProps> = ({
  roleName,
  roleId,
  history,
  maxItems = 8,
  onJumpToMessage,
  onClose,
  colors,
  anchorRef,
  panelRef,
}) => {
  const { t } = useI18n();
  const popoverRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ top: 0, right: 0, maxHeight: 400 });

  const accentColor = getRoleColor(roleId);

  // Position: to the left of the panel, vertically aligned with the anchor card
  useEffect(() => {
    const anchor = anchorRef.current;
    const panel = panelRef?.current;
    if (!anchor || !panel) return;

    const anchorRect = anchor.getBoundingClientRect();
    const panelRect = panel.getBoundingClientRect();
    const gap = 8;
    const bubbleWidth = 320;

    // Right edge of bubble = left edge of panel - gap
    const right = window.innerWidth - panelRect.left + gap;
    // Top: align with the anchor card, but clamp to viewport
    const top = Math.max(8, Math.min(anchorRect.top, window.innerHeight - 400));
    const maxHeight = window.innerHeight - top - 16;

    setPos({ top, right, maxHeight });
  }, [anchorRef, panelRef]);

  // Close on outside click (ignore clicks on anchor and on the panel's role cards)
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (popoverRef.current?.contains(target)) return;
      if (anchorRef.current?.contains(target)) return;
      onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose, anchorRef]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  const handleJump = useCallback((msgId?: string) => {
    if (msgId && onJumpToMessage) {
      onJumpToMessage(msgId);
    }
  }, [onJumpToMessage]);

  const displayItems = history.slice(0, maxItems);

  const content = (
    <div ref={popoverRef} style={bubbleStyle(colors, pos)}>
      {/* Header with role avatar + name */}
      <div style={headerStyle(colors)}>
        <div style={headerAvatarStyle(accentColor)}>
          {roleName.charAt(0).toUpperCase()}
        </div>
        <span style={headerTitleStyle(colors)}>{roleName}</span>
        <span style={headerCountStyle(colors)}>{history.length}</span>
        <button style={closeBtnStyle(colors)} onClick={onClose}>✕</button>
      </div>

      {/* Chat-like history list */}
      <div style={listStyle}>
        {displayItems.length === 0 ? (
          <div style={emptyStyle(colors)}>{t.noHistory}</div>
        ) : displayItems.map((entry, i) => (
          <HistoryBubble
            key={`${entry.roundId}_${i}`}
            entry={entry}
            accentColor={accentColor}
            colors={colors}
            onJump={handleJump}
          />
        ))}
      </div>
    </div>
  );

  return createPortal(content, document.body);
};

// --- History Bubble (chat-like) ---

const HistoryBubble: React.FC<{
  entry: RoleRoundHistory;
  accentColor: string;
  colors: ColorPalette;
  onJump: (msgId?: string) => void;
}> = ({ entry, accentColor, colors, onJump }) => {
  const canJump = !!entry.messageId;
  const statusDot = entry.status === "error" ? colors.danger
    : entry.status === "stopped" ? colors.warning
    : colors.success;

  return (
    <div
      style={bubbleItemStyle(colors, canJump)}
      onClick={() => canJump && onJump(entry.messageId)}
    >
      {/* Status dot + timestamp row */}
      <div style={bubbleMetaRow}>
        <span style={{ width: 5, height: 5, borderRadius: "50%", background: statusDot, flexShrink: 0 }} />
        <span style={timeStyle(colors)}>{formatTime(entry.timestamp)}</span>
        {entry.status === "stopped" && <span style={stoppedBadge(colors)}>stopped</span>}
        {entry.status === "error" && <span style={errorBadge(colors)}>error</span>}
      </div>
      {/* Content preview */}
      <div style={bubbleContentStyle(colors)}>
        {entry.summary}
      </div>
    </div>
  );
};

// --- Helpers ---

function formatTime(iso: string): string {
  try {
    const d = new Date(iso);
    return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`;
  } catch {
    return iso.slice(0, 16);
  }
}

// --- Styles ---

const bubbleStyle = (colors: ColorPalette, pos: { top: number; right: number; maxHeight: number }): React.CSSProperties => ({
  position: "fixed",
  top: pos.top,
  right: pos.right,
  width: 320,
  maxHeight: pos.maxHeight,
  background: colors.surface,
  border: `1px solid ${colors.border}`,
  borderRadius: 8,
  boxShadow: "0 4px 20px rgba(0,0,0,0.25)",
  zIndex: 1000,
  display: "flex",
  flexDirection: "column",
  overflow: "hidden",
});

const headerStyle = (colors: ColorPalette): React.CSSProperties => ({
  display: "flex",
  alignItems: "center",
  gap: 6,
  padding: "8px 10px",
  borderBottom: `1px solid ${colors.border}`,
  flexShrink: 0,
});

const headerAvatarStyle = (color: string): React.CSSProperties => ({
  width: 20,
  height: 20,
  borderRadius: "50%",
  background: color,
  color: "#fff",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 10,
  fontWeight: 700,
  flexShrink: 0,
});

const headerTitleStyle = (colors: ColorPalette): React.CSSProperties => ({
  fontSize: 11,
  fontWeight: 600,
  color: colors.text,
  flex: 1,
});

const headerCountStyle = (colors: ColorPalette): React.CSSProperties => ({
  fontSize: 9,
  color: colors.textMuted,
  background: colors.border,
  borderRadius: 8,
  padding: "1px 5px",
});

const closeBtnStyle = (colors: ColorPalette): React.CSSProperties => ({
  background: "none",
  border: "none",
  color: colors.textMuted,
  fontSize: 11,
  cursor: "pointer",
  padding: "0 2px",
  lineHeight: 1,
});

const listStyle: React.CSSProperties = {
  overflowY: "auto",
  flex: 1,
  padding: "4px 0",
};

const bubbleItemStyle = (colors: ColorPalette, clickable: boolean): React.CSSProperties => ({
  padding: "6px 10px",
  cursor: clickable ? "pointer" : "default",
  borderBottom: `1px solid ${colors.border}`,
  transition: "background 0.1s",
});

const bubbleMetaRow: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 5,
  marginBottom: 3,
};

const timeStyle = (colors: ColorPalette): React.CSSProperties => ({
  fontSize: 9,
  color: colors.textMuted,
});

const stoppedBadge = (colors: ColorPalette): React.CSSProperties => ({
  fontSize: 8,
  color: colors.warning,
  background: `${colors.warning}18`,
  padding: "0 4px",
  borderRadius: 3,
});

const errorBadge = (colors: ColorPalette): React.CSSProperties => ({
  fontSize: 8,
  color: colors.danger,
  background: `${colors.danger}18`,
  padding: "0 4px",
  borderRadius: 3,
});

const bubbleContentStyle = (colors: ColorPalette): React.CSSProperties => ({
  fontSize: 11,
  color: colors.text,
  lineHeight: 1.5,
  display: "-webkit-box",
  WebkitLineClamp: 3,
  WebkitBoxOrient: "vertical",
  overflow: "hidden",
});

const emptyStyle = (colors: ColorPalette): React.CSSProperties => ({
  fontSize: 10,
  color: colors.textMuted,
  padding: "16px 10px",
  textAlign: "center",
});
