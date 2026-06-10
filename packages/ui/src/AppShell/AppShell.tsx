import React, { useState, useEffect, useMemo } from "react";
import type { RoomMode } from "@agora/shared";
import { useI18n } from "../i18n/I18nContext.js";
import { useTheme } from "../theme/ThemeContext.js";
import type { ColorPalette } from "../theme/palettes.js";
import { RoomModeTabs } from "../RoomMode/RoomModeTabs.js";
import { TerminalPanel } from "../Terminal/TerminalPanel.js";
import type { AppView } from "./AppShell.types.js";

interface RoomEntry {
  id: string;
  title: string;
  createdAt: string;
  settings?: any;
}

interface AppShellProps {
  view?: AppView;
  onViewChange?: (view: AppView) => void;
  workspaceName: string;
  onOpenWorkspace: () => void;
  home?: React.ReactNode;
  contextGraph: React.ReactNode;
  main: React.ReactNode;
  document?: React.ReactNode;
  floatingPanel?: React.ReactNode;
  composer: React.ReactNode;
  onAddRef?: () => void;
  onOpenSettings?: () => void;
  rooms?: RoomEntry[];
  activeRoomId?: string | null;
  onSelectRoom?: (roomId: string) => void;
  onNewRoom?: () => void;
  panelVisible?: boolean;
  onTogglePanel?: () => void;
  roomMode?: RoomMode;
  onRoomModeChange?: (mode: RoomMode) => void;
  terminalVisible?: boolean;
  onToggleTerminal?: () => void;
  workspacePath?: string;
}

export const AppShell: React.FC<AppShellProps> = ({
  view = "room",
  onViewChange,
  workspaceName,
  onOpenWorkspace,
  home,
  contextGraph,
  main,
  document,
  floatingPanel,
  composer,
  onAddRef,
  onOpenSettings,
  rooms = [],
  activeRoomId,
  onSelectRoom,
  onNewRoom,
  panelVisible,
  onTogglePanel,
  roomMode,
  onRoomModeChange,
  terminalVisible,
  onToggleTerminal,
  workspacePath,
}) => {
  const { t } = useI18n();
  const { colors } = useTheme();
  
  const [isGraphVisible, setIsGraphVisible] = useState(true);
  const [isGraphMaximized, setIsGraphMaximized] = useState(false);

  // Ctrl+` toggles terminal
  useEffect(() => {
    if (!onToggleTerminal) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === "`") {
        e.preventDefault();
        onToggleTerminal();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onToggleTerminal]);

  const isDocsVisible = view === "document";

  const roomGridCols = useMemo(() => {
    if (isGraphMaximized) return "minmax(0, 1fr)";
    if (!isGraphVisible && !isDocsVisible) return "minmax(0, 1fr)";
    if (isGraphVisible && !isDocsVisible) return "34% 7px minmax(0, 1fr)";
    if (!isGraphVisible && isDocsVisible) return "minmax(0, 1fr) 7px minmax(360px, 35%)";
    return "minmax(240px, 26%) 7px minmax(0, 1fr) 7px minmax(360px, 35%)";
  }, [isGraphVisible, isDocsVisible, isGraphMaximized]);

  const showSidebar = view === "home" || !isGraphVisible;

  return (
    <div className="app-window" style={{ gridTemplateColumns: showSidebar ? "268px minmax(0, 1fr)" : "minmax(0, 1fr)" }}>
      <aside className="sidebar" style={{ display: showSidebar ? "flex" : "none" }}>
        <div className="side-top">
          <div className="brand">
            <div className="brand-mark">A</div>
            Agora
          </div>
          <div className="collapse">◫</div>
        </div>
        <div className="side-actions">
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
        </div>
        <div className="projects">
          <div className="side-label">PROJECTS</div>
          <div className="project-block">
            <div className="project-title" onClick={onOpenWorkspace} style={{ cursor: "pointer" }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" strokeWidth="2" />
              </svg>
              {workspaceName}
            </div>
            {rooms.map((r) => (
              <a
                key={r.id}
                className={`room-link ${r.id === activeRoomId ? "active" : ""}`}
                onClick={() => onSelectRoom?.(r.id)}
              >
                <span>{r.title || "Untitled Room"}</span>
              </a>
            ))}
          </div>
        </div>
        <div className="side-bottom">
          <div className="settings" onClick={onOpenSettings} style={{ cursor: "pointer" }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="12" cy="12" r="3" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Settings
          </div>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div className="crumb" style={{ display: view === "room" || view === "document" ? "none" : "block" }}>
            Last active project · {workspaceName}
          </div>
          <div className="room-title" style={{ display: view === "room" || view === "document" ? "flex" : "none" }}>
            <div className="room-title-actions">
              <label onClick={() => onViewChange?.("home")} title="Back to Home">
                <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
              </label>
              <label onClick={() => setIsGraphVisible(!isGraphVisible)} title={isGraphVisible ? "Hide Graph (Show Sidebar)" : "Show Graph"}>
                <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                  <line x1="9" y1="3" x2="9" y2="21" />
                  {isGraphVisible ? (
                    <path d="M14 8l-4 4 4 4" />
                  ) : (
                    <path d="M10 8l4 4-4 4" />
                  )}
                </svg>
              </label>
            </div>
            <span>{rooms.find(r => r.id === activeRoomId)?.title || "Room"}</span>
            <span className="hint">multi-role room</span>
          </div>
          <div className="top-tools" style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center" }}>
            <label className="tool tool-open" title="Open Workspace" onClick={onOpenWorkspace}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" style={{ width: 15, height: 15 }}>
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </label>
            <label className={`tool tool-terminal ${terminalVisible ? "active" : ""}`} title="Toggle Terminal" onClick={onToggleTerminal}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" style={{ width: 15, height: 15 }}>
                <path d="M4 17l6-6-6-6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M12 19h8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </label>
            <label className={`tool tool-docs ${isDocsVisible ? "active" : ""}`} title="Toggle Docs" onClick={() => onViewChange?.(isDocsVisible ? "room" : "document")}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" style={{ width: 15, height: 15 }}>
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M14 2v6h6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M16 13H8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M16 17H8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M10 9H8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </label>
          </div>
        </header>

        <section className="workspace">
          {view === "home" && home}
          
          {(view === "room" || view === "document") && (
            <section className="screen room-screen" style={{ display: "block" }}>
              <div className="room-shell" style={{ 
                display: "grid",
                gridTemplateColumns: roomGridCols,
                gridTemplateRows: terminalVisible && !isGraphMaximized ? "minmax(0, 1fr) auto" : "minmax(0, 1fr)"
              }}>
                {(isGraphVisible || isGraphMaximized) && (
                  <>
                    <aside className="room-graph-pane" style={{ display: isGraphMaximized ? "block" : undefined, gridRow: "1 / span 2", gridColumn: 1 }}>
                      <div className="room-graph-head">
                        <div className="eyebrow">Current Room Graph</div>
                        <h2>{rooms.find(r => r.id === activeRoomId)?.title || "Locked UI v1"}</h2>
                        <div className="sub">Context & Relationships</div>
                        <div className="graph-pane-actions">
                          {!isGraphMaximized ? (
                            <label className="icon-action maximize" title="Maximize graph" onClick={() => setIsGraphMaximized(true)}>⛶</label>
                          ) : (
                            <label className="icon-action restore" title="Restore split" onClick={() => setIsGraphMaximized(false)}>◫</label>
                          )}
                        </div>
                      </div>
                      {contextGraph}
                      <div className="mini-controls" style={{ bottom: "auto", top: 16 }}>
                        <div className="row"><span>Documents / backlinks</span><span className="tiny-pill">on</span></div>
                        <div className="row"><span>Rooms</span><span className="tiny-pill">off</span></div>
                        <div className="row"><span>Role links</span><span className="tiny-pill">subtle</span></div>
                        <div className="row"><span>Claims / memory</span><span className="tiny-pill">off</span></div>
                        <div className="row"><span>Density</span><span className="tiny-pill">Clean ▾</span></div>
                      </div>
                    </aside>
                    {!isGraphMaximized && <div className="split-handle graph-chat" style={{ gridRow: "1 / span 2", gridColumn: 2 }}></div>}
                  </>
                )}
                
                {!isGraphMaximized && (
                  <section className="chat-panel" style={{ gridRow: "1", gridColumn: isGraphVisible ? 3 : 1 }}>
                    <div className="room-header-card">
                      <span className="room-name">{rooms.find(r => r.id === activeRoomId)?.title || "Room"}</span>
                      <span className="hint" style={{ marginLeft: 8 }}>multi-role room</span>
                      <div className="header-actions">
                        <label className={`small-btn ${panelVisible ? "active" : ""}`} onClick={onTogglePanel}>Inspector</label>
                      </div>
                    </div>

                    <div className="thread">
                      {main}
                    </div>

                    {floatingPanel}
                    <div className="chat-composer-wrap" style={{ borderTop: "none", background: "transparent", padding: "0 18px 24px" }}>
                      {composer}
                    </div>
                  </section>
                )}
                
                {!isGraphMaximized && isDocsVisible && (
                  <>
                    <div className="split-handle chat-docs" style={{ display: "block", gridRow: "1", gridColumn: isGraphVisible ? 4 : 2 }}></div>
                    <div style={{ gridRow: "1", gridColumn: isGraphVisible ? 5 : 3, display: "flex", flex: 1, minWidth: 0, minHeight: 0 }}>
                      {document}
                    </div>
                  </>
                )}

                {terminalVisible && !isGraphMaximized && (
                  <div style={{ 
                    gridRow: 2, 
                    gridColumn: isGraphVisible ? "3 / -1" : "1 / -1",
                    position: "relative" 
                  }}>
                    <TerminalPanel
                      visible={terminalVisible}
                      workspacePath={workspacePath}
                      onClose={onToggleTerminal ?? (() => {})}
                    />
                  </div>
                )}
              </div>
            </section>
          )}
        </section>
      </main>
    </div>
  );
};
