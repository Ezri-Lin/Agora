import React, { useState } from "react";
import type { RoleCard } from "@agora/shared";
import { colors } from "../theme/tokens.js";
import { styles } from "./inspectorStyles.js";

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
}

type TabId = "participants" | "references" | "outputs" | "context";

export const Inspector: React.FC<InspectorProps> = ({
  participants,
  references,
  outputs,
  contextDebug,
}) => {
  const [tab, setTab] = useState<TabId>("participants");

  return (
    <div style={styles.container}>
      <div style={styles.tabs}>
        {(["participants", "references", "outputs", "context"] as TabId[]).map((t) => (
          <button
            key={t}
            style={{
              ...styles.tab,
              ...(tab === t ? styles.tabActive : {}),
            }}
            onClick={() => setTab(t)}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>
      <div style={styles.content}>
        {tab === "participants" && <ParticipantsTab roles={participants} />}
        {tab === "references" && <ReferencesTab refs={references} />}
        {tab === "outputs" && <OutputsTab files={outputs} />}
        {tab === "context" && <ContextTab debug={contextDebug} />}
      </div>
    </div>
  );
};

const ParticipantsTab: React.FC<{ roles: RoleCard[] }> = ({ roles }) => (
  <div>
    {roles.length === 0 && <div style={styles.empty}>No roles active</div>}
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

const ReferencesTab: React.FC<{ refs: SourceRef[] }> = ({ refs }) => (
  <div>
    {refs.length === 0 && <div style={styles.empty}>No references selected</div>}
    {refs.map((r) => (
      <div key={r.path} style={styles.row}>
        <span style={styles.fileIcon}>#</span>
        <span style={styles.rowName}>{r.label}</span>
      </div>
    ))}
  </div>
);

const OutputsTab: React.FC<{ files: string[] }> = ({ files }) => (
  <div>
    {files.length === 0 && <div style={styles.empty}>No outputs generated</div>}
    {files.map((f, i) => (
      <div key={i} style={styles.row}>
        <span style={styles.fileIcon}>📄</span>
        <span style={styles.rowName}>{f}</span>
      </div>
    ))}
  </div>
);

const ContextTab: React.FC<{ debug?: ContextDebug }> = ({ debug }) => {
  if (!debug) {
    return <div style={styles.empty}>No context data yet. Send a message first.</div>;
  }

  const modStatus = debug.moderatorHasOverflow ? "OVERFLOW" : "Full";
  const modColor = debug.moderatorHasOverflow ? "#e74c3c" : "#2ecc71";

  return (
    <div style={{ fontSize: 11 }}>
      <div style={styles.sectionHeader}>Moderator</div>
      <div style={styles.statRow}>
        <span style={styles.statLabel}>Status</span>
        <span style={{ ...styles.statValue, color: modColor, fontWeight: 600 }}>{modStatus}</span>
      </div>
      <div style={styles.statRow}>
        <span style={styles.statLabel}>Docs included</span>
        <span style={styles.statValue}>{debug.moderatorIncludedDocCount}</span>
      </div>
      <div style={styles.statRow}>
        <span style={styles.statLabel}>Total chars</span>
        <span style={styles.statValue}>{debug.moderatorTotalChars.toLocaleString()}</span>
      </div>
      {debug.moderatorHasOverflow && (
        <div style={styles.overflowWarning}>
          Overflow: {debug.moderatorOverflowDocs.join(", ")}
        </div>
      )}

      <div style={styles.sectionHeader}>Roles</div>
      <div style={styles.statRow}>
        <span style={styles.statLabel}>Context mode</span>
        <span style={styles.statValue}>{debug.roleContextMode}</span>
      </div>
      <div style={styles.statRow}>
        <span style={styles.statLabel}>Docs included</span>
        <span style={styles.statValue}>{debug.roleDocCount}</span>
      </div>
      <div style={styles.statRow}>
        <span style={styles.statLabel}>Truncated docs</span>
        <span style={{ ...styles.statValue, color: debug.roleTruncatedDocs > 0 ? "#e67e22" : colors.text }}>
          {debug.roleTruncatedDocs}
        </span>
      </div>
      <div style={styles.statRow}>
        <span style={styles.statLabel}>Total chars</span>
        <span style={styles.statValue}>{debug.roleTotalChars.toLocaleString()}</span>
      </div>
    </div>
  );
};
