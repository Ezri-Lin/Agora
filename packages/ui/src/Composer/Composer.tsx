import React, { useState } from "react";
import { styles } from "./composerStyles.js";
import { useI18n } from "../i18n/I18nContext.js";

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
  const { t } = useI18n();
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
      {showSettings && <SettingsPopover t={t} />}
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
          title={t.settings}
        >
          ⚙
        </button>
        <textarea
          style={styles.input}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={t.sendMessagePlaceholder}
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

const SettingsPopover: React.FC<{ t: { roles_: string; maxMsgsPerRole: string; autoDocs: string; crossExam: string; on_: string } }> = ({ t }) => {
  return (
    <div style={styles.settings}>
      <div style={styles.settingRow}>
        <span>{t.roles_}</span>
        <span style={styles.settingValue}>3</span>
      </div>
      <div style={styles.settingRow}>
        <span>{t.maxMsgsPerRole}</span>
        <span style={styles.settingValue}>2</span>
      </div>
      <div style={styles.settingRow}>
        <span>{t.autoDocs}</span>
        <span style={styles.settingValue}>{t.on_}</span>
      </div>
      <div style={styles.settingRow}>
        <span>{t.crossExam}</span>
        <span style={styles.settingValue}>{t.on_}</span>
      </div>
    </div>
  );
};
