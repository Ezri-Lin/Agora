import React from "react";

interface RoleCard {
  id: string;
  name: string;
  shortName?: string;
  label?: string;
  avatar?: string;
}

export interface RoleSeatProps {
  role: RoleCard;
  status: "thinking" | "speaking" | "done" | "idle" | "paused";
  liveBubble?: string;
  focused?: boolean;
  dimmed?: boolean;
  onClick?: () => void;
}

const CARD_W = 120;
const CARD_H = 70;

export const RoleSeat: React.FC<RoleSeatProps> = ({
  role,
  status,
  liveBubble,
  focused,
  dimmed,
  onClick,
}) => (
  <div
    data-card
    onClick={onClick}
    style={{
      width: CARD_W,
      height: CARD_H,
      border: `1px solid ${focused ? "#111" : "var(--line)"}`,
      background: focused ? "#fff" : "rgba(255,255,255,.9)",
      borderRadius: 14,
      padding: "8px 9px",
      cursor: "pointer",
      boxShadow: focused
        ? "0 0 0 2px #111, 0 16px 48px rgba(0,0,0,.12)"
        : "0 4px 16px rgba(0,0,0,.035)",
      opacity: dimmed ? 0.18 : 1,
      filter: dimmed ? "blur(1px)" : "none",
      transition: "opacity .18s ease, filter .18s ease, box-shadow .16s ease, border-color .16s ease",
      willChange: "opacity, filter",
      display: "flex",
      flexDirection: "column",
      justifyContent: "space-between",
      overflow: "hidden",
      flexShrink: 0,
    }}
  >
    {/* Top row: avatar + name */}
    <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
      <RoleAvatar name={role.name} avatar={role.avatar} status={status} />
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{
          fontSize: 11,
          fontWeight: 600,
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}>
          {role.shortName || role.name}
        </div>
        {role.label && (
          <div style={{
            fontSize: 9,
            color: "var(--muted)",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}>
            {role.label}
          </div>
        )}
      </div>
    </div>

    {/* Bottom: micro summary */}
    <div style={{
      fontSize: 10,
      color: "#666",
      lineHeight: 1.2,
      whiteSpace: "nowrap",
      overflow: "hidden",
      textOverflow: "ellipsis",
    }}>
      {liveBubble ? truncate(liveBubble, 12) : (status === "thinking" ? "思考中..." : "等待发言")}
    </div>
  </div>
);

const RoleAvatar: React.FC<{ name: string; avatar?: string; status: string }> = ({ name, avatar, status }) => {
  const initials = getInitials(avatar || name);
  return (
    <div style={{
      width: 22,
      height: 22,
      borderRadius: "50%",
      background: "#111",
      color: "#fff",
      display: "grid",
      placeItems: "center",
      fontWeight: 800,
      fontSize: 8,
      flexShrink: 0,
      position: "relative",
    }}>
      {initials}
      {status === "thinking" && (
        <div style={{
          position: "absolute",
          inset: -2,
          border: "1.5px solid transparent",
          borderTopColor: "#111",
          borderRadius: "50%",
          animation: "stage-spin 1s linear infinite",
        }} />
      )}
    </div>
  );
};

function getInitials(name: string): string {
  const parts = name.split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function truncate(s: string, max: number): string {
  return s.length > max ? s.slice(0, max) + "..." : s;
}
