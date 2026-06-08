import React, { useState, useEffect, useCallback } from "react";
import type { RoleCard } from "@agora/shared";
import { createStyles } from "./inspectorStyles.js";
import { getBridge } from "../AgoraBridge.js";
import { useI18n } from "../i18n/I18nContext.js";
import { useTheme } from "../theme/ThemeContext.js";
import type { ColorPalette } from "../theme/palettes.js";
import type { Translations } from "../i18n/translations.js";

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

interface MemoryItem {
  id: string;
  content: string;
  domains: string[];
  tags: string[];
  scope: string;
  status: string;
  createdAt: string;
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

const MemoriesTab: React.FC<{ workspacePath?: string; t: Translations; styles: Record<string, React.CSSProperties>; colors: ColorPalette }> = ({ workspacePath, t, styles, colors }) => {
  const [memories, setMemories] = useState<MemoryItem[]>([]);
  const [loading, setLoading] = useState(false);

  const loadMemories = useCallback(async () => {
    if (!workspacePath) return;
    const bridge = getBridge();
    if (!bridge) return;
    setLoading(true);
    try {
      const all = await bridge.room.getAllMemories(workspacePath);
      setMemories(all as MemoryItem[]);
    } catch {
      // ignore
    }
    setLoading(false);
  }, [workspacePath]);

  useEffect(() => { loadMemories(); }, [loadMemories]);

  const handleStatus = useCallback(async (id: string, status: "accepted" | "rejected") => {
    if (!workspacePath) return;
    const bridge = getBridge();
    if (!bridge) return;
    await bridge.room.updateMemoryStatus(workspacePath, id, status);
    setMemories((prev) => prev.map((m) => m.id === id ? { ...m, status } : m));
  }, [workspacePath]);

  if (!workspacePath) return <div style={styles.empty}>{t.openWorkspaceToView}</div>;
  if (loading) return <div style={styles.empty}>{t.loading}</div>;
  if (memories.length === 0) return <div style={styles.empty}>{t.noMemories}</div>;

  const candidates = memories.filter((m) => m.status === "candidate");
  const accepted = memories.filter((m) => m.status === "accepted");
  const rejected = memories.filter((m) => m.status === "rejected");

  return (
    <div>
      {candidates.length > 0 && (
        <>
          <div style={styles.sectionHeader}>{t.pending} ({candidates.length})</div>
          {candidates.map((m) => (
            <MemoryCard key={m.id} memory={m} onAccept={() => handleStatus(m.id, "accepted")} onReject={() => handleStatus(m.id, "rejected")} t={t} colors={colors} />
          ))}
        </>
      )}
      {accepted.length > 0 && (
        <>
          <div style={styles.sectionHeader}>{t.accepted} ({accepted.length})</div>
          {accepted.map((m) => (
            <MemoryCard key={m.id} memory={m} onReject={() => handleStatus(m.id, "rejected")} t={t} colors={colors} />
          ))}
        </>
      )}
      {rejected.length > 0 && (
        <>
          <div style={styles.sectionHeader}>{t.rejected} ({rejected.length})</div>
          {rejected.map((m) => (
            <MemoryCard key={m.id} memory={m} onAccept={() => handleStatus(m.id, "accepted")} t={t} colors={colors} />
          ))}
        </>
      )}
    </div>
  );
};

const MemoryCard: React.FC<{
  memory: MemoryItem;
  onAccept?: () => void;
  onReject?: () => void;
  t: Translations;
  colors: ColorPalette;
}> = ({ memory, onAccept, onReject, t, colors }) => {
  const memoryCardStyles = createMemoryCardStyles(colors);
  return (
  <div style={memoryCardStyles.card}>
    <div style={memoryCardStyles.scope}>{memory.scope}</div>
    <div style={memoryCardStyles.content}>{memory.content}</div>
    <div style={memoryCardStyles.tags}>
      {memory.tags.map((t) => (
        <span key={t} style={memoryCardStyles.tag}>{t}</span>
      ))}
    </div>
    <div style={memoryCardStyles.actions}>
      {onAccept && (
        <button style={memoryCardStyles.acceptBtn} onClick={onAccept}>{t.accept}</button>
      )}
      {onReject && (
        <button style={memoryCardStyles.rejectBtn} onClick={onReject}>{t.reject}</button>
      )}
    </div>
  </div>
  );
};

const createMemoryCardStyles = (colors: ColorPalette): Record<string, React.CSSProperties> => ({
  card: {
    background: colors.surfaceHover,
    border: `1px solid ${colors.border}`,
    borderRadius: 6,
    padding: "8px 10px",
    marginBottom: 8,
  },
  scope: {
    fontSize: 9,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    color: colors.accent,
    marginBottom: 4,
  },
  content: {
    fontSize: 12,
    color: colors.text,
    lineHeight: 1.5,
    marginBottom: 6,
  },
  tags: {
    display: "flex",
    flexWrap: "wrap",
    gap: 4,
    marginBottom: 6,
  },
  tag: {
    fontSize: 9,
    background: colors.border,
    borderRadius: 3,
    padding: "1px 5px",
    color: colors.textMuted,
  },
  actions: {
    display: "flex",
    gap: 6,
  },
  acceptBtn: {
    fontSize: 10,
    padding: "3px 10px",
    borderRadius: 4,
    border: "none",
    background: colors.success,
    color: colors.text,
    cursor: "pointer",
  },
  rejectBtn: {
    fontSize: 10,
    padding: "3px 10px",
    borderRadius: 4,
    border: "none",
    background: colors.danger,
    color: colors.text,
    cursor: "pointer",
  },
});

interface CustomRole {
  id: string;
  name: string;
  nameCN: string;
  subtitle: string;
  type: string;
  systemPrompt: string;
  tags: string[];
}

const CustomRolesTab: React.FC<{ workspacePath?: string; t: Translations; styles: Record<string, React.CSSProperties>; colors: ColorPalette }> = ({ workspacePath, t, styles, colors }) => {
  const roleStyles = createRoleStyles(colors);
  const [roles, setRoles] = useState<CustomRole[]>([]);
  const [editing, setEditing] = useState<CustomRole | null>(null);
  const [loading, setLoading] = useState(false);

  const loadRoles = useCallback(async () => {
    if (!workspacePath) return;
    const bridge = getBridge();
    if (!bridge) return;
    setLoading(true);
    try {
      const list = await bridge.customRoles.list(workspacePath);
      setRoles(list as CustomRole[]);
    } catch {
      // ignore
    }
    setLoading(false);
  }, [workspacePath]);

  useEffect(() => { loadRoles(); }, [loadRoles]);

  const handleSave = useCallback(async () => {
    if (!workspacePath || !editing) return;
    const bridge = getBridge();
    if (!bridge) return;
    await bridge.customRoles.save(workspacePath, editing);
    setEditing(null);
    loadRoles();
  }, [workspacePath, editing, loadRoles]);

  const handleDelete = useCallback(async (id: string) => {
    if (!workspacePath) return;
    const bridge = getBridge();
    if (!bridge) return;
    await bridge.customRoles.delete(workspacePath, id);
    loadRoles();
  }, [workspacePath, loadRoles]);

  if (!workspacePath) return <div style={styles.empty}>{t.openWorkspaceToManage}</div>;
  if (loading) return <div style={styles.empty}>{t.loading}</div>;

  if (editing) {
    return (
      <div style={roleStyles.form}>
        <div style={roleStyles.formRow}>
          <label style={roleStyles.label}>{t.name}</label>
          <input style={roleStyles.input} value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
        </div>
        <div style={roleStyles.formRow}>
          <label style={roleStyles.label}>{t.nameCN}</label>
          <input style={roleStyles.input} value={editing.nameCN} onChange={(e) => setEditing({ ...editing, nameCN: e.target.value })} />
        </div>
        <div style={roleStyles.formRow}>
          <label style={roleStyles.label}>{t.subtitle}</label>
          <input style={roleStyles.input} value={editing.subtitle} onChange={(e) => setEditing({ ...editing, subtitle: e.target.value })} />
        </div>
        <div style={roleStyles.formRow}>
          <label style={roleStyles.label}>{t.type}</label>
          <select style={roleStyles.input} value={editing.type} onChange={(e) => setEditing({ ...editing, type: e.target.value })}>
            <option value="critic">{t.critic}</option>
            <option value="historian">{t.historian}</option>
            <option value="strategist">{t.strategist}</option>
            <option value="architect">{t.architect}</option>
            <option value="lens">{t.lens}</option>
          </select>
        </div>
        <div style={roleStyles.formRow}>
          <label style={roleStyles.label}>{t.tags}</label>
          <input style={roleStyles.input} value={editing.tags.join(", ")} onChange={(e) => setEditing({ ...editing, tags: e.target.value.split(",").map((tag) => tag.trim()).filter(Boolean) })} />
        </div>
        <div style={roleStyles.formRow}>
          <label style={roleStyles.label}>{t.systemPrompt}</label>
          <textarea style={roleStyles.textarea} value={editing.systemPrompt} onChange={(e) => setEditing({ ...editing, systemPrompt: e.target.value })} />
        </div>
        <div style={roleStyles.formActions}>
          <button style={roleStyles.saveBtn} onClick={handleSave}>{t.save}</button>
          <button style={roleStyles.cancelBtn} onClick={() => setEditing(null)}>{t.cancel}</button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <button style={roleStyles.addBtn} onClick={() => setEditing({
        id: `custom_${Date.now()}`,
        name: "",
        nameCN: "",
        subtitle: "",
        type: "lens",
        systemPrompt: "",
        tags: [],
      })}>
        {t.newRole}
      </button>
      {roles.length === 0 && <div style={styles.empty}>{t.noCustomRoles}</div>}
      {roles.map((r) => (
        <div key={r.id} style={roleStyles.card}>
          <div style={roleStyles.cardHeader}>
            <span style={roleStyles.cardName}>{r.name}</span>
            <span style={roleStyles.cardType}>{r.type}</span>
          </div>
          <div style={roleStyles.cardSub}>{r.subtitle}</div>
          <div style={roleStyles.cardTags}>
            {r.tags.slice(0, 5).map((t) => (
              <span key={t} style={roleStyles.tag}>{t}</span>
            ))}
          </div>
          <div style={roleStyles.cardActions}>
            <button style={roleStyles.editBtn} onClick={() => setEditing(r)}>{t.edit}</button>
            <button style={roleStyles.deleteBtn} onClick={() => handleDelete(r.id)}>{t.delete}</button>
          </div>
        </div>
      ))}
    </div>
  );
};

const createRoleStyles = (colors: ColorPalette): Record<string, React.CSSProperties> => ({
  addBtn: {
    width: "100%",
    padding: "6px 0",
    background: "none",
    border: `1px dashed ${colors.border}`,
    borderRadius: 4,
    color: colors.accent,
    fontSize: 11,
    cursor: "pointer",
    marginBottom: 8,
  },
  card: {
    background: colors.surfaceHover,
    border: `1px solid ${colors.border}`,
    borderRadius: 6,
    padding: "8px 10px",
    marginBottom: 8,
  },
  cardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 2,
  },
  cardName: { fontSize: 12, color: colors.text, fontWeight: 600 },
  cardType: { fontSize: 9, color: colors.accent, textTransform: "uppercase" },
  cardSub: { fontSize: 10, color: colors.textMuted, marginBottom: 4 },
  cardTags: { display: "flex", flexWrap: "wrap", gap: 3, marginBottom: 6 },
  tag: {
    fontSize: 9,
    background: colors.border,
    borderRadius: 3,
    padding: "1px 4px",
    color: colors.textMuted,
  },
  cardActions: { display: "flex", gap: 6 },
  editBtn: {
    fontSize: 10, padding: "2px 8px", borderRadius: 4,
    border: "none", background: colors.accent, color: colors.text, cursor: "pointer",
  },
  deleteBtn: {
    fontSize: 10, padding: "2px 8px", borderRadius: 4,
    border: "none", background: colors.danger, color: colors.text, cursor: "pointer",
  },
  form: { padding: "4px 0" },
  formRow: { marginBottom: 8 },
  label: { display: "block", fontSize: 10, color: colors.textMuted, marginBottom: 3 },
  input: {
    width: "100%", padding: "4px 6px", fontSize: 11,
    background: colors.surface, border: `1px solid ${colors.border}`,
    borderRadius: 4, color: colors.text, boxSizing: "border-box" as const,
  },
  textarea: {
    width: "100%", minHeight: 80, padding: "4px 6px", fontSize: 11,
    background: colors.surface, border: `1px solid ${colors.border}`,
    borderRadius: 4, color: colors.text, boxSizing: "border-box" as const,
    fontFamily: "inherit", resize: "vertical" as const,
  },
  formActions: { display: "flex", gap: 8 },
  saveBtn: {
    fontSize: 10, padding: "4px 12px", borderRadius: 4,
    border: "none", background: colors.success, color: colors.text, cursor: "pointer",
  },
  cancelBtn: {
    fontSize: 10, padding: "4px 12px", borderRadius: 4,
    border: `1px solid ${colors.border}`, background: "none",
    color: colors.textMuted, cursor: "pointer",
  },
});
