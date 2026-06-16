import React, { useCallback, useRef, useState, useLayoutEffect } from "react";
import { RoleSeat } from "./RoleSeat.js";

interface RoleCard {
  id: string;
  name: string;
  shortName?: string;
  label?: string;
  avatar?: string;
}

interface CouncilMessage {
  id: string;
  senderId: string;
  senderType: string;
  content: string;
  timestamp?: string;
}

interface MeetingStageViewProps {
  roles: RoleCard[];
  messages: CouncilMessage[];
  focusedRoleId?: string | null;
  onRoleFocus?: (roleId: string | null) => void;
  lastUserMessage?: string;
  pausedRoleIds?: string[];
  removedRoleIds?: string[];
  excludedRoleIds?: string[];
  onTogglePause?: (roleId: string) => void;
  onToggleRemove?: (roleId: string) => void;
  onAddExcluded?: (roleId: string) => void;
}

const CARD_W = 120;
const GAP_X = 12;
const MAX_TILES = 10;
const OVERFLOW_THRESHOLD = 420;

function getColumns(width: number): number {
  return width >= OVERFLOW_THRESHOLD ? 3 : 2;
}

function getVisibleRoles(roles: RoleCard[]): { visible: RoleCard[]; moreCount: number } {
  if (roles.length <= MAX_TILES) return { visible: roles, moreCount: 0 };
  return { visible: roles.slice(0, MAX_TILES - 1), moreCount: roles.length - (MAX_TILES - 1) };
}

export const MeetingStageView: React.FC<MeetingStageViewProps> = ({
  roles,
  messages,
  focusedRoleId,
  onRoleFocus,
  lastUserMessage,
  pausedRoleIds,
  removedRoleIds,
  excludedRoleIds,
  onTogglePause,
  onToggleRemove,
  onAddExcluded,
}) => {
  const gridRef = useRef<HTMLDivElement>(null);
  const [stageWidth, setStageWidth] = useState(360);

  useLayoutEffect(() => {
    const el = gridRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      setStageWidth(entry.contentRect.width);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const handleSeatClick = useCallback((roleId: string) => {
    onRoleFocus?.(focusedRoleId === roleId ? null : roleId);
  }, [focusedRoleId, onRoleFocus]);

  const modFocused = focusedRoleId === "moderator";
  const anyFocused = focusedRoleId !== null;

  const handleBackgroundClick = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest("[data-card]")) return;
    onRoleFocus?.(null);
  }, [onRoleFocus]);

  // Latest message per role
  const latestByRole = new Map<string, CouncilMessage>();
  for (const msg of messages) {
    if (msg.senderType === "role") latestByRole.set(msg.senderId, msg);
  }

  // Moderator messages
  const modMessages = messages.filter(m => m.senderType === "moderator");
  const lastModMsg = modMessages[modMessages.length - 1];

  const columns = getColumns(stageWidth);
  const { visible, moreCount } = getVisibleRoles(roles);

  return (
    <div
      onClick={handleBackgroundClick}
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        padding: "10px",
        gap: 10,
        overflow: "hidden",
      }}
    >
      {/* Moderator — fixed top */}
      <div data-card onClick={() => handleSeatClick("moderator")} style={{ cursor: "pointer" }}>
        <MissionCard
          label="Moderator · 任务导航"
          summary={lastModMsg?.content || "等待任务开始..."}
          status={lastModMsg ? "running" : "idle"}
          focused={modFocused}
          dimmed={anyFocused && !modFocused}
        />
      </div>

      {/* Role Grid — centered, fixed cards, no scroll */}
      <div
        ref={gridRef}
        style={{
          flex: 1,
          minHeight: 0,
          display: "grid",
          gridTemplateColumns: `repeat(${columns}, ${CARD_W}px)`,
          gridAutoRows: 70,
          gap: `10px ${GAP_X}px`,
          justifyContent: "center",
          alignContent: "center",
          overflow: "hidden",
        }}
      >
        {visible.map(role => {
          const latest = latestByRole.get(role.id);
          const isRemoved = removedRoleIds?.includes(role.id) ?? false;
          const isPaused = pausedRoleIds?.includes(role.id) ?? false;
          const isExcluded = excludedRoleIds?.includes(role.id) ?? false;
          return (
            <RoleSeat
              key={role.id}
              role={role}
              status={latest ? "speaking" : "idle"}
              liveBubble={latest?.content}
              focused={focusedRoleId === role.id}
              dimmed={focusedRoleId !== null && focusedRoleId !== role.id}
              paused={isPaused}
              removed={isRemoved}
              excluded={isExcluded}
              onClick={() => handleSeatClick(role.id)}
              onTogglePause={onTogglePause ? () => onTogglePause(role.id) : undefined}
              onToggleRemove={onToggleRemove ? () => onToggleRemove(role.id) : undefined}
              onAddExcluded={onAddExcluded ? () => onAddExcluded(role.id) : undefined}
            />
          );
        })}
        {moreCount > 0 && <MoreTile count={moreCount} />}
      </div>

      {/* User — fixed bottom */}
      <div data-card onClick={() => handleSeatClick("user")} style={{ cursor: "pointer" }}>
        <MissionCard
          avatar="你"
          label="Ezri · 任务起始"
          summary={lastUserMessage ? `"${truncate(lastUserMessage, 60)}"` : "发送消息开始议事"}
          status="user"
          isUser
          focused={focusedRoleId === "user"}
          dimmed={anyFocused && focusedRoleId !== "user"}
        />
      </div>
    </div>
  );
};

// ── Sub-components ──

const MoreTile: React.FC<{ count: number }> = ({ count }) => (
  <div
    data-card
    style={{
      width: CARD_W,
      height: 70,
      border: "1px dashed #ccc",
      borderRadius: 14,
      display: "grid",
      placeItems: "center",
      fontSize: 12,
      color: "var(--muted)",
      background: "rgba(255,255,255,.5)",
      cursor: "default",
    }}
  >
    +{count} ···
  </div>
);

const MissionCard: React.FC<{
  avatar?: string;
  label: string;
  summary: string;
  status: "running" | "idle" | "user";
  isUser?: boolean;
  focused?: boolean;
  dimmed?: boolean;
}> = ({ avatar, label, summary, status, isUser, focused, dimmed }) => (
  <div style={{
    background: focused ? "#fff" : "rgba(255,255,255,.88)",
    border: `1px solid ${focused ? "#111" : "var(--line)"}`,
    borderRadius: 15,
    padding: 10,
    display: "grid",
    gridTemplateColumns: "34px 1fr auto",
    gap: 9,
    alignItems: "start",
    boxShadow: focused
      ? "0 0 0 2px #111, 0 16px 48px rgba(0,0,0,.12)"
      : "0 8px 24px rgba(0,0,0,.05)",
    opacity: dimmed ? 0.18 : 1,
    filter: dimmed ? "blur(1px)" : "none",
    transition: "opacity .18s ease, filter .18s ease, box-shadow .16s ease, border-color .16s ease",
    flexShrink: 0,
  }}>
    <div style={{
      width: 30,
      height: 30,
      borderRadius: "50%",
      background: isUser ? "#fff" : "#111",
      color: isUser ? "#111" : "#fff",
      display: "grid",
      placeItems: "center",
      fontWeight: 800,
      fontSize: 10,
      border: isUser ? "1px solid var(--line)" : "none",
      position: "relative",
    }}>
      {avatar || (isUser ? "你" : "M")}
      {status === "running" && <ThinkingRing />}
    </div>
    <div>
      <div style={{ fontSize: 12, fontWeight: 600 }}>{label}</div>
      <div style={{ fontSize: 11, color: "var(--soft)", lineHeight: 1.45, marginTop: 3 }}>
        {truncate(summary, 80)}
      </div>
    </div>
    <Tag status={status} />
  </div>
);

const Tag: React.FC<{ status: string }> = ({ status }) => (
  <span style={{
    fontSize: 10,
    color: "var(--muted)",
    border: "1px solid #e9e9e4",
    background: "#fbfbf9",
    borderRadius: 999,
    padding: "2px 6px",
    whiteSpace: "nowrap",
  }}>
    {status === "running" ? "running" : status === "user" ? "user" : "idle"}
  </span>
);

const ThinkingRing: React.FC = () => (
  <div style={{
    position: "absolute",
    inset: -3,
    border: "2px solid transparent",
    borderTopColor: "#111",
    borderRadius: "50%",
    animation: "stage-spin 1s linear infinite",
  }} />
);

function truncate(s: string, max: number): string {
  return s.length > max ? s.slice(0, max) + "..." : s;
}
