import React, { useRef, useEffect, useState, useCallback } from "react";
import type { CouncilMessage, RoleCard } from "@agora/shared";
import { RoleMessage } from "../RoleMessage/RoleMessage.js";
import { TextShimmer } from "../AgentTools/TextShimmer.js";
import { useI18n } from "../i18n/I18nContext.js";
import { useTheme } from "../theme/ThemeContext.js";
import type { ColorPalette } from "../theme/palettes.js";
import { layout, motion, radius, shadow, spacing, typography, zIndex } from "../theme/tokens.js";

interface CouncilRoomProps {
  messages: CouncilMessage[];
  roles?: RoleCard[];
  isLoading: boolean;
  loadingStatus?: string;
  onStop?: () => void;
  streamingRoleId?: string | null;
  /** Called by parent to get jump/highlight functions */
  onRegisterJumpFns?: (fns: { scrollToMessage: (id: string) => void; highlightMessage: (id: string, ms?: number) => void; scrollToBottom: () => void }) => void;
  /** Called when near-bottom state changes */
  onNearBottomChange?: (isNearBottom: boolean) => void;
  /** Called when new message count changes while scrolled up */
  onNewMsgCountChange?: (count: number) => void;
}

export const CouncilRoom: React.FC<CouncilRoomProps> = ({ messages, roles, isLoading, loadingStatus, onStop, streamingRoleId, onRegisterJumpFns, onNearBottomChange, onNewMsgCountChange }) => {
  const { t } = useI18n();
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const scrollRef = useRef<HTMLDivElement>(null);
  const highlightTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const [isNearBottom, setIsNearBottom] = useState(true);
  const [newMsgCount, setNewMsgCount] = useState(0);
  const prevCountRef = useRef(0);

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

  const scrollToBottom = useCallback(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    setNewMsgCount(0);
    setIsNearBottom(true);
  }, []);

  // Register jump functions with parent
  useEffect(() => {
    onRegisterJumpFns?.({ scrollToMessage, highlightMessage, scrollToBottom });
  }, [onRegisterJumpFns, scrollToMessage, highlightMessage, scrollToBottom]);

  // Notify parent of scroll state changes
  useEffect(() => { onNearBottomChange?.(isNearBottom); }, [isNearBottom, onNearBottomChange]);
  useEffect(() => { onNewMsgCountChange?.(newMsgCount); }, [newMsgCount, onNewMsgCountChange]);

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

  // Check actual scroll position when messages change (e.g. entering a room)
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
    setIsNearBottom(nearBottom);
  }, [messages]);

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

  return (
    <div className="thread" ref={scrollRef} onScroll={handleScroll}>
      <div className="thread-inner">
        {messages.length === 0 && !isLoading && (
          <div style={styles.empty}>{t.sendToStart}</div>
        )}
        {messages.map((msg) => {
          const isStreaming = streamingRoleId === msg.senderId || (msg.senderType === "moderator" && msg.content === "" && !!msg.thinking);
          const isUser = msg.senderType === "user";
          // Only user messages always expanded; moderator and role messages are collapsible
          const alwaysExpand = isUser;
          const isExpanded = alwaysExpand || expandedIds.has(msg.id);
          return (
            <div key={msg.id} id={isStreaming ? `streaming-${msg.senderId}` : undefined} data-message-id={msg.id}>
              <RoleMessage
                message={msg}
                roles={roles}
                streaming={isStreaming}
                expanded={isExpanded}
                onToggle={alwaysExpand ? undefined : () => handleToggle(msg.id)}
              />
            </div>
          );
        })}
        {isLoading && (
          <div style={styles.loadingRow}>
            <TextShimmer style={styles.loadingText} duration={2.5}>
              {loadingStatus || t.rolesAreThinking}
            </TextShimmer>
            {onStop && (
              <button style={styles.stopBtn} onClick={onStop}>{t.stop}</button>
            )}
          </div>
        )}
      </div>
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
    padding: `${spacing.lg}px ${spacing.xl}px`,
  },
  messageStack: {
    width: "100%",
    maxWidth: layout.maxChatWidth,
    margin: "0 auto",
    display: "flex",
    flexDirection: "column",
    gap: spacing.xs,
  },
  empty: {
    color: colors.textMuted,
    fontSize: typography.chatBody.size,
    textAlign: "center",
    padding: spacing.xxxl,
  },
  loadingRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.md,
    padding: spacing.md,
  },
  loadingText: {
    color: colors.accent,
    fontSize: typography.meta.size,
    fontStyle: "italic",
  },
  stopBtn: {
    background: colors.dangerBg,
    border: `1px solid ${colors.dangerBorder}`,
    borderRadius: radius.xs,
    padding: `${spacing.xxs}px ${spacing.md - 2}px`,
    fontSize: typography.meta.size,
    color: colors.danger,
    cursor: "pointer",
  },
  jumpBtn: {
    position: "absolute",
    bottom: spacing.lg,
    left: "50%",
    transform: "translateX(-50%)",
    background: colors.surface,
    color: colors.textMuted,
    border: `1px solid ${colors.border}`,
    borderRadius: "50%",
    width: 36,
    height: 36,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    boxShadow: shadow.popover,
    transition: `transform ${motion.fast}`,
    zIndex: zIndex.chat,
  },
  jumpBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    background: colors.accent,
    color: "#fff",
    fontSize: 10,
    fontWeight: 700,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "0 4px",
  },
});
