import React, { useState } from "react";
import { useTheme } from "../theme/ThemeContext.js";
import type { ColorPalette } from "../theme/palettes.js";

interface AccordionSectionProps {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

export const AccordionSection: React.FC<AccordionSectionProps> = ({ title, defaultOpen = false, children }) => {
  const { colors } = useTheme();
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div style={wrapStyle(colors)}>
      <button style={headerStyle(colors)} onClick={() => setOpen(!open)}>
        <span style={{ ...arrowStyle, transform: open ? "rotate(90deg)" : "rotate(0deg)" }}>▸</span>
        <span style={titleStyle(colors)}>{title}</span>
      </button>
      {open && <div style={contentStyle}>{children}</div>}
    </div>
  );
};

// --- Styles ---

const wrapStyle = (colors: ColorPalette): React.CSSProperties => ({
  borderBottom: `1px solid ${colors.border}`,
});

const headerStyle = (colors: ColorPalette): React.CSSProperties => ({
  display: "flex",
  alignItems: "center",
  gap: 4,
  width: "100%",
  padding: "6px 12px",
  background: "none",
  border: "none",
  cursor: "pointer",
  textAlign: "left",
});

const arrowStyle: React.CSSProperties = {
  fontSize: 8,
  transition: "transform 0.15s",
  display: "inline-block",
  color: "inherit",
};

const titleStyle = (colors: ColorPalette): React.CSSProperties => ({
  fontSize: 10,
  fontWeight: 600,
  color: colors.textMuted,
  textTransform: "uppercase",
  letterSpacing: 0.5,
});

const contentStyle: React.CSSProperties = {
  padding: "0 12px 8px",
};
