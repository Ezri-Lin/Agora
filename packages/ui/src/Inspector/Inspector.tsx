import React, { useState, useEffect, useCallback } from "react";
import type { RoleCard } from "@agora/shared";
import { colors } from "../theme/tokens.js";
import { styles } from "./inspectorStyles.js";
import { getBridge } from "../AgoraBridge.js";

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

export const Inspector: React.FC<InspectorProps> = ({
  participants,
  references,
  outputs,
  contextDebug,
  workspacePath,
}) => {
  const [tab, setTab] = useState<TabId>("participants");

  return (
    <div style={styles.container}>
      <div style={styles.tabs}>
        {(["participants", "references", "outputs", "context", "memories", "roles"] as TabId[]).map((t) => (
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
        {tab === "memories" && <MemoriesTab workspacePath={workspacePath} />}
        {tab === "roles" && <CustomRolesTab workspacePath={workspacePath} />}
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

const MemoriesTab: React.FC<{ workspacePath?: string }> = ({ workspacePath }) => {
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

  if (!workspacePath) return <div style={styles.empty}>Open a workspace to view memories</div>;
  if (loading) return <div style={styles.empty}>Loading...</div>;
  if (memories.length === 0) return <div style={styles.empty}>No memories yet</div>;

  const candidates = memories.filter((m) => m.status === "candidate");
  const accepted = memories.filter((m) => m.status === "accepted");
  const rejected = memories.filter((m) => m.status === "rejected");

  return (
    <div>
      {candidates.length > 0 && (
        <>
          <div style={styles.sectionHeader}>Pending ({candidates.length})</div>
          {candidates.map((m) => (
            <MemoryCard key={m.id} memory={m} onAccept={() => handleStatus(m.id, "accepted")} onReject={() => handleStatus(m.id, "rejected")} />
          ))}
        </>
      )}
      {accepted.length > 0 && (
        <>
          <div style={styles.sectionHeader}>Accepted ({accepted.length})</div>
          {accepted.map((m) => (
            <MemoryCard key={m.id} memory={m} onReject={() => handleStatus(m.id, "rejected")} />
          ))}
        </>
      )}
      {rejected.length > 0 && (
        <>
          <div style={styles.sectionHeader}>Rejected ({rejected.length})</div>
          {rejected.map((m) => (
            <MemoryCard key={m.id} memory={m} onAccept={() => handleStatus(m.id, "accepted")} />
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
}> = ({ memory, onAccept, onReject }) => (
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
        <button style={memoryCardStyles.acceptBtn} onClick={onAccept}>Accept</button>
      )}
      {onReject && (
        <button style={memoryCardStyles.rejectBtn} onClick={onReject}>Reject</button>
      )}
    </div>
  </div>
);

const memoryCardStyles: Record<string, React.CSSProperties> = {
  card: {
    background: "rgba(255,255,255,0.03)",
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
    background: "rgba(255,255,255,0.08)",
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
    background: "#2ecc71",
    color: "#fff",
    cursor: "pointer",
  },
  rejectBtn: {
    fontSize: 10,
    padding: "3px 10px",
    borderRadius: 4,
    border: "none",
    background: "#e74c3c",
    color: "#fff",
    cursor: "pointer",
  },
};

interface CustomRole {
  id: string;
  name: string;
  nameCN: string;
  subtitle: string;
  type: string;
  systemPrompt: string;
  tags: string[];
}

const CustomRolesTab: React.FC<{ workspacePath?: string }> = ({ workspacePath }) => {
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

  if (!workspacePath) return <div style={styles.empty}>Open a workspace to manage roles</div>;
  if (loading) return <div style={styles.empty}>Loading...</div>;

  if (editing) {
    return (
      <div style={roleStyles.form}>
        <div style={roleStyles.formRow}>
          <label style={roleStyles.label}>Name</label>
          <input style={roleStyles.input} value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
        </div>
        <div style={roleStyles.formRow}>
          <label style={roleStyles.label}>Name (CN)</label>
          <input style={roleStyles.input} value={editing.nameCN} onChange={(e) => setEditing({ ...editing, nameCN: e.target.value })} />
        </div>
        <div style={roleStyles.formRow}>
          <label style={roleStyles.label}>Subtitle</label>
          <input style={roleStyles.input} value={editing.subtitle} onChange={(e) => setEditing({ ...editing, subtitle: e.target.value })} />
        </div>
        <div style={roleStyles.formRow}>
          <label style={roleStyles.label}>Type</label>
          <select style={roleStyles.input} value={editing.type} onChange={(e) => setEditing({ ...editing, type: e.target.value })}>
            <option value="critic">Critic</option>
            <option value="historian">Historian</option>
            <option value="strategist">Strategist</option>
            <option value="architect">Architect</option>
            <option value="lens">Lens</option>
          </select>
        </div>
        <div style={roleStyles.formRow}>
          <label style={roleStyles.label}>Tags (comma-separated)</label>
          <input style={roleStyles.input} value={editing.tags.join(", ")} onChange={(e) => setEditing({ ...editing, tags: e.target.value.split(",").map((t) => t.trim()).filter(Boolean) })} />
        </div>
        <div style={roleStyles.formRow}>
          <label style={roleStyles.label}>System Prompt</label>
          <textarea style={roleStyles.textarea} value={editing.systemPrompt} onChange={(e) => setEditing({ ...editing, systemPrompt: e.target.value })} />
        </div>
        <div style={roleStyles.formActions}>
          <button style={roleStyles.saveBtn} onClick={handleSave}>Save</button>
          <button style={roleStyles.cancelBtn} onClick={() => setEditing(null)}>Cancel</button>
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
        + New Role
      </button>
      {roles.length === 0 && <div style={styles.empty}>No custom roles</div>}
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
            <button style={roleStyles.editBtn} onClick={() => setEditing(r)}>Edit</button>
            <button style={roleStyles.deleteBtn} onClick={() => handleDelete(r.id)}>Delete</button>
          </div>
        </div>
      ))}
    </div>
  );
};

const roleStyles: Record<string, React.CSSProperties> = {
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
    background: "rgba(255,255,255,0.03)",
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
    background: "rgba(255,255,255,0.08)",
    borderRadius: 3,
    padding: "1px 4px",
    color: colors.textMuted,
  },
  cardActions: { display: "flex", gap: 6 },
  editBtn: {
    fontSize: 10, padding: "2px 8px", borderRadius: 4,
    border: "none", background: colors.accent, color: "#fff", cursor: "pointer",
  },
  deleteBtn: {
    fontSize: 10, padding: "2px 8px", borderRadius: 4,
    border: "none", background: "#e74c3c", color: "#fff", cursor: "pointer",
  },
  form: { padding: "4px 0" },
  formRow: { marginBottom: 8 },
  label: { display: "block", fontSize: 10, color: colors.textMuted, marginBottom: 3 },
  input: {
    width: "100%", padding: "4px 6px", fontSize: 11,
    background: "rgba(255,255,255,0.05)", border: `1px solid ${colors.border}`,
    borderRadius: 4, color: colors.text, boxSizing: "border-box" as const,
  },
  textarea: {
    width: "100%", minHeight: 80, padding: "4px 6px", fontSize: 11,
    background: "rgba(255,255,255,0.05)", border: `1px solid ${colors.border}`,
    borderRadius: 4, color: colors.text, boxSizing: "border-box" as const,
    fontFamily: "inherit", resize: "vertical" as const,
  },
  formActions: { display: "flex", gap: 8 },
  saveBtn: {
    fontSize: 10, padding: "4px 12px", borderRadius: 4,
    border: "none", background: "#2ecc71", color: "#fff", cursor: "pointer",
  },
  cancelBtn: {
    fontSize: 10, padding: "4px 12px", borderRadius: 4,
    border: `1px solid ${colors.border}`, background: "none",
    color: colors.textMuted, cursor: "pointer",
  },
};
