import React, { useEffect, useMemo, useRef, useState } from "react";
import { useTheme } from "../theme/ThemeContext.js";
import { getBridge } from "../AgoraBridge.js";
import { ActiveRolesSection } from "./ActiveRolesSection.js";
import { ContextSection } from "./ContextSection.js";
import { MemorySection } from "./MemorySection.js";
import { OutputsSection } from "./OutputsSection.js";
import { ProgressSection } from "./ProgressSection.js";
import { ReferencesSection } from "./ReferencesSection.js";
import { RunInspectorHeader } from "./RunInspectorHeader.js";
import { SuggestedRolesSection } from "./SuggestedRolesSection.js";
import { inspectorPanelStyle, mutedTextStyle, scrollAreaStyle } from "./runInspectorStyles.js";
import type { RunInspectorProps } from "./types.js";

export const RunInspector: React.FC<RunInspectorProps> = ({
  visible,
  panelPhase,
  roleStreamStates,
  lastRoundSnapshot,
  roles,
  messages,
  outputs,
  references,
  workspacePath,
  userMessage,
  activeRoleIdsFromMessages,
  roleHistories,
  memoryCount,
  contextDebug,
  onToggle,
  onInviteRole,
  onStopRole,
  onRemoveRole,
  onJumpToMessage,
  onAddPerspective,
  suggestedPerspectives,
  onOpenWriteProposals,
  onOpenMemoryReview,
  onOpenSessionSummary,
}) => {
  const { colors } = useTheme();
  const panelRef = useRef<HTMLDivElement>(null);
  const [fetchedMemoryCount, setFetchedMemoryCount] = useState(0);

  useEffect(() => {
    if (memoryCount !== undefined || !workspacePath) return;
    const bridge = getBridge();
    if (!bridge) return;
    bridge.room.getMemories(workspacePath).then((mems) => {
      setFetchedMemoryCount(mems.length);
    }).catch(() => {});
  }, [workspacePath, memoryCount, panelPhase]);

  const activeRoleIds = useMemo(() => {
    const ids = new Set(roleStreamStates.keys());
    for (const msg of messages) {
      if (msg.senderType === "role" && msg.status !== "error") {
        ids.add(msg.senderId);
      }
    }
    return ids;
  }, [messages, roleStreamStates]);

  const activeRoleCards = useMemo(
    () => roles.filter((role) => activeRoleIds.has(role.id)),
    [activeRoleIds, roles],
  );
  const doneCount = [...roleStreamStates.values()].filter((state) => state.status === "done").length;
  const totalActive = activeRoleCards.length;
  const resolvedMemoryCount = memoryCount ?? fetchedMemoryCount;

  if (!visible) return null;

  return (
    <aside
      className="inspector"
      ref={panelRef}
      style={{ display: visible ? "block" : "none" }}
    >
      <div className="inspector-head">
        <b>Run Inspector</b>
        <label className="close" onClick={onToggle} style={{ cursor: "pointer" }}>×</label>
      </div>

      <div className="ins-scroll">
        <ProgressSection roles={roles} roleStates={roleStreamStates} colors={colors} />
        <ActiveRolesSection
          roles={activeRoleCards}
          roleStates={roleStreamStates}
          roleHistories={roleHistories}
          colors={colors}
          panelRef={panelRef}
          onStopRole={onStopRole}
          onRemoveRole={onRemoveRole}
          onJumpToMessage={onJumpToMessage}
        />
        {lastRoundSnapshot && (
          <div style={{ ...mutedTextStyle(colors), marginBottom: 8 }}>
            {lastRoundSnapshot.doneCount} done
            {lastRoundSnapshot.errorCount > 0 ? ` · ${lastRoundSnapshot.errorCount} errors` : ""}
          </div>
        )}
        <ReferencesSection references={references} colors={colors} />
        <OutputsSection
          outputs={outputs}
          colors={colors}
          onOpenWriteProposals={onOpenWriteProposals}
          onOpenSessionSummary={onOpenSessionSummary}
        />
        <MemorySection
          memoryCount={resolvedMemoryCount}
          colors={colors}
          onOpenMemoryReview={onOpenMemoryReview}
        />
        <ContextSection contextDebug={contextDebug} colors={colors} />
        {panelPhase === "completed" && (
          <SuggestedRolesSection
            allRoles={roles}
            activeRoleIds={activeRoleIdsFromMessages ?? activeRoleIds}
            userMessage={userMessage}
            suggestedPerspectives={suggestedPerspectives}
            onInvite={onInviteRole}
            onAddPerspective={onAddPerspective}
          />
        )}
      </div>
    </aside>
  );
};

export type { ContextDebug, RunInspectorProps } from "./types.js";
