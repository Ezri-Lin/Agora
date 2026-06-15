import React from "react";

interface RoleCard {
  id: string;
  name: string;
  shortName?: string;
  label?: string;
  avatar?: string;
}

interface RoleSeatProps {
  role: RoleCard;
  status: "thinking" | "speaking" | "done" | "idle" | "paused";
  liveBubble?: string;
  focused?: boolean;
  dimmed?: boolean;
  onClick?: () => void;
}

export const RoleSeat: React.FC<RoleSeatProps> = ({
  role,
  status,
  liveBubble,
  focused,
  dimmed,
  onClick,
}) => (
  <div
    onClick={onClick}
    style={{
      border: `1px solid ${focused ? "#111" : "var(--line)"}`,
      background: focused ? "#fff" : "rgba(255,255,255,.9)",
      borderRadius: 15,
      padding: 7,
      cursor: "pointer",
      boxShadow: focused
        ? "0 0 0 2px #111, 0 16px 48px rgba(0,0,0,.12)"
        : "0 4px 16px rgba(0,0,0,.035)",
      opacity: dimmed ? 0.18 : 1,
      filter: dimmed ? "blur(1px)" : "none",
      transition: "opacity .18s ease, filter .18s ease, box-shadow .16s ease, border-color .16s ease",
      willChange: "opacity, filter",
    }}
  >
    <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
      <RoleAvatar name={role.name} avatar={role.avatar} status={status} />
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 11, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {role.shortName || role.name}
        </div>
        {role.label && (
          <div style={{ fontSize: 10, color: "var(--muted)" }}>{role.label}</div>
        )}
      </div>
    </div>
    {liveBubble && (
      <div style={{
        marginTop: 6,
        background: "#f9f9f7",
        border: "1px solid #e8e8e3",
        borderRadius: 10,
        padding: "6px 7px",
        fontSize: 10.5,
        color: "#343430",
        lineHeight: 1.32,
        overflow: "hidden",
        display: "-webkit-box",
        WebkitLineClamp: 2,
        WebkitBoxOrient: "vertical",
      }}>
        {truncate(liveBubble, 80)}
      </div>
    )}
  </div>
);

const RoleAvatar: React.FC<{ name: string; avatar?: string; status: string }> = ({ name, avatar, status }) => {
  const initials = getInitials(avatar || name);
  return (
    <div style={{
      width: 30,
      height: 30,
      borderRadius: "50%",
      background: "#111",
      color: "#fff",
      display: "grid",
      placeItems: "center",
      fontWeight: 800,
      fontSize: 10,
      flexShrink: 0,
      position: "relative",
    }}>
      {initials}
      {status === "thinking" && (
        <div style={{
          position: "absolute",
          inset: -3,
          border: "2px solid transparent",
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
