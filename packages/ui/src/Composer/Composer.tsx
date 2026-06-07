import React, { useState } from "react";
import { styles } from "./composerStyles.js";

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
