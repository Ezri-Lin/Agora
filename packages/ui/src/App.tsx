import React, { useCallback, useMemo, useRef, useState } from "react";
import type { ScannedDoc } from "./AgoraBridge.js";
import { getBridge } from "./AgoraBridge.js";
import { AppShell } from "./AppShell/AppShell.js";
import type { AppView } from "./AppShell/AppShell.types.js";
import { ContextGraph } from "./ContextGraph/ContextGraph.js";
import { CouncilRoom } from "./CouncilRoom/CouncilRoom.js";
import { Composer } from "./Composer/Composer.js";
import { DocumentSurface } from "./DocumentSurface/DocumentSurface.js";
import { RunInspector } from "./RunInspector/RunInspector.js";
import { EmptyState } from "./EmptyState.js";
import { RefPicker } from "./RefPicker.js";
import { SettingsModal } from "./Settings/SettingsModal.js";
import { ReviewPanelHost } from "./ReviewPanels/ReviewPanelHost.js";
import { WorkspaceGraph } from "./WorkspaceGraph/WorkspaceGraph.js";
import { WorkspaceHome } from "./WorkspaceHome/WorkspaceHome.js";
import { errorStyle } from "./appStyles.js";
import { DispatchGateHost } from "./CouncilDispatchGate/DispatchGateHost.js";
import { I18nProvider } from "./i18n/I18nContext.js";
import { ThemeProvider } from "./theme/ThemeContext.js";
import { usePanelState } from "./hooks/usePanelState.js";
import { useWorkspaceState } from "./hooks/useWorkspaceState.js";
import { useCouncilState } from "./hooks/useCouncilState.js";
import { useDocumentState } from "./hooks/useDocumentState.js";
import { Sidecar } from "./Sidecar/Sidecar.js";
import { ProgressPanel } from "./Sidecar/ProgressPanel.js";

export const App: React.FC = () => {
  const panels = usePanelState();
  const council = useCouncilState();
  const workspace = useWorkspaceState(council.loadWorkspaceData);
  const documentState = useDocumentState();
  const [activeView, setActiveView] = useState<AppView>("home");

  const jumpFnsRef = useRef<{ scrollToMessage: (id: string) => void; highlightMessage: (id: string, ms?: number) => void; scrollToBottom: () => void } | null>(null);
  const [isNearBottom, setIsNearBottom] = useState(false);
  const [newMsgCount, setNewMsgCount] = useState(0);

  const handleSelectRoom = useCallback(async (roomId: string) => {
    if (!workspace.workspace) return;
    await council.handleSelectRoom(roomId, workspace.workspace.path);
    setActiveView("room");
  }, [workspace.workspace, council.handleSelectRoom]);

  const handleSend = useCallback(async (text: string, params: { roomMode: string; maxRoles: number; autoInvite: boolean }, targetedRoles?: any[]) => {
    council.setRoomMode(params.roomMode as any);
    await (council.handleSend as any)(text, workspace.workspace, workspace.selectedRefs, targetedRoles, {
      maxRoles: params.maxRoles,
      autoInvite: params.autoInvite,
    });
  }, [workspace.workspace, workspace.selectedRefs, council.handleSend, council.setRoomMode]);

  const handleDispatchContinue = useCallback(async (selectedRoleIds: string[]) => {
    if (!workspace.workspace) return;
    await council.handleDispatchContinue(selectedRoleIds, workspace.workspace, workspace.selectedRefs);
  }, [workspace.workspace, workspace.selectedRefs, council.handleDispatchContinue]);

  const handleNewRoom = useCallback(() => {
    council.newRoom();
    setActiveView("room");
  }, [council.newRoom]);

  const handleOpenDocument = useCallback(async (doc: ScannedDoc) => {
    if (!workspace.workspace) return;
    panels.setSidecarTab("docs");
    await documentState.openDocument(workspace.workspace.path, doc);
  }, [documentState.openDocument, workspace.workspace, panels.setSidecarTab]);

  const handleOpenOutput = useCallback(async (path: string) => {
    if (!workspace.workspace) return;
    const name = path.replace(/\\/g, "/").split("/").pop() || path;
    const ext = name.includes(".") ? name.split(".").pop()! : "";
    panels.setSidecarTab("docs");
    await documentState.openDocument(workspace.workspace.path, { path, name, ext });
  }, [documentState.openDocument, workspace.workspace, panels.setSidecarTab]);

  const handleReferenceDocument = useCallback((doc: ScannedDoc) => {
    workspace.addRef(doc);
    setActiveView("room");
  }, [workspace.addRef]);

  const handleNodeClick = useCallback((msgId: string) => {
    const el = document.getElementById(msgId);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, []);

  const handleJumpToMessage = useCallback((messageId: string) => {
    jumpFnsRef.current?.scrollToMessage(messageId);
    jumpFnsRef.current?.highlightMessage(messageId, 1800);
  }, []);

  const handleRegisterJumpFns = useCallback((fns: { scrollToMessage: (id: string) => void; highlightMessage: (id: string, ms?: number) => void; scrollToBottom: () => void }) => {
    jumpFnsRef.current = fns;
  }, []);

  const handleDeleteRoom = useCallback(async (roomId: string) => {
    const bridge = getBridge();
    if (!bridge || !workspace.workspace) return;
    await bridge.room.delete(workspace.workspace.path, roomId);
    if (council.roomIdRef.current === roomId) {
      council.newRoom();
      setActiveView("home");
    }
    council.loadRooms(workspace.workspace.path);
  }, [workspace.workspace, council.loadRooms, council.newRoom, council.roomIdRef]);

  const handleRenameRoom = useCallback(async (roomId: string, title: string) => {
    const bridge = getBridge();
    if (!bridge || !workspace.workspace) return;
    await bridge.room.rename(workspace.workspace.path, roomId, title);
    council.loadRooms(workspace.workspace.path);
  }, [workspace.workspace, council.loadRooms]);

  // Memoize to avoid creating a new Set on every render
  const activeRoleIds = useMemo(
    () => new Set(council.messages.filter((m) => m.senderType === "role").map((m) => m.senderId)),
    [council.messages]
  );

  if (workspace.isLoading) {
    return null;
  }

  if (!workspace.workspace) {
    return (
      <ThemeProvider>
        <I18nProvider>
          <EmptyState onOpen={workspace.openWorkspace} onOpenRecent={workspace.openRecent} />
        </I18nProvider>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider>
    <I18nProvider>
      <AppShell
      view={activeView}
      onViewChange={setActiveView}
      workspaceName={workspace.workspace.name}
      onOpenWorkspace={workspace.openWorkspace}
      home={
        <WorkspaceHome
          graph={<WorkspaceGraph docs={workspace.availableDocs} rooms={council.rooms} />}
          rooms={council.rooms}
          docs={workspace.availableDocs}
          workspacePath={workspace.workspace.path}
          onSelectRoom={handleSelectRoom}
          onOpenDocument={handleOpenDocument}
          onNewRoom={handleNewRoom}
          composer={
            <>
              {workspace.showRefPicker && (
                <RefPicker
                  docs={workspace.availableDocs}
                  onSelect={workspace.addRef}
                  onClose={workspace.closeRefPicker}
                />
              )}
              <Composer
                onSend={handleSend}
                isLoading={council.isLoading}
                onStop={council.handleStop}
                references={workspace.selectedRefs}
                onRemoveRef={workspace.removeRef}
                perspectiveChips={council.pendingPerspectiveChips}
                onRemovePerspectiveChip={council.handleRemovePerspectiveChip}
                availableDocs={workspace.availableDocs}
                availableRoles={council.allRoles}
                onAddRef={workspace.addRef}
                onAddRole={(role: any) => council.handleAddPerspective(role.id, role.name)}
                workspaceName={workspace.workspace.name}
              />
            </>
          }
        />
      }
      contextGraph={
        <div className="graph-field" style={{ position: "relative", width: "100%", height: "100%" }}>
          <div className="graph-controls">
            <h3>Graph display</h3>
            <div className="layer-row"><span>Documents / backlinks</span><span className="switch on" /></div>
            <div className="layer-row"><span>Rooms</span><span className="switch" /></div>
            <div className="layer-row"><span>Role red / green links</span><span className="switch on" /></div>
            <div className="layer-row"><span>Claims / memory</span><span className="switch" /></div>
            <div className="layer-row"><span>Density</span><span className="pill">Clean ▾</span></div>
          </div>
          <div style={{ position: "absolute", inset: 0 }}>
            <ContextGraph
              messages={council.messages}
              selectedRefs={workspace.selectedRefs}
              roles={council.allRoles}
              roomId={council.roomIdRef.current}
              onNodeClick={handleNodeClick}
            />
          </div>
        </div>
      }
      main={
        <>
          {council.error && (
            <div style={errorStyle}>
              Error: {council.error}
            </div>
          )}
          <CouncilRoom
            messages={council.messages}
            roles={council.allRoles}
            isLoading={council.isLoading}
            loadingStatus={council.loadingStatus}
            onStop={council.handleStop}
            streamingRoleId={council.streamingRoleIdRef.current}
            onRegisterJumpFns={handleRegisterJumpFns}
            onNearBottomChange={setIsNearBottom}
            onNewMsgCountChange={setNewMsgCount}
          />
        </>
      }
      sidecar={
        <Sidecar
          tab={panels.sidecarTab}
          onTabChange={panels.setSidecarTab}
          progress={
            <ProgressPanel
              messages={council.messages}
              loadingStatus={council.loadingStatus}
              isLoading={council.isLoading}
              outputs={council.outputs}
              onOpenOutput={handleOpenOutput}
            />
          }
          docs={
            <DocumentSurface
              docs={workspace.availableDocs}
              activeDoc={documentState.activeDoc}
              content={documentState.content}
              isLoading={documentState.isLoading}
              workspacePath={workspace.workspace.path}
              onOpenDocument={handleOpenDocument}
              onAddReference={handleReferenceDocument}
            />
          }
        />
      }
      sidecarTab={panels.sidecarTab}
      onSidecarTabChange={panels.setSidecarTab}
      sidecarVisible={panels.sidecarVisible}
      onToggleSidecar={panels.toggleSidecar}
      floatingPanel={
        <RunInspector
          visible={panels.panelVisible}
          panelPhase={council.panelPhase}
          roleStreamStates={council.roleStreamStates}
          lastRoundSnapshot={council.lastRoundSnapshot}
          roles={council.allRoles}
          messages={council.messages}
          outputs={council.outputs}
          references={workspace.selectedRefs}
          workspacePath={workspace.workspace.path}
          userMessage={council.messages.filter((m) => m.senderType === "user").slice(-1)[0]?.content}
          activeRoleIdsFromMessages={activeRoleIds}
          roleHistories={council.roleHistories}
          contextDebug={workspace.contextDebug}
          onToggle={panels.togglePanel}
          onStopRole={council.handleStopRole}
          onRemoveRole={council.handleRemoveRole}
          onJumpToMessage={handleJumpToMessage}
          onAddPerspective={council.handleAddPerspective}
          suggestedPerspectives={council.lastRoutingDecision?.decision.suggestedPerspectives}
          onOpenWriteProposals={panels.openWriteProposalPanel}
          onOpenMemoryReview={panels.openMemoryReviewPanel}
          onOpenSessionSummary={panels.openSessionSummaryPanel}
        />
      }
      composer={
        <>
          {workspace.showRefPicker && (
            <RefPicker
              docs={workspace.availableDocs}
              onSelect={workspace.addRef}
              onClose={workspace.closeRefPicker}
            />
          )}
          <Composer
            onSend={handleSend}
            isLoading={council.isLoading}
            onStop={council.handleStop}
            references={workspace.selectedRefs}
            onRemoveRef={workspace.removeRef}
            perspectiveChips={council.pendingPerspectiveChips}
            onRemovePerspectiveChip={council.handleRemovePerspectiveChip}
            availableDocs={workspace.availableDocs}
            availableRoles={council.allRoles}
            onAddRef={workspace.addRef}
            onAddRole={(role: any) => council.handleAddPerspective(role.id, role.name)}
            workspaceName={workspace.workspace.name}
          />
        </>
      }
      onAddRef={workspace.toggleRefPicker}
      onOpenSettings={panels.openSettings}
      rooms={council.rooms}
      activeRoomId={council.roomIdRef.current}
      onSelectRoom={handleSelectRoom}
      onNewRoom={handleNewRoom}
      onDeleteRoom={handleDeleteRoom}
      onRenameRoom={handleRenameRoom}
      onOpenContextGraph={() => setActiveView("contextGraph")}
      showScrollToBottom={!isNearBottom}
      newMsgCount={newMsgCount}
      onScrollToBottom={() => jumpFnsRef.current?.scrollToBottom()}
      panelVisible={panels.panelVisible}
      onTogglePanel={panels.togglePanel}
      roomMode={council.roomMode}
      onRoomModeChange={council.setRoomMode}
      terminalVisible={panels.terminalVisible}
      onToggleTerminal={panels.toggleTerminal}
      workspacePath={workspace.workspace.path}
      isLoading={council.isLoading}
    />
    <ReviewPanelHost
      showWriteProposalPanel={panels.showWriteProposalPanel}
      showMemoryReviewPanel={panels.showMemoryReviewPanel}
      showSessionSummaryPanel={panels.showSessionSummaryPanel}
      onCloseWriteProposalPanel={panels.closeWriteProposalPanel}
      onCloseMemoryReviewPanel={panels.closeMemoryReviewPanel}
      onCloseSessionSummaryPanel={panels.closeSessionSummaryPanel}
      onOpenMemoryReviewPanel={panels.openMemoryReviewPanel}
    />
    {panels.showSettings && (
      <SettingsModal
        onClose={panels.closeSettings}
        onConfigChanged={council.handleConfigChanged}
        workspacePath={workspace.workspace.path}
      />
    )}
    {council.dispatchGate && (
      <DispatchGateHost
        context={council.dispatchGate}
        selectedRoleIds={council.dispatchSelectedRoleIds}
        onSelectionChange={council.setDispatchSelectedRoleIds}
        onCancel={council.handleDispatchCancel}
        onContinue={handleDispatchContinue}
      />
    )}
    </I18nProvider>
    </ThemeProvider>
  );
};
