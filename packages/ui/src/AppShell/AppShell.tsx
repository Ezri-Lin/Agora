import React, { useState, useCallback } from "react";
import { Panel, Group as PanelGroup, Separator as PanelResizeHandle } from "react-resizable-panels";
import { TerminalPanel } from "../Terminal/TerminalPanel.js";
import type { AppView, SidecarTab } from "./AppShell.types.js";
import { useNavigation } from "./useNavigation.js";
import { usePanelManager } from "./usePanelManager.js";
import { Sidebar } from "./Sidebar.js";
import { TopBar } from "./TopBar.js";

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
  sidecar?: React.ReactNode;
  sidecarTab?: SidecarTab;
  onSidecarTabChange?: (tab: SidecarTab) => void;
  sidecarVisible?: boolean;
  onToggleSidecar?: () => void;
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
  showScrollToBottom?: boolean;
  newMsgCount?: number;
  onScrollToBottom?: () => void;
}

export const AppShell: React.FC<AppShellProps> = ({
  view = "room",
  onViewChange,
  workspaceName,
  onOpenWorkspace,
  home,
  contextGraph,
  main,
  sidecar,
  sidecarVisible = false,
  onToggleSidecar,
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
  onOpenContextGraph,
  showScrollToBottom,
  newMsgCount,
  onScrollToBottom,
}) => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { canGoBack, canGoForward, goBack, goForward } = useNavigation(view, onViewChange);
  const { sidebarRef, onDocsPanelRef, onTerminalPanelRef } = usePanelManager(sidecarVisible, terminalVisible, sidebarCollapsed);

  const toggleSidebar = useCallback(() => setSidebarCollapsed(v => !v), []);

  return (
    <div className="app-layout" style={{ display: "flex", flexDirection: "column", height: "100vh", width: "100vw", background: "var(--bg-app)" }}>
      <PanelGroup id="agora-main" orientation="horizontal" className="app-window" style={{ flex: 1, overflow: "hidden", minHeight: 0 }}>
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
          <Sidebar
            workspaceName={workspaceName}
            workspacePath={workspacePath}
            rooms={rooms}
            activeRoomId={activeRoomId}
            isLoading={isLoading}
            onNewRoom={onNewRoom}
            onSelectRoom={onSelectRoom}
            onDeleteRoom={onDeleteRoom}
            onOpenContextGraph={onOpenContextGraph}
            onOpenSettings={onOpenSettings}
            onToggleCollapse={toggleSidebar}
          />
        </Panel>
        <PanelResizeHandle className="resize-handle" />

        <Panel id="main" defaultSize="85%" minSize="20%">
          <main className="main" style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column" }}>
            {view === "home" && (
              <>
                <TopBar workspaceName={workspaceName} sidebarCollapsed={sidebarCollapsed} onToggleSidebar={toggleSidebar} canGoBack={canGoBack} canGoForward={canGoForward} onGoBack={goBack} onGoForward={goForward} />
                <section className="workspace" style={{ flex: 1, overflow: "hidden" }}>{home}</section>
              </>
            )}
            {view === "contextGraph" && (
              <>
                <TopBar workspaceName={workspaceName} sidebarCollapsed={sidebarCollapsed} onToggleSidebar={toggleSidebar} canGoBack={canGoBack} canGoForward={canGoForward} onGoBack={goBack} onGoForward={goForward} breadcrumb={<><span style={{ margin: "0 6px", opacity: 0.4 }}>/</span><span style={{ opacity: 0.6 }}>Context Graph</span></>} />
                <section className="workspace" style={{ flex: 1, overflow: "hidden" }}>{contextGraph}</section>
              </>
            )}
            {view === "room" && (
              <PanelGroup id="agora-docs" orientation="horizontal" style={{ flex: 1, minHeight: 0 }}>
                <Panel id="chat" defaultSize="70%" className="chat-panel" style={{ position: "relative" }}>
                  <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
                    <TopBar
                      workspaceName={workspaceName}
                      sidebarCollapsed={sidebarCollapsed}
                      onToggleSidebar={toggleSidebar}
                      canGoBack={canGoBack}
                      canGoForward={canGoForward}
                      onGoBack={goBack}
                      onGoForward={goForward}
                      breadcrumb={<RoomBreadcrumb rooms={rooms} activeRoomId={activeRoomId} />}
                      actions={<RoomActions onOpenWorkspace={onOpenWorkspace} panelVisible={panelVisible} onTogglePanel={onTogglePanel} terminalVisible={terminalVisible} onToggleTerminal={onToggleTerminal} sidecarVisible={sidecarVisible} onToggleSidecar={onToggleSidecar} />}
                    />
                    <PanelGroup id="agora-term" orientation="vertical" style={{ flex: 1, minHeight: 0 }}>
                      <Panel id="content" defaultSize="75%">
                        <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
                          {main}
                          {floatingPanel}
                          <div className="chat-composer-wrap" style={{ flexShrink: 0, borderTop: "none", background: "transparent", padding: "0 32px 24px", position: "relative" }}>
                            {showScrollToBottom && <ScrollButton onClick={onScrollToBottom} count={newMsgCount} />}
                            {composer}
                          </div>
                        </div>
                      </Panel>
                      <PanelResizeHandle className="resize-handle-h" />
                      <Panel id="terminal" panelRef={onTerminalPanelRef} defaultSize="25%" minSize="15%" collapsedSize="0%" collapsible style={{ overflow: "hidden" }}>
                        <TerminalPanel visible={!!terminalVisible} workspacePath={workspacePath} onClose={onToggleTerminal ?? (() => {})} />
                      </Panel>
                    </PanelGroup>
                  </div>
                </Panel>
                <PanelResizeHandle className="resize-handle" />
                <Panel id="docs" panelRef={onDocsPanelRef} defaultSize="30%" minSize="20%" collapsedSize="0%" collapsible style={{ overflow: "hidden" }}>
                  <div style={{ height: "100%", width: "100%" }}>{sidecar}</div>
                </Panel>
              </PanelGroup>
            )}
          </main>
        </Panel>
      </PanelGroup>
    </div>
  );
};

// ── Sub-components ──

const RoomBreadcrumb: React.FC<{ rooms: RoomEntry[]; activeRoomId?: string | null }> = ({ rooms, activeRoomId }) => {
  const [editingRoomId, setEditingRoomId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");

  const room = rooms.find(r => r.id === activeRoomId);
  if (!room) return null;

  return (
    <>
      <span style={{ margin: "0 6px", opacity: 0.4 }}>/</span>
      <span style={{ cursor: "pointer", borderRadius: 3, padding: "1px 4px", marginLeft: -4 }} onClick={() => { setEditingRoomId(room.id); setEditingTitle(room.title || ""); }}>
        {editingRoomId === activeRoomId ? (
          <span
            ref={el => { if (el && !el.dataset.init) { el.dataset.init = "1"; el.textContent = editingTitle; } }}
            contentEditable
            suppressContentEditableWarning
            onInput={e => setEditingTitle((e.target as HTMLElement).textContent || "")}
            onBlur={() => setEditingRoomId(null)}
            onKeyDown={e => { if (e.key === "Enter" || e.key === "Escape") setEditingRoomId(null); }}
            style={{ outline: "none", background: "transparent", color: "var(--text)", fontSize: 13, fontWeight: 500, minWidth: "1ch" }}
          />
        ) : (
          room.title || "Room"
        )}
      </span>
    </>
  );
};

const RoomActions: React.FC<{
  onOpenWorkspace: () => void;
  panelVisible?: boolean;
  onTogglePanel?: () => void;
  terminalVisible?: boolean;
  onToggleTerminal?: () => void;
  sidecarVisible?: boolean;
  onToggleSidecar?: () => void;
}> = ({ onOpenWorkspace, panelVisible, onTogglePanel, terminalVisible, onToggleTerminal, sidecarVisible, onToggleSidecar }) => (
  <>
    <label className="tool" title="Open Workspace" onClick={onOpenWorkspace} style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "24px", height: "24px", cursor: "pointer", color: "var(--text-muted)", borderRadius: "4px" }}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" style={{ width: 15, height: 15 }}>
        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </label>
    <label className={`tool ${panelVisible ? "active" : ""}`} title="Toggle Inspector" onClick={onTogglePanel} style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "24px", height: "24px", cursor: "pointer", color: panelVisible ? "var(--text)" : "var(--text-muted)", borderRadius: "4px" }}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 15, height: 15 }}>
        <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>
      </svg>
    </label>
    <label className={`tool ${terminalVisible ? "active" : ""}`} title="Toggle Terminal (Ctrl+`)" onClick={onToggleTerminal} style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "24px", height: "24px", cursor: "pointer", color: terminalVisible ? "var(--text)" : "var(--text-muted)", borderRadius: "4px" }}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" style={{ width: 15, height: 15 }}>
        <path d="M4 17l6-6-6-6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M12 19h8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </label>
    <label className={`tool ${sidecarVisible ? "active" : ""}`} title="Toggle Sidecar" onClick={onToggleSidecar} style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "24px", height: "24px", cursor: "pointer", color: sidecarVisible ? "var(--text)" : "var(--text-muted)", borderRadius: "4px" }}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" style={{ width: 15, height: 15 }}>
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M14 2v6h6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M16 13H8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M16 17H8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M10 9H8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </label>
  </>
);

const ScrollButton: React.FC<{ onClick?: () => void; count?: number }> = ({ onClick, count }) => (
  <button onClick={onClick} style={{ position: "absolute", top: -16, left: "50%", transform: "translateX(-50%)", background: "var(--panel)", border: "1px solid var(--line)", borderRadius: "50%", width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "var(--muted)", boxShadow: "0 1px 4px rgba(0,0,0,0.12)", zIndex: 10 }} title="Scroll to bottom">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14 }}>
      <path d="M12 5v14M19 12l-7 7-7-7" />
    </svg>
    {(count ?? 0) > 0 && (
      <span style={{ position: "absolute", top: -4, right: -4, background: "var(--blue)", color: "#fff", fontSize: 9, fontWeight: 700, minWidth: 14, height: 14, borderRadius: 7, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 3px" }}>{count}</span>
    )}
  </button>
);
