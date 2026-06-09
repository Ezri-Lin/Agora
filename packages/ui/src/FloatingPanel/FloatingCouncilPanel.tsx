import React, { useState, useEffect, useRef } from "react";
import type { RoleCard, CouncilRoundSnapshot, CouncilMessage, RoleRoundHistory, SuggestedPerspective } from "@agora/shared";
import type { RoleStreamState } from "../CouncilMonitor/CouncilMonitor.js";
import { useTheme } from "../theme/ThemeContext.js";
import { useI18n } from "../i18n/I18nContext.js";
import type { ColorPalette } from "../theme/palettes.js";
import { ProgressSection } from "./ProgressSection.js";
import { AccordionSection } from "./AccordionSection.js";
import { SuggestedRolesSection } from "./SuggestedRolesSection.js";
import { RoleCardItem } from "./RoleCardItem.js";
import { getBridge } from "../AgoraBridge.js";

interface SourceRef {
  path: string;
  label: string;
}

interface FloatingCouncilPanelProps {
  visible: boolean;
  panelPhase: "idle" | "running" | "completed" | "error";
  roleStreamStates: Map<string, RoleStreamState>;
  lastRoundSnapshot: CouncilRoundSnapshot | null;
  roles: RoleCard[];
  messages: CouncilMessage[];
  outputs: string[];
  references: SourceRef[];
  workspacePath?: string;
  userMessage?: string;
  activeRoleIdsFromMessages?: Set<string>;
  roleHistories?: Map<string, RoleRoundHistory[]>;
  onToggle?: () => void;
  onInviteRole?: (roleId: string) => void;
  onStopRole?: (roleId: string) => void;
  onRemoveRole?: (roleId: string) => void;
  onJumpToMessage?: (messageId: string) => void;
  onAddPerspective?: (roleId: string, roleName: string) => void;
  suggestedPerspectives?: SuggestedPerspective[];
}

export const FloatingCouncilPanel: React.FC<FloatingCouncilPanelProps> = ({
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
  onToggle,
  onInviteRole,
  onStopRole,
  onRemoveRole,
  onJumpToMessage,
  onAddPerspective,
  suggestedPerspectives,
}) => {
  const { colors } = useTheme();
  const { t } = useI18n();
  const panelRef = useRef<HTMLDivElement>(null);
  const [memoryCount, setMemoryCount] = useState(0);

  const isRunning = panelPhase === "running";
  const isCompleted = panelPhase === "completed";

  // Fetch memory count
  useEffect(() => {
    if (!workspacePath) return;
    const bridge = getBridge();
    if (!bridge) return;
    bridge.room.getMemories(workspacePath).then((mems) => {
      setMemoryCount(mems.length);
    }).catch(() => {});
  }, [workspacePath, isCompleted]);

  // Active roles: those with stream states or recent role messages
  const activeRoleIds = new Set(roleStreamStates.keys());
  // Also include roles that have messages in this round
  for (const msg of messages) {
    if (msg.senderType === "role" && msg.status !== "error") {
      activeRoleIds.add(msg.senderId);
    }
  }

  const activeRoleCards = roles.filter((r) => activeRoleIds.has(r.id));
  const doneCount = [...roleStreamStates.values()].filter((s) => s.status === "done").length;
  const totalActive = activeRoleCards.length;

  if (!visible) return null;

  return (
    <div ref={panelRef} style={panelStyle(colors)}>
      {/* Header */}
      <div style={headerStyle(colors)}>
        <span style={headerTitleStyle(colors)}>
          {isRunning
            ? `${t.activeRoles} · ${doneCount}/${totalActive}`
            : isCompleted ? t.roleDone : t.councilMonitor}
        </span>
        <button style={collapseBtnStyle(colors)} onClick={onToggle}>✕</button>
      </div>

      <div style={scrollAreaStyle}>
        {/* Progress indicator during running */}
        {isRunning && totalActive > 0 && (
          <ProgressSection roles={roles} roleStates={roleStreamStates} />
        )}

        {/* Active Roles — role-grouped cards */}
        {activeRoleCards.length > 0 && (
          <div style={sectionStyle}>
            <div style={sectionTitleStyle(colors)}>
              {t.activeRoles} ({activeRoleCards.length})
            </div>
            {activeRoleCards.map((role) => {
              const state = roleStreamStates.get(role.id);
              const history = roleHistories?.get(role.id) ?? [];
              return (
                <RoleCardItem
                  key={role.id}
                  roleId={role.id}
                  roleName={role.name}
                  state={state}
                  history={history}
                  onStopTurn={isRunning && state?.status !== "done" ? () => onStopRole?.(role.id) : undefined}
                  onRemove={() => onRemoveRole?.(role.id)}
                  onJumpToMessage={onJumpToMessage}
                  colors={colors}
                  panelRef={panelRef}
                />
              );
            })}
          </div>
        )}

        {/* Snapshot summary */}
        {lastRoundSnapshot && (
          <>
            <Divider colors={colors} />
            <div style={snapshotSummaryStyle(colors)}>
              {lastRoundSnapshot.doneCount} {t.roleDone}
              {lastRoundSnapshot.errorCount > 0 ? ` · ${lastRoundSnapshot.errorCount} ${t.roleError}` : ""}
            </div>
          </>
        )}

        {/* Suggested roles (after completion) */}
        {isCompleted && (
          <>
            <Divider colors={colors} />
            <SuggestedRolesSection
              allRoles={roles}
              activeRoleIds={activeRoleIdsFromMessages ?? activeRoleIds}
              userMessage={userMessage}
              suggestedPerspectives={suggestedPerspectives}
              onInvite={onInviteRole}
              onAddPerspective={onAddPerspective}
            />
          </>
        )}

        {/* Sources */}
        <Divider colors={colors} />
        <AccordionSection title={`${t.sources} (${references.length})`} defaultOpen={false}>
          {references.length === 0 ? (
            <div style={emptyStyle(colors)}>{t.noReferences}</div>
          ) : references.map((r) => (
            <div key={r.path} style={itemRowStyle(colors)}>
              <span style={itemIconStyle}>#</span>
              <span style={itemLabelStyle(colors)}>{r.label}</span>
            </div>
          ))}
        </AccordionSection>

        {/* Outputs */}
        <AccordionSection title={`${t.outputs_} (${outputs.length})`} defaultOpen={false}>
          {outputs.length === 0 ? (
            <div style={emptyStyle(colors)}>{t.noOutputs}</div>
          ) : outputs.map((f, i) => (
            <div key={i} style={itemRowStyle(colors)}>
              <span style={itemIconStyle}>📄</span>
              <span style={itemLabelStyle(colors)}>{f}</span>
            </div>
          ))}
        </AccordionSection>

        {/* Memory */}
        <AccordionSection title={`${t.memory_} (${memoryCount})`} defaultOpen={false}>
          {memoryCount === 0 ? (
            <div style={emptyStyle(colors)}>{t.noMemories}</div>
          ) : (
            <div style={memoryHintStyle(colors)}>
              {memoryCount} {t.accepted}
            </div>
          )}
        </AccordionSection>
      </div>
    </div>
  );
};

// --- Sub-components ---

const Divider: React.FC<{ colors: ColorPalette }> = ({ colors }) => (
  <div style={{ borderBottom: `1px solid ${colors.border}`, margin: "0 12px" }} />
);

// --- Styles ---

const panelStyle = (colors: ColorPalette): React.CSSProperties => ({
  position: "absolute",
  top: 0,
  right: 0,
  width: 280,
  height: "100%",
  background: colors.bg,
  borderLeft: `1px solid ${colors.border}`,
  zIndex: 20,
  display: "flex",
  flexDirection: "column",
  overflow: "hidden",
});

const headerStyle = (colors: ColorPalette): React.CSSProperties => ({
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: "8px 12px",
  borderBottom: `1px solid ${colors.border}`,
  flexShrink: 0,
});

const headerTitleStyle = (colors: ColorPalette): React.CSSProperties => ({
  fontSize: 11,
  fontWeight: 600,
  color: colors.textMuted,
  textTransform: "uppercase",
  letterSpacing: 0.5,
});

const collapseBtnStyle = (colors: ColorPalette): React.CSSProperties => ({
  background: "none",
  border: "none",
  color: colors.textMuted,
  fontSize: 12,
  cursor: "pointer",
  padding: "2px 4px",
});

const scrollAreaStyle: React.CSSProperties = {
  flex: 1,
  overflowY: "auto",
};

const sectionStyle: React.CSSProperties = {
  padding: "8px 0",
};

const sectionTitleStyle = (colors: ColorPalette): React.CSSProperties => ({
  fontSize: 10,
  fontWeight: 600,
  color: colors.textMuted,
  textTransform: "uppercase",
  letterSpacing: 0.5,
  marginBottom: 4,
  padding: "0 12px",
});

const snapshotSummaryStyle = (colors: ColorPalette): React.CSSProperties => ({
  padding: "6px 12px",
  fontSize: 10,
  color: colors.textMuted,
});

const emptyStyle = (colors: ColorPalette): React.CSSProperties => ({
  fontSize: 10,
  color: colors.textMuted,
  padding: "4px 0",
  textAlign: "center",
});

const itemRowStyle = (colors: ColorPalette): React.CSSProperties => ({
  display: "flex",
  alignItems: "center",
  gap: 6,
  padding: "3px 0",
});

const itemIconStyle: React.CSSProperties = {
  fontSize: 11,
  flexShrink: 0,
};

const itemLabelStyle = (colors: ColorPalette): React.CSSProperties => ({
  fontSize: 11,
  color: colors.text,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
});

const memoryHintStyle = (colors: ColorPalette): React.CSSProperties => ({
  fontSize: 10,
  color: colors.textMuted,
  padding: "4px 0",
});
