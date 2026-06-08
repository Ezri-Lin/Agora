import React from "react";
import type { ColorPalette } from "../theme/palettes.js";

interface TerminalToggleProps {
  visible: boolean;
  onToggle: () => void;
  colors: ColorPalette;
  label: string;
}

export const TerminalToggle: React.FC<TerminalToggleProps> = ({ visible, onToggle, colors, label }) => {
  return (
    <button
      onClick={onToggle}
      style={btnStyle(colors, visible)}
      title={label}
    >
      {">_"} {label}
    </button>
  );
};

const btnStyle = (colors: ColorPalette, active: boolean): React.CSSProperties => ({
  background: active ? colors.surface : "none",
  border: `1px solid ${active ? colors.accent : colors.border}`,
  borderRadius: 4,
  padding: "3px 10px",
  color: active ? colors.accent : colors.textMuted,
  fontSize: 11,
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  gap: 4,
  transition: "color 0.15s, border-color 0.15s",
});
