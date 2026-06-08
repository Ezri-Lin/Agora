import React from "react";
import type { ScannedDoc } from "./AgoraBridge.js";
import { useI18n } from "./i18n/I18nContext.js";
import { useTheme } from "./theme/ThemeContext.js";
import type { ColorPalette } from "./theme/palettes.js";

interface RefPickerProps {
  docs: ScannedDoc[];
  onSelect: (doc: ScannedDoc) => void;
  onClose: () => void;
}

export const RefPicker: React.FC<RefPickerProps> = ({ docs, onSelect, onClose }) => {
  const { t } = useI18n();
  const { colors } = useTheme();
  const styles = createStyles(colors);
  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.panel} onClick={(e) => e.stopPropagation()}>
        <div style={styles.header}>
          <span>{t.addReferenceTitle}</span>
          <button style={styles.closeBtn} onClick={onClose}>x</button>
        </div>
        <div style={styles.list}>
          {docs.length === 0 && (
            <div style={styles.empty}>{t.noDocumentsFound}</div>
          )}
          {docs.map((doc) => (
            <button
              key={doc.path}
              style={styles.item}
              onClick={() => onSelect(doc)}
            >
              <span style={styles.ext}>{doc.ext}</span>
              <span>{doc.name}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

const createStyles = (colors: ColorPalette): Record<string, React.CSSProperties> => ({
  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.4)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 100,
  },
  panel: {
    background: colors.surface,
    border: `1px solid ${colors.border}`,
    borderRadius: 12,
    width: 400,
    maxHeight: 400,
    display: "flex",
    flexDirection: "column",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "12px 16px",
    borderBottom: `1px solid ${colors.border}`,
    fontSize: 14,
    fontWeight: 600,
    color: colors.text,
  },
  closeBtn: {
    background: "none",
    border: "none",
    color: colors.textMuted,
    cursor: "pointer",
    fontSize: 16,
  },
  list: {
    overflowY: "auto",
    flex: 1,
    padding: 8,
  },
  empty: {
    color: colors.textMuted,
    fontSize: 12,
    textAlign: "center",
    padding: 20,
  },
  item: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    width: "100%",
    padding: "8px 12px",
    background: "none",
    border: "none",
    borderRadius: 6,
    color: colors.text,
    fontSize: 12,
    cursor: "pointer",
    textAlign: "left",
  },
  ext: {
    fontSize: 10,
    padding: "1px 4px",
    borderRadius: 3,
    background: colors.border,
    color: colors.textMuted,
  },
});
