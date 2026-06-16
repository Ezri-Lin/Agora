import React, { useCallback, useMemo, useRef, useState } from "react";
import type { ScannedDoc } from "./AgoraBridge.js";
import { getBridge } from "./AgoraBridge.js";
import { AppShell } from "./AppShell/AppShell.js";
import type { AppView } from "./AppShell/AppShell.types.js";
import { ContextGraph } from "./ContextGraph/ContextGraph.js";
import { CouncilRoom } from "./CouncilRoom/CouncilRoom.js";
import { NextActionChips } from "./CouncilRoom/NextActionChips.js";
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
    const data = await council.handleSelectRoom(roomId, workspace.workspace.path);
    if (data) {
      const room = data.room as Record<string, unknown>;
      panels.setPausedRoleIds((room.pausedRoleIds as string[]) ?? []);
      panels.setRemovedRoleIds((room.removedRoleIds as string[]) ?? []);
      panels.setIncludedRoleIds((room.includedRoleIds as string[]) ?? []);
    }
    setActiveView("room");
  }, [workspace.workspace, council.handleSelectRoom, panels.setPausedRoleIds, panels.setRemovedRoleIds, panels.setIncludedRoleIds]);

  const stageRoleState = useMemo(() => ({
    excludedRoleIds: [...panels.pausedRoleIds, ...panels.removedRoleIds],
    includedRoleIds: panels.includedRoleIds,
  }), [panels.pausedRoleIds, panels.removedRoleIds, panels.includedRoleIds]);

  const handleSend = useCallback(async (text: string, params: { roomMode: string; maxRoles: number; autoInvite: boolean }, targetedRoles?: any[]) => {
    council.setRoomMode(params.roomMode as any);
    setActiveView("room");
    await council.handleSend(text, workspace.workspace!, workspace.selectedRefs, targetedRoles, {
      maxRoles: params.maxRoles,
      autoInvite: params.autoInvite,
    }, params.roomMode as any, stageRoleState);
  }, [workspace.workspace, workspace.selectedRefs, council.handleSend, council.setRoomMode, stageRoleState]);

  const handleDispatchContinue = useCallback(async (selectedRoleIds: string[]) => {
    if (!workspace.workspace) return;
    await council.handleDispatchContinue(selectedRoleIds, workspace.workspace, workspace.selectedRefs, stageRoleState);
  }, [workspace.workspace, workspace.selectedRefs, council.handleDispatchContinue, stageRoleState]);

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

  const handleRoleFocus = useCallback((roleId: string | null) => {
    panels.setFocusedRoleId(roleId);
  }, [panels.setFocusedRoleId]);

  // --- Stage role management (persist to room.json) ---
  const toggleId = useCallback((ids: string[], id: string): string[] => {
    const s = new Set(ids);
    s.has(id) ? s.delete(id) : s.add(id);
    return [...s];
  }, []);

  const persistRoomPatch = useCallback(async (patch: Record<string, unknown>) => {
    const bridge = getBridge();
    const roomId = council.roomIdRef.current;
    const wsPath = workspace.workspace?.path;
    if (bridge && wsPath && roomId) {
      await bridge.room.update(wsPath, roomId, patch);
    }
  }, [workspace.workspace?.path, council.roomIdRef]);

  const handleTogglePause = useCallback(async (roleId: string) => {
    const nextPaused = toggleId(panels.pausedRoleIds, roleId);
    const nextRemoved = panels.removedRoleIds.filter(id => id !== roleId);
    panels.setPausedRoleIds(nextPaused);
    panels.setRemovedRoleIds(nextRemoved);
    await persistRoomPatch({ pausedRoleIds: nextPaused, removedRoleIds: nextRemoved });
  }, [panels.pausedRoleIds, panels.removedRoleIds, panels.setPausedRoleIds, panels.setRemovedRoleIds, toggleId, persistRoomPatch]);

  const handleToggleRemove = useCallback(async (roleId: string) => {
    const nextRemoved = toggleId(panels.removedRoleIds, roleId);
    const nextPaused = panels.pausedRoleIds.filter(id => id !== roleId);
    panels.setRemovedRoleIds(nextRemoved);
    panels.setPausedRoleIds(nextPaused);
    await persistRoomPatch({ removedRoleIds: nextRemoved, pausedRoleIds: nextPaused });
  }, [panels.removedRoleIds, panels.pausedRoleIds, panels.setRemovedRoleIds, panels.setPausedRoleIds, toggleId, persistRoomPatch]);

  const handleAddExcluded = useCallback(async (roleId: string) => {
    const nextRemoved = panels.removedRoleIds.filter(id => id !== roleId);
    const nextPaused = panels.pausedRoleIds.filter(id => id !== roleId);
    const nextIncluded = panels.includedRoleIds.includes(roleId)
      ? panels.includedRoleIds
      : [...panels.includedRoleIds, roleId];
    panels.setRemovedRoleIds(nextRemoved);
    panels.setPausedRoleIds(nextPaused);
    panels.setIncludedRoleIds(nextIncluded);
    await persistRoomPatch({ removedRoleIds: nextRemoved, pausedRoleIds: nextPaused, includedRoleIds: nextIncluded });
  }, [panels.removedRoleIds, panels.pausedRoleIds, panels.includedRoleIds, panels.setRemovedRoleIds, panels.setPausedRoleIds, panels.setIncludedRoleIds, persistRoomPatch]);

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

  // Stage roles: only roles that have spoken in this room, excluding moderator
  const stageRoles = useMemo(
    () => council.allRoles.filter((r) => activeRoleIds.has(r.id) && r.id !== "moderator"),
    [council.allRoles, activeRoleIds]
  );

  // Excluded roles: AI-scored but blocked by cap/routing
  const routingExcludedRoles = useMemo(() => {
    const decision = council.lastRoutingDecision?.decision;
    if (!decision) return [];
    const activeIds = activeRoleIds;
    const removedIds = new Set(panels.removedRoleIds);
    const includedIds = new Set(panels.includedRoleIds);
    const excludedIds = new Set(
      decision.scores.filter(s => s.blockedBy).map(s => s.personaId)
    );
    for (const id of activeIds) excludedIds.delete(id);
    for (const id of removedIds) excludedIds.delete(id);
    for (const id of includedIds) excludedIds.delete(id);
    return council.allRoles.filter(r => excludedIds.has(r.id) && r.id !== "moderator");
  }, [council.lastRoutingDecision, council.allRoles, activeRoleIds, panels.removedRoleIds, panels.includedRoleIds]);

  // Stage display: active + excluded + paused + removed + included (deduped)
  const stageDisplayRoles = useMemo(() => {
    const map = new Map<string, typeof council.allRoles[0]>();
    for (const r of stageRoles) map.set(r.id, r);
    for (const r of routingExcludedRoles) { if (!map.has(r.id)) map.set(r.id, r); }
    for (const r of council.allRoles) {
      if (panels.pausedRoleIds.includes(r.id)) map.set(r.id, r);
      if (panels.removedRoleIds.includes(r.id)) map.set(r.id, r);
      if (panels.includedRoleIds.includes(r.id)) map.set(r.id, r);
    }
    map.delete("moderator");
    return [...map.values()];
  }, [stageRoles, routingExcludedRoles, council.allRoles, panels.pausedRoleIds, panels.removedRoleIds, panels.includedRoleIds]);

  // Excluded role IDs for Stage visual state
  const excludedRoleIds = useMemo(
    () => new Set(routingExcludedRoles.map(r => r.id)),
    [routingExcludedRoles]
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
      stageVisible={panels.stageVisible}
      onToggleStage={panels.toggleStage}
      focusedRoleId={panels.focusedRoleId}
      onRoleFocus={handleRoleFocus}
      roles={stageDisplayRoles}
      messages={council.messages}
      pausedRoleIds={panels.pausedRoleIds}
      removedRoleIds={panels.removedRoleIds}
      excludedRoleIds={[...excludedRoleIds]}
      onTogglePause={handleTogglePause}
      onToggleRemove={handleToggleRemove}
      onAddExcluded={handleAddExcluded}
      home={
        <WorkspaceHome
          graph={<WorkspaceGraph docs={workspace.availableDocs} rooms={council.rooms} workspacePath={workspace.workspace.path} />}
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
          <div className="graph-controls" style={{ display: "none" }}>
            <h3>Graph display</h3>
            <div className="layer-row"><span>Documents / backlinks</span><span className="switch on" /></div>
            <div className="layer-row"><span>Rooms</span><span className="switch" /></div>
            <div className="layer-row"><span>Role red / green links</span><span className="switch on" /></div>
            <div className="layer-row"><span>Claims / memory</span><span className="switch" /></div>
            <div className="layer-row"><span>Density</span><span className="pill">Clean ▾</span></div>
          </div>
          <div style={{ position: "absolute", inset: 0 }}>
            <WorkspaceGraph
              docs={workspace.availableDocs}
              rooms={council.rooms}
              workspacePath={workspace.workspace.path}
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
            focusedRoleId={panels.focusedRoleId}
            onRegisterJumpFns={handleRegisterJumpFns}
            onNearBottomChange={setIsNearBottom}
            onNewMsgCountChange={setNewMsgCount}
          />
          {council.panelPhase === "completed" && (
            <NextActionChips onResult={(result) => {
              console.log("[NextAction]", result.kind, "→", result.execute);
              // v1: discard clears the action surface; others log only for now
              if (result.kind === "discard") {
                // Panel auto-resets to idle via timer in useCouncilState
              }
            }} />
          )}
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
