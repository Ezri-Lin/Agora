import React from "react";
import type { ColorPalette } from "../theme/palettes.js";
import { motion } from "../theme/tokens.js";

// ─── Chip types ──────────────────────────────────────────────────────

export interface RoleChip {
  type: "role";
  id: string;
  label: string;
}

export interface DocumentChip {
  type: "document";
  id: string;
  title: string;
}

export type ComposerChip = RoleChip | DocumentChip;

// ─── Parameter types ─────────────────────────────────────────────────

export interface DiscussionMode {
  id: string;
  label: string;
}

export interface ContextScope {
  id: string;
  label: string;
}

export interface WritePolicy {
  id: string;
  label: string;
}

export interface SearchPolicy {
  id: string;
  label: string;
}

export interface ComposerParameters {
  discussionMode: string;
  contextScope: string;
  writePolicy: string;
  searchPolicy: string;
}

// ─── Chips row ───────────────────────────────────────────────────────

interface ChipsRowProps {
  chips: ComposerChip[];
  onRemove: (chip: ComposerChip) => void;
  styles: Record<string, React.CSSProperties>;
}

export const ChipsRow: React.FC<ChipsRowProps> = ({ chips, onRemove, styles }) => {
  if (chips.length === 0) return null;
  return (
    <div style={styles.chipsRow}>
      {chips.map((chip) => (
        <span
          key={`${chip.type}-${chip.id}`}
          style={{
            ...styles.chip,
            ...(chip.type === "role" ? styles.chipRole : {}),
          }}
        >
          <span style={styles.chipIcon}>
            {chip.type === "role" ? "+" : "#"}
          </span>
          {chip.type === "role" ? chip.label : chip.title}
          <button
            style={styles.chipRemove}
            onClick={() => onRemove(chip)}
          >
            x
          </button>
        </span>
      ))}
    </div>
  );
};

// ─── Add menu ────────────────────────────────────────────────────────

interface AddMenuProps {
  visible: boolean;
  onClose: () => void;
  onAddDocument: () => void;
  onAddRole: () => void;
  t: {
    addDocumentRef: string;
    addRole: string;
    uploadFile: string;
    pasteLongText: string;
  };
  styles: Record<string, React.CSSProperties>;
  colors: ColorPalette;
}

export const AddMenu: React.FC<AddMenuProps> = ({
  visible,
  onClose,
  onAddDocument,
  onAddRole,
  t,
  styles,
  colors,
}) => {
  if (!visible) return null;
  return (
    <>
      <div
        style={{ position: "fixed", inset: 0, zIndex: 49 }}
        onClick={onClose}
      />
      <div style={styles.addMenu}>
        <button
          style={styles.addMenuItem}
          onClick={() => { onAddDocument(); onClose(); }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = `${colors.accent}08`; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "none"; }}
        >
          <span>#</span> {t.addDocumentRef}
        </button>
        <button
          style={styles.addMenuItem}
          onClick={() => { onAddRole(); onClose(); }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = `${colors.accent}08`; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "none"; }}
        >
          <span>+</span> {t.addRole}
        </button>
      </div>
    </>
  );
};

// ─── Parameters popover ──────────────────────────────────────────────

interface ParametersPopoverProps {
  visible: boolean;
  params: ComposerParameters;
  onChange: (params: ComposerParameters) => void;
  onClose: () => void;
  t: {
    discussionMode: string;
    contextScope: string;
    writePolicy: string;
    searchPolicy: string;
    quickAnswer: string;
    deepDiscussion: string;
    counterFirst: string;
    summarySink: string;
    currentRoom: string;
    currentDocument: string;
    currentSelection: string;
    workspaceGraph: string;
    discussOnly: string;
    generateSummary: string;
    writeToDocument: string;
    generateMemories: string;
    noSearch: string;
    searchWhenNeeded: string;
  };
  styles: Record<string, React.CSSProperties>;
  colors: ColorPalette;
}

export const ParametersPopover: React.FC<ParametersPopoverProps> = ({
  visible,
  params,
  onChange,
  onClose,
  t,
  styles,
  colors,
}) => {
  if (!visible) return null;

  const discussionModes: DiscussionMode[] = [
    { id: "quick", label: t.quickAnswer },
    { id: "deep", label: t.deepDiscussion },
    { id: "counter", label: t.counterFirst },
    { id: "summary", label: t.summarySink },
  ];
  const contextScopes: ContextScope[] = [
    { id: "room", label: t.currentRoom },
    { id: "document", label: t.currentDocument },
    { id: "selection", label: t.currentSelection },
    { id: "graph", label: t.workspaceGraph },
  ];
  const writePolicies: WritePolicy[] = [
    { id: "none", label: t.discussOnly },
    { id: "summary", label: t.generateSummary },
    { id: "document", label: t.writeToDocument },
    { id: "memory", label: t.generateMemories },
  ];
  const searchPolicies: SearchPolicy[] = [
    { id: "none", label: t.noSearch },
    { id: "auto", label: t.searchWhenNeeded },
  ];

  const optionBtn = (
    options: Array<{ id: string; label: string }>,
    selected: string,
    onSelect: (id: string) => void,
  ) => (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
      {options.map((opt) => (
        <button
          key={opt.id}
          style={{
            ...styles.popoverOption,
            display: "inline-block",
            width: "auto",
            ...(opt.id === selected ? styles.popoverOptionSelected : {}),
          }}
          onClick={() => onSelect(opt.id)}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );

  return (
    <>
      <div
        style={{ position: "fixed", inset: 0, zIndex: 49 }}
        onClick={onClose}
      />
      <div style={styles.popover}>
        <div style={styles.popoverTitle}>{t.discussionMode}</div>
        {optionBtn(discussionModes, params.discussionMode, (id) => onChange({ ...params, discussionMode: id }))}

        <div style={{ ...styles.popoverTitle, marginTop: 12 }}>{t.contextScope}</div>
        {optionBtn(contextScopes, params.contextScope, (id) => onChange({ ...params, contextScope: id }))}

        <div style={{ ...styles.popoverTitle, marginTop: 12 }}>{t.writePolicy}</div>
        {optionBtn(writePolicies, params.writePolicy, (id) => onChange({ ...params, writePolicy: id }))}

        <div style={{ ...styles.popoverTitle, marginTop: 12 }}>{t.searchPolicy}</div>
        {optionBtn(searchPolicies, params.searchPolicy, (id) => onChange({ ...params, searchPolicy: id }))}
      </div>
    </>
  );
};

// ─── Speakers popover ────────────────────────────────────────────────

interface SpeakersPopoverProps {
  visible: boolean;
  onClose: () => void;
  onOpenDispatch: () => void;
  styles: Record<string, React.CSSProperties>;
  colors: ColorPalette;
  t: {
    speakers: string;
    addRole: string;
  };
}

export const SpeakersPopover: React.FC<SpeakersPopoverProps> = ({
  visible,
  onClose,
  onOpenDispatch,
  styles,
  colors,
  t,
}) => {
  if (!visible) return null;
  return (
    <>
      <div
        style={{ position: "fixed", inset: 0, zIndex: 49 }}
        onClick={onClose}
      />
      <div style={styles.popover}>
        <div style={styles.popoverTitle}>{t.speakers}</div>
        <button
          style={{
            ...styles.popoverOption,
            marginTop: 4,
          }}
          onClick={() => { onOpenDispatch(); onClose(); }}
        >
          + {t.addRole}
        </button>
      </div>
    </>
  );
};
