import React from "react";

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

export interface TargetedRoleChip {
  type: "targeted-role";
  id: string;
  label: string;
}

export type ComposerChip = RoleChip | DocumentChip | TargetedRoleChip;

// ─── Parameter types ─────────────────────────────────────────────────

export interface ComposerParameters {
  roomMode: "single" | "council";
  maxRoles: number;
  autoInvite: boolean;
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
            ...(chip.type === "targeted-role" ? { background: "var(--accent)", color: "#fff", borderColor: "var(--accent)" } : {}),
            ...(chip.type === "role" ? styles.chipRole : {}),
          }}
        >
          <span style={styles.chipIcon}>
            {chip.type === "targeted-role" ? "@" : chip.type === "role" ? "+" : "#"}
          </span>
          {chip.type === "document" ? chip.title : chip.label}
          <button
            style={{ ...styles.chipRemove, ...(chip.type === "targeted-role" ? { color: "#fff", opacity: 0.8 } : {}) }}
            onClick={() => onRemove(chip)}
          >
            ✕
          </button>
        </span>
      ))}
    </div>
  );
};

// ─── Popover wrapper ─────────────────────────────────────────────────

interface PopoverWrapperProps {
  visible: boolean;
  onClose: () => void;
  bottom: string;
  left: string;
  children: React.ReactNode;
  styles: Record<string, React.CSSProperties>;
}

const PopoverWrapper: React.FC<PopoverWrapperProps> = ({ visible, onClose, bottom, left, children, styles }) => {
  if (!visible) return null;
  return (
    <>
      <div style={{ position: "fixed", inset: 0, zIndex: 40 }} onClick={onClose} />
      <div style={{ ...styles.popover, bottom, left }}>
        {children}
      </div>
    </>
  );
};

// ─── Menu item component ─────────────────────────────────────────────

interface MenuItemProps {
  children: React.ReactNode;
  onClick: () => void;
  selected?: boolean;
  styles: Record<string, React.CSSProperties>;
}

const MenuItem: React.FC<MenuItemProps> = ({ children, onClick, selected, styles }) => (
  <button
    style={{
      ...styles.popoverOption,
      ...(selected ? styles.popoverOptionSelected : {}),
    }}
    onClick={onClick}
  >
    {children}
  </button>
);

// ─── Add menu ────────────────────────────────────────────────────────

export const AddMenu: React.FC<{
  visible: boolean;
  onClose: () => void;
  onAddDocument: () => void;
  onAddRole: () => void;
  styles: Record<string, React.CSSProperties>;
}> = ({ visible, onClose, onAddDocument, onAddRole, styles }) => (
  <PopoverWrapper visible={visible} onClose={onClose} bottom="40px" left="8px" styles={styles}>
    <div style={styles.popoverTitle}>添加</div>
    <MenuItem onClick={() => { onAddDocument(); onClose(); }} styles={styles}>
      📄 照片和文件
    </MenuItem>
    <MenuItem onClick={() => { onAddRole(); onClose(); }} styles={styles}>
      👤 人物
    </MenuItem>
  </PopoverWrapper>
);

// ─── Project menu ────────────────────────────────────────────────────

export const ProjectMenu: React.FC<{
  visible: boolean;
  onClose: () => void;
  workspaceName: string;
  recentWorkspaces: any[];
  styles: Record<string, React.CSSProperties>;
}> = ({ visible, onClose, workspaceName, recentWorkspaces, styles }) => {
  const otherProjects = recentWorkspaces.filter(p => {
    const pName = p.name || (p.path ? p.path.split('/').pop() : p);
    return pName !== workspaceName;
  }).slice(0, 3);

  return (
    <PopoverWrapper visible={visible} onClose={onClose} bottom="40px" left="50px" styles={styles}>
      <div style={styles.popoverTitle}>项目</div>
      <MenuItem onClick={onClose} selected styles={styles}>
        ✓ {workspaceName}
      </MenuItem>
      {otherProjects.map((p, i) => {
        const pName = p.name || (p.path ? p.path.split('/').pop() : p);
        return (
          <MenuItem key={i} onClick={onClose} styles={styles}>
            {pName}
          </MenuItem>
        );
      })}
      <div style={{ height: 1, background: "var(--line)", margin: "4px 0" }} />
      <MenuItem onClick={onClose} styles={styles}>
        + New Project...
      </MenuItem>
    </PopoverWrapper>
  );
};

// ─── Number stepper ──────────────────────────────────────────────────

const Stepper: React.FC<{
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
}> = ({ value, min, max, onChange }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
    <button
      onClick={() => onChange(Math.max(min, value - 1))}
      disabled={value <= min}
      style={{
        width: 22, height: 22, borderRadius: 4,
        border: "1px solid var(--line)", background: "transparent",
        color: value <= min ? "var(--faint)" : "var(--text)",
        cursor: value <= min ? "default" : "pointer",
        fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center",
      }}
    >−</button>
    <span style={{ width: 24, textAlign: "center", fontSize: 13, fontVariantNumeric: "tabular-nums" }}>
      {value}
    </span>
    <button
      onClick={() => onChange(Math.min(max, value + 1))}
      disabled={value >= max}
      style={{
        width: 22, height: 22, borderRadius: 4,
        border: "1px solid var(--line)", background: "transparent",
        color: value >= max ? "var(--faint)" : "var(--text)",
        cursor: value >= max ? "default" : "pointer",
        fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center",
      }}
    >+</button>
  </div>
);

// ─── Toggle ──────────────────────────────────────────────────────────

const Toggle: React.FC<{
  checked: boolean;
  onChange: (v: boolean) => void;
}> = ({ checked, onChange }) => (
  <button
    onClick={() => onChange(!checked)}
    style={{
      width: 36, height: 20, borderRadius: 10, border: "none",
      background: checked ? "var(--blue)" : "var(--line)",
      cursor: "pointer", position: "relative", transition: "background 0.2s",
    }}
  >
    <span style={{
      width: 16, height: 16, borderRadius: "50%", background: "#fff",
      position: "absolute", top: 2, left: checked ? 18 : 2,
      transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
    }} />
  </button>
);

// ─── Participation menu ──────────────────────────────────────────────

export const ParticipationMenu: React.FC<{
  visible: boolean;
  onClose: () => void;
  params: ComposerParameters;
  onChange: (p: ComposerParameters) => void;
  styles: Record<string, React.CSSProperties>;
}> = ({ visible, onClose, params, onChange, styles }) => {
  const modes = [
    { id: "single", label: "单人助手" },
    { id: "council", label: "多人议事" },
  ];

  return (
    <PopoverWrapper visible={visible} onClose={onClose} bottom="40px" left="180px" styles={styles}>
      {modes.map(m => (
        <MenuItem
          key={m.id}
          onClick={() => onChange({ ...params, roomMode: m.id as ComposerParameters["roomMode"] })}
          selected={params.roomMode === m.id}
          styles={styles}
        >
          {m.label}
        </MenuItem>
      ))}

      {params.roomMode === "council" && (
        <div style={{ borderTop: "1px solid var(--line)", margin: "6px 0", paddingTop: 6 }}>
          <div style={{ ...styles.popoverRow, padding: "4px 8px" }}>
            <span>角色数</span>
            <Stepper value={params.maxRoles} min={1} max={8} onChange={v => onChange({ ...params, maxRoles: v })} />
          </div>
          <div style={{ ...styles.popoverRow, padding: "4px 8px" }}>
            <span>跳过确认</span>
            <Toggle checked={params.autoInvite} onChange={v => onChange({ ...params, autoInvite: v })} />
          </div>
        </div>
      )}
    </PopoverWrapper>
  );
};
