import React, { useState, useCallback } from "react";
import { createComposerStyles } from "./composerStyles.js";
import { useI18n } from "../i18n/I18nContext.js";
import { useTheme } from "../theme/ThemeContext.js";
import {
  ChipsRow,
  AddMenu,
  ParametersPopover,
  SpeakersPopover,
  type ComposerChip,
  type ComposerParameters,
} from "./Composer.parts.js";

// ─── Legacy types (kept for backward compatibility) ──────────────────

interface SourceRef {
  path: string;
  label: string;
}

export interface PendingPerspectiveChip {
  id: string;
  roleId: string;
  roleName: string;
}

// ─── Props ───────────────────────────────────────────────────────────

interface ComposerProps {
  onSend: (message: string) => void;
  isLoading: boolean;
  // References
  references: SourceRef[];
  onRemoveRef: (path: string) => void;
  // Perspective / role chips
  perspectiveChips?: PendingPerspectiveChip[];
  onRemovePerspectiveChip?: (id: string) => void;
  // Toolbar callbacks
  onOpenRefPicker?: () => void;
  onOpenDispatchGate?: () => void;
}

// ─── Default parameters ──────────────────────────────────────────────

const DEFAULT_PARAMS: ComposerParameters = {
  discussionMode: "deep",
  contextScope: "room",
  writePolicy: "none",
  searchPolicy: "auto",
};

// ─── Component ───────────────────────────────────────────────────────

export const Composer: React.FC<ComposerProps> = ({
  onSend,
  isLoading,
  references,
  onRemoveRef,
  perspectiveChips,
  onRemovePerspectiveChip,
  onOpenRefPicker,
  onOpenDispatchGate,
}) => {
  const { t } = useI18n();
  const { colors } = useTheme();
  const styles = createComposerStyles(colors);
  const [text, setText] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [showParams, setShowParams] = useState(false);
  const [showSpeakers, setShowSpeakers] = useState(false);
  const [params, setParams] = useState<ComposerParameters>(DEFAULT_PARAMS);

  // Build unified chips array
  const chips: ComposerChip[] = [
    ...(perspectiveChips ?? []).map((c): ComposerChip => ({
      type: "role" as const,
      id: c.id,
      label: c.roleName,
    })),
    ...references.map((r): ComposerChip => ({
      type: "document" as const,
      id: r.path,
      title: r.label,
    })),
  ];

  const handleRemoveChip = useCallback((chip: ComposerChip) => {
    if (chip.type === "role") {
      onRemovePerspectiveChip?.(chip.id);
    } else {
      onRemoveRef(chip.id);
    }
  }, [onRemovePerspectiveChip, onRemoveRef]);

  const handleSend = useCallback(() => {
    const trimmed = text.trim();
    if (!trimmed || isLoading) return;
    onSend(trimmed);
    setText("");
  }, [text, isLoading, onSend]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  return (
    <div style={styles.container}>
      {/* Chips */}
      <ChipsRow chips={chips} onRemove={handleRemoveChip} styles={styles} />

      {/* Input area */}
      <div style={styles.inputArea}>
        <textarea
          style={styles.textarea}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={t.sendMessagePlaceholder}
          rows={1}
        />
        <button
          style={{
            ...styles.sendBtn,
            ...((!text.trim() || isLoading) ? styles.sendBtnDisabled : {}),
          }}
          onClick={handleSend}
          disabled={!text.trim() || isLoading}
          title={isLoading ? t.stop : t.sendMessage}
        >
          {isLoading ? "■" : "→"}
        </button>
      </div>

      {/* Bottom toolbar */}
      <div style={styles.toolbar}>
        <button
          style={{
            ...styles.toolbarBtn,
            ...(showAdd ? styles.toolbarBtnActive : {}),
          }}
          onClick={() => { setShowAdd((v) => !v); setShowParams(false); setShowSpeakers(false); }}
        >
          + {t.add}
        </button>
        <button
          style={{
            ...styles.toolbarBtn,
            ...(showParams ? styles.toolbarBtnActive : {}),
          }}
          onClick={() => { setShowParams((v) => !v); setShowAdd(false); setShowSpeakers(false); }}
        >
          {t.parameters}
        </button>
        <button
          style={{
            ...styles.toolbarBtn,
            ...(showSpeakers ? styles.toolbarBtnActive : {}),
          }}
          onClick={() => { setShowSpeakers((v) => !v); setShowAdd(false); setShowParams(false); }}
        >
          {t.speakers}
        </button>
        <button
          style={styles.toolbarBtn}
          onClick={() => onOpenRefPicker?.()}
        >
          {t.documents}
        </button>
      </div>

      {/* Popovers */}
      <AddMenu
        visible={showAdd}
        onClose={() => setShowAdd(false)}
        onAddDocument={() => onOpenRefPicker?.()}
        onAddRole={() => onOpenDispatchGate?.()}
        t={t}
        styles={styles}
        colors={colors}
      />
      <ParametersPopover
        visible={showParams}
        params={params}
        onChange={setParams}
        onClose={() => setShowParams(false)}
        t={t}
        styles={styles}
        colors={colors}
      />
      <SpeakersPopover
        visible={showSpeakers}
        onClose={() => setShowSpeakers(false)}
        onOpenDispatch={() => onOpenDispatchGate?.()}
        styles={styles}
        colors={colors}
        t={t}
      />
    </div>
  );
};
