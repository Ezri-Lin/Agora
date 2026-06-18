import React, { useState, useCallback, useRef } from "react";
import { Panel, Group as PanelGroup, Separator as PanelResizeHandle } from "react-resizable-panels";

const TerminalPanel = React.lazy(() =>
  import("../Terminal/TerminalPanel.js").then((m) => ({ default: m.TerminalPanel }))
);
import type { AppView, CouncilStageView, SidecarTab } from "./AppShell.types.js";
import { useNavigation } from "./useNavigation.js";
import { usePanelManager } from "./usePanelManager.js";
import { Sidebar } from "./Sidebar.js";
import { TopBar } from "./TopBar.js";
import { CouncilStagePanel } from "../CouncilStage/CouncilStagePanel.js";
import { useTheme } from "../theme/ThemeContext.js";
import { useI18n } from "../i18n/I18nContext.js";

interface RoomEntry {
  id: string;
  title: string;
  createdAt: string;
  settings?: any;
}

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
  stageVisible?: boolean;
  onToggleStage?: () => void;
  focusedRoleId?: string | null;
  onRoleFocus?: (roleId: string | null) => void;
  roles?: RoleCard[];
  messages?: CouncilMessage[];
  pausedRoleIds?: string[];
  removedRoleIds?: string[];
  excludedRoleIds?: string[];
  onTogglePause?: (roleId: string) => void;
  onToggleRemove?: (roleId: string) => void;
  onAddExcluded?: (roleId: string) => void;
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
  stageVisible = false,
  onToggleStage,
  focusedRoleId,
  onRoleFocus,
  roles = [],
  messages = [],
  pausedRoleIds,
  removedRoleIds,
  excludedRoleIds,
  onTogglePause,
  onToggleRemove,
  onAddExcluded,
}) => {
  const { agoraColors: colors } = useTheme();
  const { t } = useI18n();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(268);
  const [stageView, setStageView] = useState<CouncilStageView>("meeting");
  const { canGoBack, canGoForward, goBack, goForward } = useNavigation(view, onViewChange);
  const { onStagePanelRef, onDocsPanelRef, onTerminalPanelRef } = usePanelManager(
    sidecarVisible, terminalVisible, stageVisible,
  );

  const toggleSidebar = useCallback(() => {
    setSidebarCollapsed((prev) => !prev);
  }, []);

  // Stage toggle: hide sidebar when opening
  const handleToggleStage = useCallback(() => {
    if (!stageVisible) setSidebarCollapsed(true);
    onToggleStage?.();
  }, [stageVisible, onToggleStage]);

  const handleRoleFocus = useCallback((roleId: string | null) => {
    onRoleFocus?.(roleId);
  }, [onRoleFocus]);

  // Sidebar drag-to-resize
  const dragRef = useRef<{ startX: number; startW: number } | null>(null);
  const onSidebarResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    dragRef.current = { startX: e.clientX, startW: sidebarWidth };
    const onMove = (ev: MouseEvent) => {
      if (!dragRef.current) return;
      const delta = ev.clientX - dragRef.current.startX;
      const newW = dragRef.current.startW + delta;
      if (newW < 200) { setSidebarCollapsed(true); dragRef.current = null; document.removeEventListener("mousemove", onMove); document.removeEventListener("mouseup", onUp); document.body.style.cursor = ""; document.body.style.userSelect = ""; return; }
      setSidebarWidth(Math.min(400, newW));
    };
    const onUp = () => {
      dragRef.current = null;
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  }, [sidebarWidth]);

  // TopBar breadcrumb per view
  const breadcrumb = view === "room"
    ? <RoomBreadcrumb rooms={rooms} activeRoomId={activeRoomId} />
    : view === "contextGraph"
    ? <><span style={{ margin: "0 6px", opacity: 0.4 }}>/</span><span style={{ opacity: 0.6 }}>{t.contextGraph}</span></>
    : undefined;

  // TopBar actions (only in room view)
  const actions = view === "room" ? (
    <RoomActions
      onOpenWorkspace={onOpenWorkspace}
      stageVisible={stageVisible}
      onToggleStage={handleToggleStage}
      terminalVisible={terminalVisible}
      onToggleTerminal={onToggleTerminal}
      sidecarVisible={sidecarVisible}
      onToggleSidecar={onToggleSidecar}
    />
  ) : undefined;

  return (
    <div className="app-layout" style={{ display: "flex", flexDirection: "column", height: "100vh", width: "100vw", background: "var(--bg-app)" }}>
      <div className="app-window" style={{ flex: 1, display: "flex", minHeight: 0, overflow: "hidden" }}>
        {/* Sidebar — Codex-style, drag-resizable */}
        {!sidebarCollapsed && (
          <>
            <div className="sidebar-panel" style={{ width: sidebarWidth, flexShrink: 0, display: "flex", flexDirection: "column", overflow: "hidden" }}>
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
                canGoBack={canGoBack}
                canGoForward={canGoForward}
                onGoBack={goBack}
                onGoForward={goForward}
              />
            </div>
            <div
              className="sidebar-resize-handle"
              onMouseDown={onSidebarResizeStart}
              style={{ width: 4, flexShrink: 0, cursor: "col-resize", background: colors.borderDefault, transition: "background .15s" }}
            />
          </>
        )}

        {/* Main content */}
        <main className="main" style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
          <TopBar
            workspaceName={workspaceName}
            sidebarCollapsed={sidebarCollapsed}
            onToggleSidebar={toggleSidebar}
            canGoBack={canGoBack}
            canGoForward={canGoForward}
            onGoBack={goBack}
            onGoForward={goForward}
            breadcrumb={breadcrumb}
            actions={actions}
          />

          {view === "home" && (
            <section className="workspace" style={{ flex: 1, overflow: "hidden" }}>{home}</section>
          )}

          {view === "contextGraph" && (
            <section className="workspace" style={{ flex: 1, overflow: "hidden" }}>{contextGraph}</section>
          )}

          {view === "room" && (
            <div style={{ flex: 1, minHeight: 0 }}>
              <PanelGroup id="agora-stage" orientation="horizontal" style={{ flex: 1, minHeight: 0, height: "100%" }}>
                <Panel id="stage" panelRef={onStagePanelRef} defaultSize="25%" minSize="15%" collapsedSize="0%" collapsible style={{ overflow: "hidden" }}>
                  <CouncilStagePanel
                    stageView={stageView}
                    onStageViewChange={setStageView}
                    roles={roles}
                    messages={messages}
                    focusedRoleId={focusedRoleId}
                    onRoleFocus={handleRoleFocus}
                    activeRoomId={activeRoomId}
                    rooms={rooms}
                    pausedRoleIds={pausedRoleIds}
                    removedRoleIds={removedRoleIds}
                    excludedRoleIds={excludedRoleIds}
                    onTogglePause={onTogglePause}
                    onToggleRemove={onToggleRemove}
                    onAddExcluded={onAddExcluded}
                  />
                </Panel>
                <PanelResizeHandle className="resize-handle" disabled={!stageVisible} />
                <Panel id="agora-docs" defaultSize="75%" minSize="30%">
                  <PanelGroup id="agora-docs-inner" orientation="horizontal" style={{ flex: 1, minHeight: 0, height: "100%" }}>
                    <Panel id="chat" defaultSize="70%" className="chat-panel" style={{ position: "relative" }}>
                      <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
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
                            <React.Suspense fallback={null}>
                              <TerminalPanel visible={!!terminalVisible} workspacePath={workspacePath} onClose={onToggleTerminal ?? (() => {})} />
                            </React.Suspense>
                          </Panel>
                        </PanelGroup>
                      </div>
                    </Panel>
                    <PanelResizeHandle className="resize-handle" />
                    <Panel id="docs" panelRef={onDocsPanelRef} defaultSize="30%" minSize="20%" collapsedSize="0%" collapsible style={{ overflow: "hidden" }}>
                      <div style={{ height: "100%", width: "100%" }}>{sidecar}</div>
                    </Panel>
                  </PanelGroup>
                </Panel>
              </PanelGroup>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

// ── Sub-components ──

const RoomBreadcrumb: React.FC<{ rooms: RoomEntry[]; activeRoomId?: string | null }> = ({ rooms, activeRoomId }) => {
  const { agoraColors: colors } = useTheme();
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
            style={{ outline: "none", background: "transparent", color: colors.textPrimary, fontSize: 13, fontWeight: 500, minWidth: "1ch" }}
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
  stageVisible?: boolean;
  onToggleStage?: () => void;
  terminalVisible?: boolean;
  onToggleTerminal?: () => void;
  sidecarVisible?: boolean;
  onToggleSidecar?: () => void;
}> = ({ onOpenWorkspace, stageVisible, onToggleStage, terminalVisible, onToggleTerminal, sidecarVisible, onToggleSidecar }) => {
  const { agoraColors: colors } = useTheme();
  const { t } = useI18n();
  return (
  <>
    <label className="tool" title={t.openWorkspace} onClick={onOpenWorkspace} style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "24px", height: "24px", cursor: "pointer", color: colors.textMuted, borderRadius: "4px" }}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" style={{ width: 15, height: 15 }}>
        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </label>
    <label className={`tool ${stageVisible ? "active" : ""}`} title={t.stagePanel} onClick={onToggleStage} style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "24px", height: "24px", cursor: "pointer", color: stageVisible ? colors.textPrimary : colors.textMuted, borderRadius: "4px" }}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 15, height: 15 }}>
        <circle cx="12" cy="12" r="10" />
        <circle cx="12" cy="12" r="3" />
        <line x1="12" y1="2" x2="12" y2="6" />
        <line x1="12" y1="18" x2="12" y2="22" />
        <line x1="2" y1="12" x2="6" y2="12" />
        <line x1="18" y1="12" x2="22" y2="12" />
      </svg>
    </label>
    <label className={`tool ${terminalVisible ? "active" : ""}`} title={t.toggleTerminalTitle} onClick={onToggleTerminal} style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "24px", height: "24px", cursor: "pointer", color: terminalVisible ? colors.textPrimary : colors.textMuted, borderRadius: "4px" }}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" style={{ width: 15, height: 15 }}>
        <path d="M4 17l6-6-6-6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M12 19h8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </label>
    <label className={`tool ${sidecarVisible ? "active" : ""}`} title={t.toggleDocsTitle} onClick={onToggleSidecar} style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "24px", height: "24px", cursor: "pointer", color: sidecarVisible ? colors.textPrimary : colors.textMuted, borderRadius: "4px" }}>
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
};

const ScrollButton: React.FC<{ onClick?: () => void; count?: number }> = ({ onClick, count }) => {
  const { agoraColors: colors } = useTheme();
  const { t } = useI18n();
  return (
  <button onClick={onClick} style={{ position: "absolute", top: -16, left: "50%", transform: "translateX(-50%)", background: colors.bgPanel, border: `1px solid ${colors.borderDefault}`, borderRadius: "50%", width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: colors.textMuted, boxShadow: "0 1px 4px rgba(0,0,0,0.12)", zIndex: 10 }} title={t.scrollToBottomTitle}>
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14 }}>
      <path d="M12 5v14M19 12l-7 7-7-7" />
    </svg>
    {(count ?? 0) > 0 && (
      <span style={{ position: "absolute", top: -4, right: -4, background: colors.accentPrimary, color: colors.textInverse, fontSize: 9, fontWeight: 700, minWidth: 14, height: 14, borderRadius: 7, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 3px" }}>{count}</span>
    )}
  </button>
  );
};
