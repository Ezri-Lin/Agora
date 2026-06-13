import React, { useCallback, useEffect, useRef, useState } from "react";
import { Panel, Group as PanelGroup, Separator as PanelResizeHandle, usePanelRef } from "react-resizable-panels";
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
  contextGraph?: React.ReactNode;
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
  roomMode?: string;
  onRoomModeChange?: (mode: any) => void;
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
  main,
  document,
  floatingPanel,
  composer,
  onOpenSettings,
  rooms = [],
  activeRoomId,
  onSelectRoom,
  onNewRoom,
  panelVisible,
  onTogglePanel,
  terminalVisible,
  onToggleTerminal,
  workspacePath,
}) => {
  const isDocsVisible = view === "document";
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Panel refs for imperative collapse/expand
  const sidebarRef = usePanelRef();
  const docsHandle = useRef<any>(null);
  const terminalHandle = useRef<any>(null);

  // Collapse panels on mount (deferred so group is registered first)
  const onDocsPanelRef = useCallback((handle: any) => {
    docsHandle.current = handle;
    if (handle) requestAnimationFrame(() => handle.collapse());
  }, []);
  const onTerminalPanelRef = useCallback((handle: any) => {
    terminalHandle.current = handle;
    if (handle) requestAnimationFrame(() => handle.collapse());
  }, []);

  // Sidebar: starts expanded, collapse/expand on toggle
  useEffect(() => {
    if (!sidebarRef.current) return;
    if (sidebarRef.current.isCollapsed()) {
      sidebarRef.current.expand();
    }
  }, []);
  useEffect(() => {
    if (!sidebarRef.current) return;
    if (sidebarCollapsed) {
      sidebarRef.current.collapse();
    } else {
      sidebarRef.current.expand();
    }
  }, [sidebarCollapsed]);

  // Docs: expand/collapse on toggle
  useEffect(() => {
    if (!docsHandle.current) return;
    if (isDocsVisible) docsHandle.current.expand();
    else docsHandle.current.collapse();
  }, [isDocsVisible]);

  // Terminal: expand/collapse on toggle
  useEffect(() => {
    if (!terminalHandle.current) return;
    if (terminalVisible) terminalHandle.current.expand();
    else terminalHandle.current.collapse();
  }, [terminalVisible]);

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

  return (
    <div className="app-layout" style={{ display: "flex", flexDirection: "column", height: "100vh", width: "100vw", background: "var(--bg-app)" }}>
      {/* ── App Body ── */}
      <PanelGroup id="agora-main" orientation="horizontal" className="app-window" style={{ flex: 1, overflow: "hidden", minHeight: 0 }}>
        {/* Left Sidebar */}
        <Panel
          id="sidebar"
          panelRef={sidebarRef}
          defaultSize="15%"
          minSize="10%"
          collapsedSize="0%"
          collapsible
          className="sidebar-panel"
          style={{ display: "flex", flexDirection: "column", overflow: "hidden" }}
        >
          <header className="sidebar-topbar" style={{ display: "flex", alignItems: "center", height: "40px", paddingLeft: "80px", paddingRight: "16px", flexShrink: 0, WebkitAppRegion: "drag" as any }}>
            <label className="tool" title="Toggle Sidebar" onClick={() => setSidebarCollapsed(!sidebarCollapsed)} style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "24px", height: "24px", cursor: "pointer", color: "var(--text-muted)", borderRadius: "4px", WebkitAppRegion: "no-drag" as any }}>
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
            </div>
            <div className="projects">
              <div className="side-label">PROJECTS</div>
              <div className="project-block">
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
        </Panel>
        <PanelResizeHandle className="resize-handle" />

        {/* Main Area */}
        <Panel id="main" defaultSize="85%" minSize="20%">
          <main className="main" style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column" }}>
            <header className="main-topbar" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", height: "40px", padding: "0 16px", paddingLeft: sidebarCollapsed ? "80px" : "16px", flexShrink: 0, WebkitAppRegion: "drag" as any }}>
              <div className="main-topbar-left" style={{ display: "flex", alignItems: "center", gap: "8px", WebkitAppRegion: "no-drag" as any }}>
                {/* Collapse Button (only if sidebar is collapsed) */}
                {sidebarCollapsed && (
                  <label className="tool" title="Toggle Sidebar" onClick={() => setSidebarCollapsed(!sidebarCollapsed)} style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "24px", height: "24px", cursor: "pointer", color: "var(--text-muted)", borderRadius: "4px" }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 15, height: 15 }}>
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                      <line x1="9" y1="3" x2="9" y2="21" />
                    </svg>
                  </label>
                )}

                {/* Back Button */}
                {(view === "room" || view === "document") && (
                  <label className="tool" title="Back to Home" onClick={() => onViewChange?.("home")} style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "24px", height: "24px", cursor: "pointer", color: "var(--text-muted)", borderRadius: "4px" }}>
                    <svg viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 15, height: 15 }}>
                      <path d="M19 12H5M12 19l-7-7 7-7"/>
                    </svg>
                  </label>
                )}

                {/* Breadcrumb */}
                <div className="breadcrumb" style={{ display: "flex", alignItems: "center", fontSize: "13px", fontWeight: 500, color: "var(--text)", marginLeft: "4px" }}>
                  <span style={{ opacity: 0.8 }}>{workspaceName}</span>
                  {(view === "room" || view === "document") && (
                    <>
                      <span style={{ margin: "0 6px", opacity: 0.4 }}>/</span>
                      <span>{rooms.find(r => r.id === activeRoomId)?.title || "Room"}</span>
                    </>
                  )}
                </div>
              </div>

              <div className="main-topbar-right" style={{ display: "flex", alignItems: "center", gap: "4px", WebkitAppRegion: "no-drag" as any }}>
                {/* IDE Icon */}
                <label className="tool" title="Open Workspace" onClick={onOpenWorkspace} style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "24px", height: "24px", cursor: "pointer", color: "var(--text-muted)", borderRadius: "4px" }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" style={{ width: 15, height: 15 }}>
                    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </label>

                {/* Inspector Icon (List style) */}
                <label className={`tool ${panelVisible ? "active" : ""}`} title="Toggle Inspector" onClick={onTogglePanel} style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "24px", height: "24px", cursor: "pointer", color: panelVisible ? "var(--text)" : "var(--text-muted)", borderRadius: "4px" }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 15, height: 15 }}>
                    <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>
                  </svg>
                </label>

                {/* Terminal Icon */}
                <label className={`tool ${terminalVisible ? "active" : ""}`} title="Toggle Terminal (Ctrl+`)" onClick={onToggleTerminal} style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "24px", height: "24px", cursor: "pointer", color: terminalVisible ? "var(--text)" : "var(--text-muted)", borderRadius: "4px" }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" style={{ width: 15, height: 15 }}>
                    <path d="M4 17l6-6-6-6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M12 19h8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </label>

                {/* Docs Icon */}
                <label className={`tool ${isDocsVisible ? "active" : ""}`} title="Toggle Docs" onClick={() => onViewChange?.(isDocsVisible ? "room" : "document")} style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "24px", height: "24px", cursor: "pointer", color: isDocsVisible ? "var(--text)" : "var(--text-muted)", borderRadius: "4px" }}>
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

            <section className="workspace" style={{ display: "flex", width: "100%", flex: 1, overflow: "hidden" }}>
              {view === "home" && home}
              {(view === "room" || view === "document") && (
                <PanelGroup id="agora-docs" orientation="horizontal">
                  {/* Chat Panel */}
                  <Panel id="chat" defaultSize="70%" className="chat-panel" style={{ position: "relative" }}>
                    <PanelGroup id="agora-term" orientation="vertical">
                      {/* Chat Content */}
                      <Panel id="content" defaultSize="75%">
                        <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
                          <div className="thread" style={{ flex: 1, overflowY: "auto", paddingTop: "16px" }}>
                            {main}
                          </div>

                          {floatingPanel}

                          <div className="chat-composer-wrap" style={{ flexShrink: 0, borderTop: "none", background: "transparent", padding: "0 18px 24px" }}>
                            {composer}
                          </div>
                        </div>
                      </Panel>

                      {/* Terminal */}
                      <PanelResizeHandle className="resize-handle-h" />
                      <Panel
                        id="terminal"
                        panelRef={onTerminalPanelRef}
                        defaultSize="25%"
                        minSize="15%"
                        collapsedSize="0%"
                        collapsible
                        style={{ overflow: "hidden" }}
                      >
                        <TerminalPanel
                          visible={!!terminalVisible}
                          workspacePath={workspacePath}
                          onClose={onToggleTerminal ?? (() => {})}
                        />
                      </Panel>
                    </PanelGroup>
                  </Panel>

                  {/* Docs Panel */}
                  <PanelResizeHandle className="resize-handle" />
                  <Panel
                    id="docs"
                    panelRef={onDocsPanelRef}
                    defaultSize="30%"
                    minSize="20%"
                    collapsedSize="0%"
                    collapsible
                    style={{ overflow: "hidden" }}
                  >
                    <div style={{ height: "100%", width: "100%" }}>
                      {document}
                    </div>
                  </Panel>
                </PanelGroup>
              )}
            </section>
          </main>
        </Panel>
      </PanelGroup>
    </div>
  );
};
