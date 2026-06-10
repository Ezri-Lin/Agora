import React from "react";
import type { ColorPalette } from "../theme/palettes.js";
import { motion, radius, spacing, typography } from "../theme/tokens.js";

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
  borderRadius: radius.xs,
  padding: `${spacing.xs - 1}px ${spacing.md - 2}px`,
  color: active ? colors.accent : colors.textMuted,
  fontSize: typography.meta.size,
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  gap: spacing.xs,
  transition: `color ${motion.fast}, border-color ${motion.fast}`,
});
