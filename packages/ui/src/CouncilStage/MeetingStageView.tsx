import React, { useCallback } from "react";
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
}

export const MeetingStageView: React.FC<MeetingStageViewProps> = ({
  roles,
  messages,
  focusedRoleId,
  onRoleFocus,
  lastUserMessage,
}) => {
  const handleSeatClick = useCallback((roleId: string) => {
    onRoleFocus?.(focusedRoleId === roleId ? null : roleId);
  }, [focusedRoleId, onRoleFocus]);

  const handleBackgroundClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onRoleFocus?.(null);
  }, [onRoleFocus]);

  // Find latest message per role
  const latestByRole = new Map<string, CouncilMessage>();
  for (const msg of messages) {
    if (msg.senderType === "role") latestByRole.set(msg.senderId, msg);
  }

  // Get moderator status from messages
  const modMessages = messages.filter(m => m.senderType === "moderator");
  const lastModMsg = modMessages[modMessages.length - 1];

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
      {/* Moderator Card */}
      <MissionCard
        label="Moderator · 任务导航"
        summary={lastModMsg?.content || "等待任务开始..."}
        status={lastModMsg ? "running" : "idle"}
      />

      {/* Role Seats */}
      <div style={{
        flex: 1,
        minHeight: 0,
        display: "grid",
        gridTemplateColumns: roles.length <= 4 ? "1fr 1fr" : "1fr 1fr",
        gridAutoRows: "min-content",
        gap: 8,
        alignContent: "start",
        overflow: "auto",
      }}>
        {roles.map(role => {
          const latest = latestByRole.get(role.id);
          return (
            <RoleSeat
              key={role.id}
              role={role}
              status={latest ? "speaking" : "idle"}
              liveBubble={latest?.content}
              focused={focusedRoleId === role.id}
              dimmed={focusedRoleId !== null && focusedRoleId !== role.id}
              onClick={() => handleSeatClick(role.id)}
            />
          );
        })}
      </div>

      {/* User Card */}
      <MissionCard
        avatar="你"
        label="Ezri · 任务起始"
        summary={lastUserMessage ? `"${truncate(lastUserMessage, 60)}"` : "发送消息开始议事"}
        status="user"
        isUser
      />
    </div>
  );
};

// ── Helpers ──

const MissionCard: React.FC<{
  avatar?: string;
  label: string;
  summary: string;
  status: "running" | "idle" | "user";
  isUser?: boolean;
}> = ({ avatar, label, summary, status, isUser }) => (
  <div style={{
    background: "rgba(255,255,255,.88)",
    border: "1px solid var(--line)",
    borderRadius: 15,
    padding: 10,
    display: "grid",
    gridTemplateColumns: "34px 1fr auto",
    gap: 9,
    alignItems: "start",
    boxShadow: "0 8px 24px rgba(0,0,0,.05)",
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
