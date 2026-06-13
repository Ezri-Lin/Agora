import React, { useCallback, useEffect, useRef, useState } from "react";
import { SpiralLoader } from "../AgentTools/SpiralLoader.js";
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
  isLoading?: boolean;
  onDeleteRoom?: (roomId: string) => void;
  onRenameRoom?: (roomId: string, title: string) => void;
  onOpenContextGraph?: () => void;
  scrollToBottomBtn?: React.ReactNode;
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
  isLoading,
  onDeleteRoom,
  onRenameRoom,
  onOpenContextGraph,
  scrollToBottomBtn,
}) => {
  const isDocsVisible = view === "document";
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [editingRoomId, setEditingRoomId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");

  // Navigation history (browser-style back/forward)
  const [history, setHistory] = useState<AppView[]>(["room"]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const historyIndexRef = useRef(0);
  const canGoBack = historyIndex > 0;
  const canGoForward = historyIndex < history.length - 1;

  const navigateTo = useCallback((target: AppView) => {
    if (target === view) return;
    isInternalNavRef.current = true;
    setHistory(prev => {
      const truncated = prev.slice(0, historyIndexRef.current + 1);
      const next = [...truncated, target];
      historyIndexRef.current = next.length - 1;
      setHistoryIndex(next.length - 1);
      return next;
    });
    onViewChange?.(target);
  }, [view, onViewChange]);

  const goBack = useCallback(() => {
    if (!canGoBack) return;
    const newIndex = historyIndex - 1;
    isInternalNavRef.current = true;
    historyIndexRef.current = newIndex;
    setHistoryIndex(newIndex);
    onViewChange?.(history[newIndex]);
  }, [canGoBack, historyIndex, history, onViewChange]);

  const goForward = useCallback(() => {
    if (!canGoForward) return;
    const newIndex = historyIndex + 1;
    isInternalNavRef.current = true;
    historyIndexRef.current = newIndex;
    setHistoryIndex(newIndex);
    onViewChange?.(history[newIndex]);
  }, [canGoForward, historyIndex, history, onViewChange]);

  // Track external view changes (from App.tsx) in history
  const isInternalNavRef = useRef(false);
  const prevViewRef = useRef(view);
  useEffect(() => {
    if (view === prevViewRef.current) return;
    prevViewRef.current = view;
    if (isInternalNavRef.current) {
      isInternalNavRef.current = false;
      return;
    }
    setHistory(prev => {
      const truncated = prev.slice(0, historyIndexRef.current + 1);
      const next = [...truncated, view];
      historyIndexRef.current = next.length - 1;
      setHistoryIndex(next.length - 1);
      return next;
    });
  }, [view]);

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
          <header className="sidebar-topbar" style={{ display: "flex", alignItems: "center", height: "40px", paddingLeft: "80px", paddingRight: "8px", gap: "2px", flexShrink: 0, WebkitAppRegion: "drag" as any }}>
            {/* Collapse */}
            <label className="tool" title="Toggle Sidebar" onClick={() => setSidebarCollapsed(!sidebarCollapsed)} style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "24px", height: "24px", cursor: "pointer", color: "var(--text-muted)", borderRadius: "4px", WebkitAppRegion: "no-drag" as any }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 15, height: 15 }}>
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <line x1="9" y1="3" x2="9" y2="21" />
              </svg>
            </label>
            {/* Back */}
            <label className="tool" title="Back" onClick={goBack} style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "24px", height: "24px", cursor: canGoBack ? "pointer" : "default", color: canGoBack ? "var(--text-muted)" : "var(--faint)", borderRadius: "4px", WebkitAppRegion: "no-drag" as any, opacity: canGoBack ? 1 : 0.4 }}>
              <svg viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 15, height: 15 }}>
                <path d="M19 12H5M12 19l-7-7 7-7"/>
              </svg>
            </label>
            {/* Forward */}
            <label className="tool" title="Forward" onClick={goForward} style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "24px", height: "24px", cursor: canGoForward ? "pointer" : "default", color: canGoForward ? "var(--text-muted)" : "var(--faint)", borderRadius: "4px", WebkitAppRegion: "no-drag" as any, opacity: canGoForward ? 1 : 0.4 }}>
              <svg viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 15, height: 15 }}>
                <path d="M5 12h14M12 5l7 7-7 7"/>
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
              <div className="side-label">PROJECTS</div>
              <div className="project-block">
                {rooms.map((r) => (
                  <a
                    key={r.id}
                    className={`room-link ${r.id === activeRoomId ? "active" : ""}`}
                    onClick={() => onSelectRoom?.(r.id)}
                    style={{ display: "flex", alignItems: "center", gap: 6 }}
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
                  <>
                    <label className="tool" title="Toggle Sidebar" onClick={() => setSidebarCollapsed(!sidebarCollapsed)} style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "24px", height: "24px", cursor: "pointer", color: "var(--text-muted)", borderRadius: "4px" }}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 15, height: 15 }}>
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                        <line x1="9" y1="3" x2="9" y2="21" />
                      </svg>
                    </label>
                    <label className="tool" title="Back" onClick={goBack} style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "24px", height: "24px", cursor: canGoBack ? "pointer" : "default", color: canGoBack ? "var(--text-muted)" : "var(--faint)", borderRadius: "4px", opacity: canGoBack ? 1 : 0.4 }}>
                      <svg viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 15, height: 15 }}>
                        <path d="M19 12H5M12 19l-7-7 7-7"/>
                      </svg>
                    </label>
                    <label className="tool" title="Forward" onClick={goForward} style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "24px", height: "24px", cursor: canGoForward ? "pointer" : "default", color: canGoForward ? "var(--text-muted)" : "var(--faint)", borderRadius: "4px", opacity: canGoForward ? 1 : 0.4 }}>
                      <svg viewBox="0 0 24 24" stroke="currentColor" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 15, height: 15 }}>
                        <path d="M5 12h14M12 5l7 7-7 7"/>
                      </svg>
                    </label>
                  </>
                )}

                {/* Breadcrumb */}
                <div className="breadcrumb" style={{ display: "flex", alignItems: "center", fontSize: "13px", fontWeight: 500, color: "var(--text)", marginLeft: "4px" }}>
                  <span style={{ opacity: 0.8 }}>{workspaceName}</span>
                  {(view === "room" || view === "document") && (
                    <>
                      <span style={{ margin: "0 6px", opacity: 0.4 }}>/</span>
                      <span
                        style={{ cursor: "pointer", borderRadius: 3, padding: "1px 4px", marginLeft: -4 }}
                        onClick={() => {
                          const room = rooms.find(r => r.id === activeRoomId);
                          if (room) {
                            setEditingRoomId(room.id);
                            setEditingTitle(room.title || "");
                          }
                        }}
                      >
                        {editingRoomId === activeRoomId ? (
                          <span
                            ref={el => {
                              if (el && !el.dataset.init) {
                                el.dataset.init = "1";
                                el.textContent = editingTitle;
                                const range = window.document.createRange();
                                range.selectNodeContents(el);
                                range.collapse(false);
                                const sel = window.getSelection();
                                sel?.removeAllRanges();
                                sel?.addRange(range);
                              }
                            }}
                            contentEditable
                            suppressContentEditableWarning
                            onInput={e => setEditingTitle((e.target as HTMLElement).textContent || "")}
                            onBlur={e => {
                              const val = (e.target as HTMLElement).textContent?.trim() || "";
                              if (val && onRenameRoom) onRenameRoom(activeRoomId!, val);
                              setEditingRoomId(null);
                            }}
                            onKeyDown={e => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                const val = (e.target as HTMLElement).textContent?.trim() || "";
                                if (val && onRenameRoom) onRenameRoom(activeRoomId!, val);
                                setEditingRoomId(null);
                              }
                              if (e.key === "Escape") setEditingRoomId(null);
                            }}
                            style={{ outline: "none", background: "transparent", color: "var(--text)", fontSize: 13, fontWeight: 500, minWidth: "1ch" }}
                          />
                        ) : (
                          rooms.find(r => r.id === activeRoomId)?.title || "Room"
                        )}
                      </span>
                    </>
                  )}
                  {view === "contextGraph" && (
                    <>
                      <span style={{ margin: "0 6px", opacity: 0.4 }}>/</span>
                      <span style={{ opacity: 0.6 }}>Context Graph</span>
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
              {view === "contextGraph" && (
                <div style={{ flex: 1, overflow: "hidden" }}>{contextGraph}</div>
              )}
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

                          {scrollToBottomBtn}

                          <div className="chat-composer-wrap" style={{ flexShrink: 0, borderTop: "none", background: "transparent", padding: "0 32px 24px" }}>
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
