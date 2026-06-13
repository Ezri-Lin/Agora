import React, { useState, useCallback, useRef, useMemo, useEffect } from "react";
import getCaretCoordinates from "textarea-caret";
import { createComposerStyles } from "./composerStyles.js";
import { useI18n } from "../i18n/I18nContext.js";
import { useTheme } from "../theme/ThemeContext.js";
import {
  ChipsRow,
  ParametersPopover,
  SpeakersPopover,
  type ComposerChip,
  type ComposerParameters,
} from "./Composer.parts.js";
import { MentionPicker, type MentionItem } from "./MentionPicker.js";
import { PromptBox } from "./PromptBox.js";

interface SourceRef {
  path: string;
  label: string;
}

export interface PendingPerspectiveChip {
  id: string;
  roleId: string;
  roleName: string;
}

interface ComposerProps {
  onSend: (message: string) => void;
  isLoading: boolean;
  references: SourceRef[];
  onRemoveRef: (path: string) => void;
  perspectiveChips?: PendingPerspectiveChip[];
  onRemovePerspectiveChip?: (id: string) => void;
  
  // Available items for Mentions
  availableDocs?: any[];
  availableRoles?: any[];
  onAddRef?: (doc: any) => void;
  onAddRole?: (role: any) => void;

  onOpenRefPicker?: () => void;
  onOpenDispatchGate?: () => void;
  workspaceName?: string;
  roomMode?: "single" | "council";
  onRoomModeChange?: (mode: "single" | "council") => void;
  roleCount?: number;
}

const DEFAULT_PARAMS: ComposerParameters = {
  discussionMode: "deep",
  contextScope: "room",
  writePolicy: "none",
  searchPolicy: "auto",
};

export const Composer: React.FC<ComposerProps> = ({
  onSend,
  isLoading,
  references,
  onRemoveRef,
  perspectiveChips,
  onRemovePerspectiveChip,
  availableDocs = [],
  availableRoles = [],
  onAddRef,
  onAddRole,
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
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [showParams, setShowParams] = useState(false);
  const [showSpeakers, setShowSpeakers] = useState(false);
  const [params, setParams] = useState<ComposerParameters>(DEFAULT_PARAMS);

  // Mention State
  const [mentionState, setMentionState] = useState<{ active: boolean; query: string; triggerIdx: number }>({ active: false, query: "", triggerIdx: -1 });
  const [mentionIndex, setMentionIndex] = useState(0);
  const [caretPos, setCaretPos] = useState({ top: 0, left: 0 });

  const chips: ComposerChip[] = [
    ...(perspectiveChips ?? []).map((c): ComposerChip => ({ type: "role" as const, id: c.id, label: c.roleName })),
    ...references.map((r): ComposerChip => ({ type: "document" as const, id: r.path, title: r.label })),
  ];

  const handleRemoveChip = useCallback((chip: ComposerChip) => {
    if (chip.type === "role") onRemovePerspectiveChip?.(chip.id);
    else onRemoveRef(chip.id);
  }, [onRemovePerspectiveChip, onRemoveRef]);

  const handleSend = useCallback(() => {
    const trimmed = text.trim();
    if (!trimmed || isLoading) return;
    onSend(trimmed);
    setText("");
    setMentionState({ active: false, query: "", triggerIdx: -1 });
  }, [text, isLoading, onSend]);

  // Build mention items
  const mentionItems = useMemo(() => {
    const items: MentionItem[] = [];
    availableDocs.forEach(d => items.push({ id: d.path, type: "document", title: d.name, subtitle: d.ext }));
    availableRoles.forEach(r => items.push({ id: r.id, type: "role", title: r.name, subtitle: r.description }));
    
    if (!mentionState.query) return items;
    const lowerQ = mentionState.query.toLowerCase();
    return items.filter(i => i.title.toLowerCase().includes(lowerQ));
  }, [availableDocs, availableRoles, mentionState.query]);

  // Update caret pos
  const updateCaret = useCallback(() => {
    if (textareaRef.current) {
      const caret = getCaretCoordinates(textareaRef.current, textareaRef.current.selectionEnd);
      setCaretPos({ top: caret.top, left: caret.left + 44 }); // offset for padding
    }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    const cursor = e.target.selectionStart;
    setText(val);

    // Detect @
    if (!mentionState.active) {
      const lastChar = val[cursor - 1];
      if (lastChar === "@") {
        setMentionState({ active: true, query: "", triggerIdx: cursor - 1 });
        setMentionIndex(0);
        updateCaret();
      }
    } else {
      if (cursor <= mentionState.triggerIdx) {
        setMentionState({ active: false, query: "", triggerIdx: -1 });
      } else {
        const query = val.slice(mentionState.triggerIdx + 1, cursor);
        // If there's a space, cancel mention (unless we want to support spaces in search)
        if (query.includes(" ")) {
          setMentionState({ active: false, query: "", triggerIdx: -1 });
        } else {
          setMentionState(prev => ({ ...prev, query }));
          setMentionIndex(0);
          updateCaret();
        }
      }
    }
  };

  const insertMention = (item: MentionItem) => {
    if (item.type === "document") {
      const doc = availableDocs.find(d => d.path === item.id);
      if (doc && onAddRef) onAddRef(doc);
    } else {
      const role = availableRoles.find(r => r.id === item.id);
      if (role && onAddRole) onAddRole(role);
    }

    // Remove @query from text
    const before = text.slice(0, mentionState.triggerIdx);
    const after = text.slice(textareaRef.current?.selectionEnd || mentionState.triggerIdx + mentionState.query.length + 1);
    setText(before + after);
    setMentionState({ active: false, query: "", triggerIdx: -1 });
    
    setTimeout(() => {
      textareaRef.current?.focus();
      textareaRef.current?.setSelectionRange(before.length, before.length);
    }, 10);
  };

  const handleAddClick = () => {
    if (mentionState.active) {
      setMentionState({ active: false, query: "", triggerIdx: -1 });
    } else {
      setMentionState({ active: true, query: "", triggerIdx: text.length });
      setMentionIndex(0);
      updateCaret();
      textareaRef.current?.focus();
    }
  };

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (mentionState.active) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setMentionIndex(prev => (prev < mentionItems.length - 1 ? prev + 1 : prev));
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setMentionIndex(prev => (prev > 0 ? prev - 1 : 0));
        return;
      }
      if (e.key === "Enter") {
        e.preventDefault();
        if (mentionItems[mentionIndex]) {
          insertMention(mentionItems[mentionIndex]);
        }
        return;
      }
      if (e.key === "Escape") {
        setMentionState({ active: false, query: "", triggerIdx: -1 });
        return;
      }
    } else {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    }
  }, [mentionState.active, mentionItems, mentionIndex, handleSend]);

  return (
    <div style={{ position: "relative", display: "flex", flexDirection: "column", gap: "8px", maxWidth: "860px", margin: "0 auto", width: "100%" }}>
      {chips.length > 0 && (
        <div style={{ padding: "0 8px" }}>
          <ChipsRow chips={chips} onRemove={handleRemoveChip} styles={styles} />
        </div>
      )}

      <div style={{ position: "relative", display: "flex", alignItems: "center", width: "100%" }}>
        <PromptBox
          ref={textareaRef}
          value={text}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onSend={handleSend}
          placeholder={t.sendMessagePlaceholder}
          style={{ width: "100%" }}
        />

        <MentionPicker
          visible={mentionState.active}
          position={caretPos}
          query={mentionState.query}
          items={mentionItems}
          selectedIndex={mentionIndex}
          onSelect={insertMention}
          onClose={() => setMentionState({ active: false, query: "", triggerIdx: -1 })}
          colors={colors}
        />
      </div>
      
      <div className="composer-bottom" style={{ display: "flex", gap: "6px", flexWrap: "wrap", padding: "0 8px" }}>
        <label className="pill dropdown" style={{ cursor: "pointer" }}>
          Project: {workspaceName} ▾
        </label>
        <label className="pill" style={{ cursor: "pointer" }}>
          Work locally
        </label>
        <label className="pill dropdown" style={{ cursor: "pointer" }} onClick={() => onRoomModeChange?.(roomMode === "single" ? "council" : "single")}>
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

      <ParametersPopover visible={showParams} params={params} onChange={setParams} onClose={() => setShowParams(false)} t={t} styles={styles} colors={colors} />
      <SpeakersPopover visible={showSpeakers} onClose={() => setShowSpeakers(false)} onOpenDispatch={() => onOpenDispatchGate?.()} styles={styles} colors={colors} t={t} />
    </div>
  );
};
