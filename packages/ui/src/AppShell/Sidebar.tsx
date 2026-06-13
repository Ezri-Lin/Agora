import React, { useState, useCallback, useEffect } from "react";
import { SpiralLoader } from "../AgentTools/SpiralLoader.js";
import { usePanelRef } from "react-resizable-panels";

interface RoomEntry {
  id: string;
  title: string;
  createdAt: string;
  settings?: any;
}

interface SidebarProps {
  workspaceName: string;
  workspacePath?: string;
  rooms?: RoomEntry[];
  activeRoomId?: string | null;
  isLoading?: boolean;
  onNewRoom?: () => void;
  onSelectRoom?: (roomId: string) => void;
  onDeleteRoom?: (roomId: string) => void;
  onOpenContextGraph?: () => void;
  onOpenSettings?: () => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  workspaceName,
  workspacePath,
  rooms = [],
  activeRoomId,
  isLoading,
  onNewRoom,
  onSelectRoom,
  onDeleteRoom,
  onOpenContextGraph,
  onOpenSettings,
  collapsed,
  onToggleCollapse,
}) => {
  const [projectExpanded, setProjectExpanded] = useState(true);
  const sidebarRef = usePanelRef();

  useEffect(() => {
    if (!sidebarRef.current) return;
    if (sidebarRef.current.isCollapsed()) {
      sidebarRef.current.expand();
    }
  }, []);

  useEffect(() => {
    if (!sidebarRef.current) return;
    if (collapsed) sidebarRef.current.collapse();
    else sidebarRef.current.expand();
  }, [collapsed]);

  return {
    sidebarRef,
    content: (
      <>
        <header className="sidebar-topbar" style={{ display: "flex", alignItems: "center", height: "40px", paddingLeft: "80px", paddingRight: "8px", gap: "2px", flexShrink: 0, WebkitAppRegion: "drag" as any }}>
          <label className="tool" title="Toggle Sidebar" onClick={onToggleCollapse} style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "24px", height: "24px", cursor: "pointer", color: "var(--text-muted)", borderRadius: "4px", WebkitAppRegion: "no-drag" as any }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 15, height: 15 }}>
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <line x1="9" y1="3" x2="9" y2="21" />
            </svg>
          </label>
        </header>
        <aside className="sidebar" style={{ width: "100%", flex: 1, padding: "0 0 12px 0", overflowY: "auto" }}>
          <div className="side-actions" style={{ padding: "0 16px" }}>
            {onNewRoom && (
              <div className="side-action" onClick={onNewRoom} style={{ fontWeight: 600 }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path d="M12 5v14M5 12h14" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                New chat
              </div>
            )}
            <div className="side-action">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <circle cx="11" cy="11" r="7" strokeWidth="2" />
                <path d="m20 20-3.5-3.5" strokeWidth="2" strokeLinecap="round" />
              </svg>
              Search
            </div>
            {onOpenContextGraph && (
              <div className="side-action" onClick={onOpenContextGraph}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="3" />
                  <circle cx="5" cy="6" r="2" />
                  <circle cx="19" cy="6" r="2" />
                  <circle cx="5" cy="18" r="2" />
                  <circle cx="19" cy="18" r="2" />
                  <path d="M7 7l3 3M17 7l-3 3M7 17l3-3M17 17l-3-3" />
                </svg>
                Context Graph
              </div>
            )}
          </div>
          <div className="projects">
            <div className="side-label">Projects</div>
            <div
              onClick={() => setProjectExpanded(!projectExpanded)}
              style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 8px", cursor: "pointer", fontWeight: 600, fontSize: 13, color: "var(--text)", userSelect: "none" }}
              title={workspacePath || workspaceName}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" style={{ width: 16, height: 16, flexShrink: 0, opacity: 0.7 }}>
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{workspaceName}</span>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" style={{ width: 12, height: 12, flexShrink: 0, opacity: 0.4, transition: "transform 150ms", transform: projectExpanded ? "rotate(90deg)" : "rotate(0deg)" }}>
                <path d="M9 18l6-6-6-6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            {projectExpanded && (
              <div>
                {rooms.map((r) => (
                  <a
                    key={r.id}
                    className={`room-link ${r.id === activeRoomId ? "active" : ""}`}
                    onClick={() => onSelectRoom?.(r.id)}
                    style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 8px 4px 24px", fontSize: 13, color: r.id === activeRoomId ? "var(--text)" : "var(--text-muted)", borderRadius: 4, margin: "0 8px", cursor: "pointer" }}
                  >
                    <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.title || "Untitled Room"}</span>
                    {r.id === activeRoomId && isLoading && (
                      <SpiralLoader size={12} style={{ opacity: 0.5, color: "var(--text-muted)" }} />
                    )}
                    {onDeleteRoom && (
                      <span
                        className="room-delete"
                        onClick={e => { e.stopPropagation(); onDeleteRoom(r.id); }}
                        style={{ opacity: 0, cursor: "pointer", fontSize: 11, color: "var(--muted)", padding: "0 2px", flexShrink: 0 }}
                        title="Delete room"
                      >✕</span>
                    )}
                  </a>
                ))}
                {rooms.length === 0 && (
                  <div style={{ padding: "4px 16px", fontSize: 12, color: "var(--faint)", fontStyle: "italic" }}>
                    No chats yet
                  </div>
                )}
              </div>
            )}
          </div>
          <div className="side-bottom" style={{ marginTop: "auto" }}>
            <div className="settings" onClick={onOpenSettings} style={{ cursor: "pointer" }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx="12" cy="12" r="3" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Settings
            </div>
          </div>
        </aside>
      </>
    ),
  };
};
