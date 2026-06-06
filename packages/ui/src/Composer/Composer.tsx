import React, { useState } from "react";
import { colors } from "../theme/tokens.js";

interface SourceRef {
  path: string;
  label: string;
}

interface ComposerProps {
  onSend: (message: string) => void;
  isLoading: boolean;
  references: SourceRef[];
  onRemoveRef: (path: string) => void;
}

export const Composer: React.FC<ComposerProps> = ({
  onSend,
  isLoading,
  references,
  onRemoveRef,
}) => {
  const [text, setText] = useState("");
  const [showSettings, setShowSettings] = useState(false);

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed || isLoading) return;
    onSend(trimmed);
    setText("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div style={styles.container}>
      {showSettings && <SettingsPopover />}
      {references.length > 0 && (
        <div style={styles.chips}>
          {references.map((ref) => (
            <span key={ref.path} style={styles.chip}>
              <span style={styles.chipIcon}>#</span>
              {ref.label}
              <button
                style={styles.chipRemove}
                onClick={() => onRemoveRef(ref.path)}
              >
                x
              </button>
            </span>
          ))}
        </div>
      )}
      <div style={styles.inputRow}>
        <button
          style={styles.iconBtn}
          onClick={() => setShowSettings(!showSettings)}
          title="Settings"
        >
          ⚙
        </button>
        <textarea
          style={styles.input}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Send a message to the council..."
          rows={1}
        />
        <button
          style={{
            ...styles.sendBtn,
            opacity: text.trim() && !isLoading ? 1 : 0.4,
          }}
          onClick={handleSend}
          disabled={!text.trim() || isLoading}
        >
          {isLoading ? "■" : "→"}
        </button>
      </div>
    </div>
  );
};

const SettingsPopover: React.FC = () => {
  return (
    <div style={styles.settings}>
      <div style={styles.settingRow}>
        <span>Roles</span>
        <span style={styles.settingValue}>3</span>
      </div>
      <div style={styles.settingRow}>
        <span>Max msgs/role</span>
        <span style={styles.settingValue}>2</span>
      </div>
      <div style={styles.settingRow}>
        <span>Auto docs</span>
        <span style={styles.settingValue}>On</span>
      </div>
      <div style={styles.settingRow}>
        <span>Cross exam</span>
        <span style={styles.settingValue}>On</span>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    borderTop: `1px solid ${colors.border}`,
    background: colors.surface,
    padding: "8px 12px",
    position: "relative",
  },
  chips: {
    display: "flex",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 8,
  },
  chip: {
    display: "flex",
    alignItems: "center",
    gap: 4,
    padding: "2px 8px",
    borderRadius: 4,
    background: colors.border,
    color: colors.text,
    fontSize: 11,
  },
  chipIcon: { color: colors.accent, fontWeight: 700 },
  chipRemove: {
    background: "none",
    border: "none",
    color: colors.textMuted,
    cursor: "pointer",
    fontSize: 10,
    padding: "0 2px",
  },
  inputRow: {
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  iconBtn: {
    background: "none",
    border: "none",
    color: colors.textMuted,
    cursor: "pointer",
    fontSize: 16,
    padding: 4,
  },
  input: {
    flex: 1,
    background: colors.bg,
    border: `1px solid ${colors.border}`,
    borderRadius: 8,
    padding: "8px 12px",
    color: colors.text,
    fontSize: 13,
    resize: "none",
    outline: "none",
    fontFamily: "inherit",
  },
  sendBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    background: colors.accent,
    border: "none",
    color: "#fff",
    cursor: "pointer",
    fontSize: 16,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  settings: {
    position: "absolute",
    bottom: "100%",
    left: 12,
    background: colors.surface,
    border: `1px solid ${colors.border}`,
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    minWidth: 180,
  },
  settingRow: {
    display: "flex",
    justifyContent: "space-between",
    padding: "4px 0",
    fontSize: 12,
    color: colors.text,
  },
  settingValue: { color: colors.textMuted },
};
