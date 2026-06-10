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
  // Context state
  workspaceName?: string;
  roomMode?: "single" | "council";
  onRoomModeChange?: (mode: "single" | "council") => void;
  roleCount?: number;
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
  workspaceName = "Workspace",
  roomMode = "single",
  onRoomModeChange,
  roleCount = 0,
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
    <div className="composer" style={{ position: "relative" }}>
      {chips.length > 0 && (
        <div style={{ padding: "8px 16px 0", borderBottom: "1px solid #383838", background: "#252525" }}>
          <ChipsRow chips={chips} onRemove={handleRemoveChip} styles={styles} />
        </div>
      )}

      <div style={{ position: "relative" }}>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={t.sendMessagePlaceholder}
          style={{ width: "100%", height: "70px", resize: "none", border: "0", outline: "none", background: "transparent", color: "#e9e9e3", padding: "14px 50px 14px 16px", font: "inherit", fontSize: "14px" }}
        />
        <button
          className="send"
          onClick={handleSend}
          disabled={!text.trim() || isLoading}
          title={isLoading ? t.stop : t.sendMessage}
          style={{ position: "absolute", right: "12px", bottom: "14px", marginLeft: "auto", cursor: (!text.trim() || isLoading) ? "not-allowed" : "pointer", opacity: (!text.trim() || isLoading) ? 0.5 : 1 }}
        >
          {isLoading ? "■" : "↑"}
        </button>
      </div>
      
      <div className="composer-bottom" style={{ height: "auto", paddingBottom: "12px" }}>
        <label className="pill dropdown" style={{ cursor: "pointer" }}>
          Project: {workspaceName} ▾
        </label>
        <label className="pill" style={{ cursor: "pointer" }}>
          Work locally
        </label>
        <label 
          className="pill dropdown" 
          style={{ cursor: "pointer" }}
          onClick={() => onRoomModeChange?.(roomMode === "single" ? "council" : "single")}
        >
          {roomMode === "council" ? "多人" : "单人"} ▾
        </label>
        {roomMode === "council" && (
          <label className="pill dropdown" style={{ cursor: "pointer" }} onClick={() => setShowSpeakers((v) => !v)}>
            Roles: {roleCount > 0 ? `${roleCount} selected` : "Auto"} ▾
          </label>
        )}
        {roomMode === "council" && (
          <label className="pill dropdown" style={{ cursor: "pointer" }} onClick={() => setShowParams((v) => !v)}>
            Turn limit: 4 ▾
          </label>
        )}
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
