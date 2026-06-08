import React, { useRef, useEffect, useState, useCallback } from "react";
import type { CouncilMessage } from "@agora/shared";
import { RoleMessage } from "../RoleMessage/RoleMessage.js";
import { useI18n } from "../i18n/I18nContext.js";
import { useTheme } from "../theme/ThemeContext.js";
import type { ColorPalette } from "../theme/palettes.js";

interface CouncilRoomProps {
  messages: CouncilMessage[];
  isLoading: boolean;
  loadingStatus?: string;
  onStop?: () => void;
  streamingRoleId?: string | null;
  /** Called by parent to get jump/highlight functions */
  onRegisterJumpFns?: (fns: { scrollToMessage: (id: string) => void; highlightMessage: (id: string, ms?: number) => void }) => void;
}

export const CouncilRoom: React.FC<CouncilRoomProps> = ({ messages, isLoading, loadingStatus, onStop, streamingRoleId, onRegisterJumpFns }) => {
  const { t } = useI18n();
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const scrollRef = useRef<HTMLDivElement>(null);
  const highlightTimerRef = useRef<ReturnType<typeof setTimeout>>();

  // Jump-to-message support
  const scrollToMessage = useCallback((messageId: string) => {
    const el = scrollRef.current?.querySelector(`[data-message-id="${messageId}"]`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, []);

  const highlightMessage = useCallback((messageId: string, ms = 1800) => {
    const el = scrollRef.current?.querySelector(`[data-message-id="${messageId}"]`) as HTMLElement | null;
    if (!el) return;
    el.style.transition = "background 0.2s";
    el.style.background = `${colors.accent}22`;
    clearTimeout(highlightTimerRef.current);
    highlightTimerRef.current = setTimeout(() => {
      el.style.background = "";
    }, ms);
  }, [colors.accent]);

  // Register jump functions with parent
  useEffect(() => {
    onRegisterJumpFns?.({ scrollToMessage, highlightMessage });
  }, [onRegisterJumpFns, scrollToMessage, highlightMessage]);
  const [isNearBottom, setIsNearBottom] = useState(true);
  const [newMsgCount, setNewMsgCount] = useState(0);
  const prevCountRef = useRef(0);

  // Expansion management: expanded message IDs
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  // Auto-expand streaming role message
  useEffect(() => {
    if (!streamingRoleId) return;
    const streamingMsg = messages.find((m) => m.senderId === streamingRoleId && m.senderType === "role");
    if (!streamingMsg) return;
    setExpandedIds((prev) => {
      if (prev.has(streamingMsg.id)) return prev;
      const next = new Set(prev);
      next.add(streamingMsg.id);
      return next;
    });
  }, [streamingRoleId, messages]);

  const handleToggle = useCallback((msgId: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(msgId)) {
        next.delete(msgId);
      } else {
        next.add(msgId);
      }
      return next;
    });
  }, []);

  // Track whether user is near bottom
  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
    setIsNearBottom(nearBottom);
    if (nearBottom) setNewMsgCount(0);
  };

  // Count new messages when user is scrolled up
  useEffect(() => {
    const roleMsgs = messages.filter((m) => m.senderType === "role" || m.senderType === "moderator");
    const newCount = roleMsgs.length - prevCountRef.current;
    if (newCount > 0 && !isNearBottom) {
      setNewMsgCount((c) => c + newCount);
    }
    prevCountRef.current = roleMsgs.length;
  }, [messages, isNearBottom]);

  // Auto-scroll streaming role into view (but don't force to bottom)
  useEffect(() => {
    if (!streamingRoleId || !isNearBottom) return;
    const el = document.getElementById(`streaming-${streamingRoleId}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [streamingRoleId, messages, isNearBottom]);

  const jumpToLatest = () => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    setNewMsgCount(0);
    setIsNearBottom(true);
  };

  return (
    <div style={styles.container}>
      <div ref={scrollRef} style={styles.messages} onScroll={handleScroll}>
        {messages.length === 0 && !isLoading && (
          <div style={styles.empty}>{t.sendToStart}</div>
        )}
        {messages.map((msg) => {
          const isStreaming = streamingRoleId === msg.senderId;
          const isUser = msg.senderType === "user";
          // Only user messages always expanded; moderator and role messages are collapsible
          const alwaysExpand = isUser;
          const isExpanded = alwaysExpand || expandedIds.has(msg.id);
          return (
            <div key={msg.id} id={isStreaming ? `streaming-${msg.senderId}` : undefined} data-message-id={msg.id}>
              <RoleMessage
                message={msg}
                streaming={isStreaming}
                expanded={isExpanded}
                onToggle={alwaysExpand ? undefined : () => handleToggle(msg.id)}
              />
            </div>
          );
        })}
        {isLoading && (
          <div style={styles.loadingRow}>
            <span style={styles.loadingText}>{loadingStatus || t.rolesAreThinking}</span>
            {onStop && (
              <button style={styles.stopBtn} onClick={onStop}>{t.stop}</button>
            )}
          </div>
        )}
      </div>
      {!isNearBottom && newMsgCount > 0 && (
        <button style={styles.jumpBtn} onClick={jumpToLatest}>
          {t.jumpToLatest} ({newMsgCount})
        </button>
      )}
    </div>
  );
};

const createStyles = (colors: ColorPalette): Record<string, React.CSSProperties> => ({
  container: {
    display: "flex",
    flexDirection: "column",
    height: "100%",
    background: colors.bg,
    position: "relative",
  },
  messages: {
    flex: 1,
    overflowY: "auto",
    padding: "8px 16px",
  },
  empty: {
    color: colors.textMuted,
    fontSize: 13,
    textAlign: "center",
    padding: 40,
  },
  loadingRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    padding: 12,
  },
  loadingText: {
    color: colors.accent,
    fontSize: 12,
    fontStyle: "italic",
  },
  stopBtn: {
    background: colors.dangerBg,
    border: `1px solid ${colors.dangerBorder}`,
    borderRadius: 4,
    padding: "2px 10px",
    fontSize: 11,
    color: colors.danger,
    cursor: "pointer",
  },
  jumpBtn: {
    position: "absolute",
    bottom: 16,
    left: "50%",
    transform: "translateX(-50%)",
    background: colors.accent,
    color: "#fff",
    border: "none",
    borderRadius: 20,
    padding: "6px 16px",
    fontSize: 12,
    fontWeight: 600,
    cursor: "pointer",
    boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
    zIndex: 10,
    whiteSpace: "nowrap",
  },
});
