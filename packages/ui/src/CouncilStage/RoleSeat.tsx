import React, { useState } from "react";

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
  onStop?: () => void;
  onRemove?: () => void;
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
  onStop,
  onRemove,
}) => {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      data-card
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
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
        position: "relative",
      }}
    >
      {/* Hover action buttons */}
      {hovered && (onStop || onRemove) && (
        <div style={{
          position: "absolute",
          top: 4,
          right: 4,
          display: "flex",
          gap: 3,
          zIndex: 2,
        }}>
          {onStop && (
            <HoverBtn title="暂停" onClick={(e) => { e.stopPropagation(); onStop(); }}>
              <svg viewBox="0 0 16 16" fill="currentColor" style={{ width: 9, height: 9 }}>
                <rect x="3" y="2" width="4" height="12" rx="1" />
                <rect x="9" y="2" width="4" height="12" rx="1" />
              </svg>
            </HoverBtn>
          )}
          {onRemove && (
            <HoverBtn title="移除" onClick={(e) => { e.stopPropagation(); onRemove(); }}>
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ width: 9, height: 9 }}>
                <path d="M4 4l8 8M12 4l-8 8" />
              </svg>
            </HoverBtn>
          )}
        </div>
      )}

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
};

const HoverBtn: React.FC<{ title: string; onClick: (e: React.MouseEvent) => void; children: React.ReactNode }> = ({ title, onClick, children }) => (
  <button
    title={title}
    onClick={onClick}
    style={{
      width: 18,
      height: 18,
      borderRadius: 4,
      border: "1px solid var(--line)",
      background: "rgba(255,255,255,.92)",
      display: "grid",
      placeItems: "center",
      cursor: "pointer",
      color: "var(--muted)",
      padding: 0,
      transition: "background .12s, color .12s",
    }}
    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "#f1f1ef"; (e.currentTarget as HTMLElement).style.color = "#111"; }}
    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,.92)"; (e.currentTarget as HTMLElement).style.color = "var(--muted)"; }}
  >
    {children}
  </button>
);

const RoleAvatar: React.FC<{ name: string; avatar?: string; status: string }> = ({ name, avatar, status }) => {
  const initials = getInitials(avatar || name);
  const thinking = status === "thinking";
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
      {thinking && (
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
