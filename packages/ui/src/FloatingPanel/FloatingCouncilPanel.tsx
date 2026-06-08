import React, { useState, useEffect } from "react";
import type { RoleCard, CouncilRoundSnapshot } from "@agora/shared";
import type { RoleStreamState } from "../CouncilMonitor/CouncilMonitor.js";
import { useTheme } from "../theme/ThemeContext.js";
import { useI18n } from "../i18n/I18nContext.js";
import type { ColorPalette } from "../theme/palettes.js";
import type { Translations } from "../i18n/translations.js";
import { ProgressSection } from "./ProgressSection.js";
import { AccordionSection } from "./AccordionSection.js";
import { SuggestedRolesSection } from "./SuggestedRolesSection.js";

interface SourceRef {
  path: string;
  label: string;
}

interface FloatingCouncilPanelProps {
  panelPhase: "idle" | "running" | "completed" | "error";
  roleStreamStates: Map<string, RoleStreamState>;
  lastRoundSnapshot: CouncilRoundSnapshot | null;
  roles: RoleCard[];
  outputs: string[];
  references: SourceRef[];
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
  outputs,
  references,
  userMessage,
  activeRoleIdsFromMessages,
  onCollapse,
  onInviteRole,
}) => {
  const { colors } = useTheme();
  const { t } = useI18n();
  const [userExpanded, setUserExpanded] = useState(false);

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

      {/* Progress section */}
      {activeRoles.length > 0 && (
        <ProgressSection roles={roles} roleStates={roleStreamStates} />
      )}

      {/* Snapshot summary when completed */}
      {isCompleted && lastRoundSnapshot && (
        <div style={snapshotSummaryStyle(colors)}>
          {lastRoundSnapshot.doneCount} {t.roleDone} · {lastRoundSnapshot.errorCount > 0 ? `${lastRoundSnapshot.errorCount} ${t.roleError}` : ""}
        </div>
      )}

      {/* Suggested roles */}
      {isCompleted && (
        <SuggestedRolesSection
          allRoles={roles}
          activeRoleIds={activeRoleIdsFromMessages ?? new Set(roleStreamStates.keys())}
          userMessage={userMessage}
          onInvite={onInviteRole}
        />
      )}

      {/* Accordion sections */}
      <div style={accordionWrapStyle}>
        {references.length > 0 && (
          <AccordionSection title={`${t.references} (${references.length})`} defaultOpen={false}>
            {references.map((r) => (
              <div key={r.path} style={itemRowStyle(colors)}>
                <span style={itemIconStyle}>#</span>
                <span style={itemLabelStyle(colors)}>{r.label}</span>
              </div>
            ))}
          </AccordionSection>
        )}
        {outputs.length > 0 && (
          <AccordionSection title={`${t.outputs} (${outputs.length})`} defaultOpen={false}>
            {outputs.map((f, i) => (
              <div key={i} style={itemRowStyle(colors)}>
                <span style={itemIconStyle}>📄</span>
                <span style={itemLabelStyle(colors)}>{f}</span>
              </div>
            ))}
          </AccordionSection>
        )}
      </div>
    </div>
  );
};

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
  transition: "opacity 0.2s",
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

const snapshotSummaryStyle = (colors: ColorPalette): React.CSSProperties => ({
  padding: "6px 12px",
  fontSize: 10,
  color: colors.textMuted,
  borderBottom: `1px solid ${colors.border}`,
});

const accordionWrapStyle: React.CSSProperties = {
  flex: 1,
  overflowY: "auto",
};

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
