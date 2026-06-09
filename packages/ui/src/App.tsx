import React, { useCallback, useRef } from "react";
import type { RoleCard } from "@agora/shared";
import { getPersonaContract } from "@agora/roles";
import { AppShell } from "./AppShell/AppShell.js";
import { ContextGraph } from "./ContextGraph/ContextGraph.js";
import { CouncilRoom } from "./CouncilRoom/CouncilRoom.js";
import { Composer } from "./Composer/Composer.js";
import { RunInspector } from "./RunInspector/RunInspector.js";
import { EmptyState } from "./EmptyState.js";
import { RefPicker } from "./RefPicker.js";
import { SettingsModal } from "./Settings/SettingsModal.js";
import { ReviewPanelHost } from "./ReviewPanels/ReviewPanelHost.js";
import { errorStyle } from "./appStyles.js";
import { overlayStyle, panelStyle } from "./CouncilDispatchGate/styles.js";
import { CouncilDispatchGate, type RoleViewModel } from "./CouncilDispatchGate/CouncilDispatchGate.js";
import { getDomainLabel } from "./CouncilDispatchGate/roleAvatar.js";
import { I18nProvider } from "./i18n/I18nContext.js";
import { ThemeProvider } from "./theme/ThemeContext.js";
import { usePanelState } from "./hooks/usePanelState.js";
import { useWorkspaceState } from "./hooks/useWorkspaceState.js";
import { useCouncilState } from "./hooks/useCouncilState.js";

export const App: React.FC = () => {
  const panels = usePanelState();
  const council = useCouncilState();
  const workspace = useWorkspaceState(council.loadWorkspaceData);

  const jumpFnsRef = useRef<{ scrollToMessage: (id: string) => void; highlightMessage: (id: string, ms?: number) => void } | null>(null);

  const handleSelectRoom = useCallback(async (roomId: string) => {
    if (!workspace.workspace) return;
    await council.handleSelectRoom(roomId, workspace.workspace.path);
  }, [workspace.workspace, council.handleSelectRoom]);

  const handleSend = useCallback(async (text: string) => {
    if (!workspace.workspace) return;
    await council.handleSend(text, workspace.workspace, workspace.selectedRefs);
  }, [workspace.workspace, workspace.selectedRefs, council.handleSend]);

  const handleDispatchContinue = useCallback(async (selectedRoleIds: string[]) => {
    if (!workspace.workspace) return;
    await council.handleDispatchContinue(selectedRoleIds, workspace.workspace, workspace.selectedRefs);
  }, [workspace.workspace, workspace.selectedRefs, council.handleDispatchContinue]);

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

  const handleRegisterJumpFns = useCallback((fns: { scrollToMessage: (id: string) => void; highlightMessage: (id: string, ms?: number) => void }) => {
    jumpFnsRef.current = fns;
  }, []);

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
      workspaceName={workspace.workspace.name}
      onOpenWorkspace={workspace.openWorkspace}
      contextGraph={
        <ContextGraph
          messages={council.messages}
          selectedRefs={workspace.selectedRefs}
          roles={council.allRoles}
          roomId={council.roomIdRef.current}
          onNodeClick={handleNodeClick}
        />
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
          />
        </>
      }
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
          activeRoleIdsFromMessages={new Set(council.messages.filter((m) => m.senderType === "role").map((m) => m.senderId))}
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
            references={workspace.selectedRefs}
            onRemoveRef={workspace.removeRef}
            perspectiveChips={council.pendingPerspectiveChips}
            onRemovePerspectiveChip={council.handleRemovePerspectiveChip}
            onOpenRefPicker={workspace.toggleRefPicker}
            onOpenDispatchGate={/* dispatch gate requires a topic; opened via handleSend in council mode */ undefined}
          />
        </>
      }
      onAddRef={workspace.toggleRefPicker}
      onOpenSettings={panels.openSettings}
      rooms={council.rooms}
      activeRoomId={council.roomIdRef.current}
      onSelectRoom={handleSelectRoom}
      onNewRoom={council.newRoom}
      panelVisible={panels.panelVisible}
      onTogglePanel={panels.togglePanel}
      roomMode={council.roomMode}
      onRoomModeChange={council.setRoomMode}
      terminalVisible={panels.terminalVisible}
      onToggleTerminal={panels.toggleTerminal}
      workspacePath={workspace.workspace.path}
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
      <div style={overlayStyle} onClick={council.handleDispatchCancel}>
        <div
          role="dialog"
          aria-modal="true"
          aria-label="选择参与者"
          style={panelStyle({ surface: "#16213e", border: "#2a3a5c" })}
          onClick={(e) => e.stopPropagation()}
        >
          <CouncilDispatchGate
            preview={{
              moderatorSummary: council.dispatchGate.preview.moderatorSummary,
              defaultSelectedRoleIds: council.dispatchGate.preview.defaultSelectedRoleIds,
              alternativeRoleIds: council.dispatchGate.preview.alternativeRoleIds,
            }}
            roles={(() => {
              const scores = council.dispatchGate.preview.routingDecision.scores;
              const reasonMap = new Map<string, string>();
              for (const s of scores) {
                if (s.reason) reasonMap.set(s.personaId, s.reason);
              }
              for (const e of council.dispatchGate.preview.routingDecision.activeEntrants) {
                if (e.reason) reasonMap.set(e.roleId, e.reason);
              }
              return council.dispatchGate.allRoles.map((r): RoleViewModel => {
                const contract = getPersonaContract(r.id);
                return {
                  id: r.id,
                  name: r.name,
                  subtitle: r.subtitle,
                  domainId: r.domainId,
                  domainLabel: r.domainId ? getDomainLabel(r.domainId) : undefined,
                  familyId: r.familyId,
                  tags: r.tags,
                  reason: reasonMap.get(r.id),
                  source: council.dispatchGate!.preview.defaultSelectedRoleIds.includes(r.id)
                    ? "recommended"
                    : council.dispatchGate!.preview.alternativeRoleIds.includes(r.id)
                      ? "alternative"
                      : undefined,
                  bio: contract?.mission,
                  responsibilities: contract
                    ? [...contract.responsibilities.must, ...contract.responsibilities.should]
                    : undefined,
                  strengths: contract?.responsibilities.must,
                  boundaries: contract
                    ? [...contract.responsibilities.mustNot, ...contract.boundaries]
                    : undefined,
                  decisionRights: contract?.decisionRights.may,
                };
              });
            })()}
            selectedRoleIds={council.dispatchSelectedRoleIds}
            onSelectionChange={council.setDispatchSelectedRoleIds}
            onCancel={council.handleDispatchCancel}
            onContinue={handleDispatchContinue}
          />
        </div>
      </div>
    )}
    </I18nProvider>
    </ThemeProvider>
  );
};
