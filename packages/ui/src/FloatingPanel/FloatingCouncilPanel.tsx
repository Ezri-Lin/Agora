import React, { useState, useEffect, useCallback } from "react";
import type { RoleCard, CouncilRoundSnapshot, CouncilMessage } from "@agora/shared";
import type { RoleStreamState } from "../CouncilMonitor/CouncilMonitor.js";
import { useTheme } from "../theme/ThemeContext.js";
import { useI18n } from "../i18n/I18nContext.js";
import type { ColorPalette } from "../theme/palettes.js";
import type { Translations } from "../i18n/translations.js";
import { ProgressSection } from "./ProgressSection.js";
import { AccordionSection } from "./AccordionSection.js";
import { SuggestedRolesSection } from "./SuggestedRolesSection.js";
import { getBridge } from "../AgoraBridge.js";

interface SourceRef {
  path: string;
  label: string;
}

interface FloatingCouncilPanelProps {
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
  onCollapse?: () => void;
  onInviteRole?: (roleId: string) => void;
}

export const FloatingCouncilPanel: React.FC<FloatingCouncilPanelProps> = ({
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
  onCollapse,
  onInviteRole,
}) => {
  const { colors } = useTheme();
  const { t } = useI18n();
  const [userExpanded, setUserExpanded] = useState(false);
  const [memoryCount, setMemoryCount] = useState(0);

  const isIdle = panelPhase === "idle";
  const isRunning = panelPhase === "running";
  const isCompleted = panelPhase === "completed";
  const isError = panelPhase === "error";
  const showExpanded = isRunning || isCompleted || isError || userExpanded;

  // Auto-expand on running
  useEffect(() => {
    if (isRunning) setUserExpanded(true);
  }, [isRunning]);

  // Collapse when idle
  useEffect(() => {
    if (isIdle) setUserExpanded(false);
  }, [isIdle]);

  // Fetch memory count
  useEffect(() => {
    if (!workspacePath) return;
    const bridge = getBridge();
    if (!bridge) return;
    bridge.room.getMemories(workspacePath).then((mems) => {
      setMemoryCount(mems.length);
    }).catch(() => {});
  }, [workspacePath, isCompleted]);

  // Role results from messages (completed roles)
  const roleResults = messages.filter((m) => m.senderType === "role" && m.status !== "error" && m.content.length > 0);

  if (isIdle && !userExpanded) {
    return (
      <button style={pillStyle(colors)} onClick={() => setUserExpanded(true)}>
        {t.councilMonitor}
      </button>
    );
  }

  const activeRoles = roles.filter((r) => roleStreamStates.has(r.id));
  const doneCount = [...roleStreamStates.values()].filter((s) => s.status === "done").length;

  return (
    <div style={panelStyle(colors)}>
      {/* Header */}
      <div style={headerStyle(colors)}>
        <span style={headerTitleStyle(colors)}>
          {isRunning ? `${doneCount}/${activeRoles.length}` : isCompleted ? t.roleDone : t.councilMonitor}
        </span>
        <button style={collapseBtnStyle(colors)} onClick={() => { setUserExpanded(false); onCollapse?.(); }}>
          ✕
        </button>
      </div>

      <div style={scrollAreaStyle}>
        {/* Progress section (during running) */}
        {isRunning && activeRoles.length > 0 && (
          <ProgressSection roles={roles} roleStates={roleStreamStates} />
        )}

        {/* Role results (after completion) */}
        {isCompleted && roleResults.length > 0 && (
          <div style={sectionStyle}>
            <div style={sectionTitleStyle(colors)}>{t.participants} ({roleResults.length})</div>
            {roleResults.map((msg) => {
              const role = roles.find((r) => r.id === msg.senderId);
              const name = role?.name ?? msg.senderId;
              const summary = msg.graphSummary || msg.content.slice(0, 80);
              return (
                <div key={msg.id} style={roleResultCardStyle(colors)}>
                  <span style={roleResultNameStyle(colors)}>{name}</span>
                  <span style={roleResultSummaryStyle(colors)}>{summary}</span>
                </div>
              );
            })}
          </div>
        )}

        {/* Snapshot summary */}
        {isCompleted && lastRoundSnapshot && (
          <>
            <Divider colors={colors} />
            <div style={snapshotSummaryStyle(colors)}>
              {lastRoundSnapshot.doneCount} {t.roleDone}
              {lastRoundSnapshot.errorCount > 0 ? ` · ${lastRoundSnapshot.errorCount} ${t.roleError}` : ""}
            </div>
          </>
        )}

        {/* Suggested roles */}
        {isCompleted && (
          <>
            <Divider colors={colors} />
            <SuggestedRolesSection
              allRoles={roles}
              activeRoleIds={activeRoleIdsFromMessages ?? new Set(roleStreamStates.keys())}
              userMessage={userMessage}
              onInvite={onInviteRole}
            />
          </>
        )}

        {/* Sources */}
        <Divider colors={colors} />
        <AccordionSection title={`${t.references} (${references.length})`} defaultOpen={false}>
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
        <AccordionSection title={`${t.outputs} (${outputs.length})`} defaultOpen={false}>
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
        <AccordionSection title={`${t.memories} (${memoryCount})`} defaultOpen={false}>
          {memoryCount === 0 ? (
            <div style={emptyStyle(colors)}>{t.noMemories}</div>
          ) : (
            <div style={memoryHintStyle(colors)}>
              {memoryCount} {t.accepted}
              <button style={memoryLinkStyle(colors)} onClick={() => {
                // Switch to memories tab in Inspector if available
              }}>
                {t.expand}
              </button>
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

const pillStyle = (colors: ColorPalette): React.CSSProperties => ({
  position: "absolute",
  bottom: 16,
  right: 16,
  background: colors.surface,
  border: `1px solid ${colors.border}`,
  borderRadius: 20,
  padding: "6px 14px",
  fontSize: 11,
  fontWeight: 600,
  color: colors.textMuted,
  cursor: "pointer",
  boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
  zIndex: 20,
});

const panelStyle = (colors: ColorPalette): React.CSSProperties => ({
  position: "absolute",
  bottom: 16,
  right: 16,
  width: 280,
  maxHeight: "calc(100vh - 120px)",
  background: colors.bg,
  border: `1px solid ${colors.border}`,
  borderRadius: 10,
  boxShadow: "0 8px 32px rgba(0,0,0,0.2)",
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
  padding: "8px 12px",
};

const sectionTitleStyle = (colors: ColorPalette): React.CSSProperties => ({
  fontSize: 10,
  fontWeight: 600,
  color: colors.textMuted,
  textTransform: "uppercase",
  letterSpacing: 0.5,
  marginBottom: 6,
});

const snapshotSummaryStyle = (colors: ColorPalette): React.CSSProperties => ({
  padding: "6px 12px",
  fontSize: 10,
  color: colors.textMuted,
});

const roleResultCardStyle = (colors: ColorPalette): React.CSSProperties => ({
  padding: "4px 0",
  borderBottom: `1px solid ${colors.border}`,
});

const roleResultNameStyle = (colors: ColorPalette): React.CSSProperties => ({
  fontSize: 10,
  fontWeight: 600,
  color: colors.text,
  display: "block",
  marginBottom: 2,
});

const roleResultSummaryStyle = (colors: ColorPalette): React.CSSProperties => ({
  fontSize: 10,
  color: colors.textMuted,
  lineHeight: 1.4,
  display: "-webkit-box",
  WebkitLineClamp: 2,
  WebkitBoxOrient: "vertical",
  overflow: "hidden",
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
  display: "flex",
  alignItems: "center",
  gap: 6,
  padding: "4px 0",
});

const memoryLinkStyle = (colors: ColorPalette): React.CSSProperties => ({
  background: "none",
  border: "none",
  color: colors.accent,
  fontSize: 10,
  cursor: "pointer",
  padding: 0,
});
