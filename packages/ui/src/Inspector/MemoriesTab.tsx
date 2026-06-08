import React, { useState, useEffect, useCallback } from "react";
import { getBridge } from "../AgoraBridge.js";
import type { ColorPalette } from "../theme/palettes.js";
import type { Translations } from "../i18n/translations.js";

interface MemoryItem {
  id: string;
  content: string;
  domains: string[];
  tags: string[];
  scope: string;
  status: string;
  createdAt: string;
}

interface MemoriesTabProps {
  workspacePath?: string;
  t: Translations;
  styles: Record<string, React.CSSProperties>;
  colors: ColorPalette;
}

export const MemoriesTab: React.FC<MemoriesTabProps> = ({ workspacePath, t, styles, colors }) => {
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
  const s = createMemoryCardStyles(colors);
  return (
    <div style={s.card}>
      <div style={s.scope}>{memory.scope}</div>
      <div style={s.content}>{memory.content}</div>
      <div style={s.tags}>
        {memory.tags.map((tag) => (
          <span key={tag} style={s.tag}>{tag}</span>
        ))}
      </div>
      <div style={s.actions}>
        {onAccept && (
          <button style={s.acceptBtn} onClick={onAccept}>{t.accept}</button>
        )}
        {onReject && (
          <button style={s.rejectBtn} onClick={onReject}>{t.reject}</button>
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
