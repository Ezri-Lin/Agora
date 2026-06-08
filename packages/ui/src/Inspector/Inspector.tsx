import React, { useState } from "react";
import type { RoleCard } from "@agora/shared";
import { createStyles } from "./inspectorStyles.js";
import { useI18n } from "../i18n/I18nContext.js";
import { useTheme } from "../theme/ThemeContext.js";
import type { ColorPalette } from "../theme/palettes.js";
import type { Translations } from "../i18n/translations.js";
import { MemoriesTab } from "./MemoriesTab.js";
import { CustomRolesTab } from "./CustomRolesTab.js";

interface SourceRef {
  path: string;
  label: string;
}

export interface ContextDebug {
  moderatorHasOverflow: boolean;
  moderatorOverflowDocs: string[];
  moderatorIncludedDocCount: number;
  moderatorTotalChars: number;
  roleContextMode: string;
  roleTruncatedDocs: number;
  roleTotalChars: number;
  roleDocCount: number;
}

interface InspectorProps {
  participants: RoleCard[];
  references: SourceRef[];
  outputs: string[];
  contextDebug?: ContextDebug;
  workspacePath?: string;
}

type TabId = "participants" | "references" | "outputs" | "context" | "memories" | "roles";

const TAB_LABELS: Record<TabId, keyof Translations> = {
  participants: "participants",
  references: "references",
  outputs: "outputs",
  context: "context",
  memories: "memories",
  roles: "roles",
};

export const Inspector: React.FC<InspectorProps> = ({
  participants,
  references,
  outputs,
  contextDebug,
  workspacePath,
}) => {
  const { t } = useI18n();
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const [tab, setTab] = useState<TabId>("participants");

  return (
    <div style={styles.container}>
      <div style={styles.tabs}>
        {(["participants", "references", "outputs", "context", "memories", "roles"] as TabId[]).map((tabId) => (
          <button
            key={tabId}
            style={{
              ...styles.tab,
              ...(tab === tabId ? styles.tabActive : {}),
            }}
            onClick={() => setTab(tabId)}
          >
            {t[TAB_LABELS[tabId]]}
          </button>
        ))}
      </div>
      <div style={styles.content}>
        {tab === "participants" && <ParticipantsTab roles={participants} t={t} styles={styles} />}
        {tab === "references" && <ReferencesTab refs={references} t={t} styles={styles} />}
        {tab === "outputs" && <OutputsTab files={outputs} t={t} styles={styles} />}
        {tab === "context" && <ContextTab debug={contextDebug} t={t} styles={styles} colors={colors} />}
        {tab === "memories" && <MemoriesTab workspacePath={workspacePath} t={t} styles={styles} colors={colors} />}
        {tab === "roles" && <CustomRolesTab workspacePath={workspacePath} t={t} styles={styles} colors={colors} />}
      </div>
    </div>
  );
};

const ParticipantsTab: React.FC<{ roles: RoleCard[]; t: Translations; styles: Record<string, React.CSSProperties> }> = ({ roles, t, styles }) => (
  <div>
    {roles.length === 0 && <div style={styles.empty}>{t.noRolesActive}</div>}
    {roles.map((r) => (
      <div key={r.id} style={styles.row}>
        <span style={styles.dot} />
        <div>
          <div style={styles.rowName}>{r.name}</div>
          <div style={styles.rowSub}>{r.subtitle}</div>
        </div>
      </div>
    ))}
  </div>
);

const ReferencesTab: React.FC<{ refs: SourceRef[]; t: Translations; styles: Record<string, React.CSSProperties> }> = ({ refs, t, styles }) => (
  <div>
    {refs.length === 0 && <div style={styles.empty}>{t.noReferences}</div>}
    {refs.map((r) => (
      <div key={r.path} style={styles.row}>
        <span style={styles.fileIcon}>#</span>
        <span style={styles.rowName}>{r.label}</span>
      </div>
    ))}
  </div>
);

const OutputsTab: React.FC<{ files: string[]; t: Translations; styles: Record<string, React.CSSProperties> }> = ({ files, t, styles }) => (
  <div>
    {files.length === 0 && <div style={styles.empty}>{t.noOutputs}</div>}
    {files.map((f, i) => (
      <div key={i} style={styles.row}>
        <span style={styles.fileIcon}>📄</span>
        <span style={styles.rowName}>{f}</span>
      </div>
    ))}
  </div>
);

const ContextTab: React.FC<{ debug?: ContextDebug; t: Translations; styles: Record<string, React.CSSProperties>; colors: ColorPalette }> = ({ debug, t, styles, colors }) => {
  if (!debug) {
    return <div style={styles.empty}>{t.noContextData}</div>;
  }

  const modStatus = debug.moderatorHasOverflow ? t.overflow : t.full;
  const modColor = debug.moderatorHasOverflow ? "#e74c3c" : "#2ecc71";

  return (
    <div style={{ fontSize: 11 }}>
      <div style={styles.sectionHeader}>{t.moderator}</div>
      <div style={styles.statRow}>
        <span style={styles.statLabel}>{t.status}</span>
        <span style={{ ...styles.statValue, color: modColor, fontWeight: 600 }}>{modStatus}</span>
      </div>
      <div style={styles.statRow}>
        <span style={styles.statLabel}>{t.docsIncluded}</span>
        <span style={styles.statValue}>{debug.moderatorIncludedDocCount}</span>
      </div>
      <div style={styles.statRow}>
        <span style={styles.statLabel}>{t.totalChars}</span>
        <span style={styles.statValue}>{debug.moderatorTotalChars.toLocaleString()}</span>
      </div>
      {debug.moderatorHasOverflow && (
        <div style={styles.overflowWarning}>
          {t.overflow}: {debug.moderatorOverflowDocs.join(", ")}
        </div>
      )}

      <div style={styles.sectionHeader}>{t.roles_}</div>
      <div style={styles.statRow}>
        <span style={styles.statLabel}>{t.contextMode}</span>
        <span style={styles.statValue}>{debug.roleContextMode}</span>
      </div>
      <div style={styles.statRow}>
        <span style={styles.statLabel}>{t.docsIncluded}</span>
        <span style={styles.statValue}>{debug.roleDocCount}</span>
      </div>
      <div style={styles.statRow}>
        <span style={styles.statLabel}>{t.truncatedDocs}</span>
        <span style={{ ...styles.statValue, color: debug.roleTruncatedDocs > 0 ? "#e67e22" : colors.text }}>
          {debug.roleTruncatedDocs}
        </span>
      </div>
      <div style={styles.statRow}>
        <span style={styles.statLabel}>{t.totalChars}</span>
        <span style={styles.statValue}>{debug.roleTotalChars.toLocaleString()}</span>
      </div>
    </div>
  );
};
