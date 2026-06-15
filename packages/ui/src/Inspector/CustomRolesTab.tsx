import React, { useState, useEffect, useCallback } from "react";
import { getBridge } from "../AgoraBridge.js";
import type { ColorPalette } from "../theme/palettes.js";
import type { Translations } from "../i18n/translations.js";

interface CustomRole {
  id: string;
  name: string;
  nameCN: string;
  subtitle: string;
  subtitleCN: string;
  type: string;
  systemPrompt: string;
  tags: string[];
}

interface CustomRolesTabProps {
  workspacePath?: string;
  t: Translations;
  styles: Record<string, React.CSSProperties>;
  colors: ColorPalette;
}

export const CustomRolesTab: React.FC<CustomRolesTabProps> = ({ workspacePath, t, styles, colors }) => {
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
        subtitleCN: "",
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
            {r.tags.slice(0, 5).map((tag) => (
              <span key={tag} style={roleStyles.tag}>{tag}</span>
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
