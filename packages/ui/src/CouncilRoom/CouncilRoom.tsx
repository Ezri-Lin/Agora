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
}

const MAX_MANUAL_EXPANDED = 3;

export const CouncilRoom: React.FC<CouncilRoomProps> = ({ messages, isLoading, loadingStatus, onStop, streamingRoleId }) => {
  const { t } = useI18n();
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isNearBottom, setIsNearBottom] = useState(true);
  const [newMsgCount, setNewMsgCount] = useState(0);
  const prevCountRef = useRef(0);

  // Expansion management
  const [manualExpanded, setManualExpanded] = useState<Set<string>>(new Set());
  const [manualCollapsed, setManualCollapsed] = useState<Set<string>>(new Set());
  const autoCollapseTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  // Auto-expand streaming role, auto-collapse after done
  useEffect(() => {
    if (!streamingRoleId) return;
    // Find the message for this role
    const streamingMsg = messages.find((m) => m.senderId === streamingRoleId && m.senderType === "role");
    if (!streamingMsg) return;

    // Auto-expand: add to manual expanded so it shows
    setManualExpanded((prev) => {
      if (prev.has(streamingMsg.id)) return prev;
      const next = new Set(prev);
      next.add(streamingMsg.id);
      return next;
    });
    // Remove from collapsed if it was there
    setManualCollapsed((prev) => {
      if (!prev.has(streamingMsg.id)) return prev;
      const next = new Set(prev);
      next.delete(streamingMsg.id);
      return next;
    });
  }, [streamingRoleId, messages]);

  // When streaming ends (streamingRoleId becomes null), schedule auto-collapse
  useEffect(() => {
    if (streamingRoleId) return;
    // Find recently done roles (messages with content that were being streamed)
    // We collapse them after 5s unless user interacted
    const timer = setTimeout(() => {
      // Clear auto-expanded messages that user didn't manually interact with
      setManualExpanded((prev) => {
        if (prev.size <= 1) return prev;
        // Keep only the most recent manually expanded
        const arr = [...prev];
        // Remove all except user/moderator messages and the latest role
        const roleMsgs = arr.filter((id) => {
          const msg = messages.find((m) => m.id === id);
          return msg?.senderType === "role";
        });
        if (roleMsgs.length <= 1) return prev;
        const toRemove = roleMsgs.slice(0, -1);
        const next = new Set(prev);
        for (const id of toRemove) {
          if (!manualCollapsed.has(id)) {
            // Only remove if it was auto-expanded (not manually toggled)
            // For simplicity, remove older role expansions
            next.delete(id);
          }
        }
        return next;
      });
    }, 5000);
    return () => clearTimeout(timer);
  }, [streamingRoleId, messages, manualCollapsed]);

  const handleToggle = useCallback((msgId: string) => {
    setManualExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(msgId)) {
        next.delete(msgId);
        setManualCollapsed((c) => {
          const nc = new Set(c);
          nc.add(msgId);
          return nc;
        });
      } else {
        // Enforce max manual expanded
        if (next.size >= MAX_MANUAL_EXPANDED) {
          // Remove the oldest expanded (first in set)
          const first = next.values().next().value;
          if (first) next.delete(first);
        }
        next.add(msgId);
        setManualCollapsed((c) => {
          if (!c.has(msgId)) return c;
          const nc = new Set(c);
          nc.delete(msgId);
          return nc;
        });
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
          const isModerator = msg.senderType === "moderator";
          // User and moderator always expanded
          const alwaysExpand = isUser || isModerator;
          const isExpanded = alwaysExpand || manualExpanded.has(msg.id);
          return (
            <div key={msg.id} id={isStreaming ? `streaming-${msg.senderId}` : undefined}>
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
