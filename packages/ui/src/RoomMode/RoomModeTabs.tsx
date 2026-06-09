import React from "react";
import type { RoomMode } from "@agora/shared";
import type { ColorPalette } from "../theme/palettes.js";

interface RoomModeTabsProps {
  mode: RoomMode;
  onChange: (mode: RoomMode) => void;
  colors: ColorPalette;
  labelSingle: string;
  labelCouncil: string;
  tooltip: string;
  singleHint?: string;
  councilHint?: string;
}

export const RoomModeTabs: React.FC<RoomModeTabsProps> = ({
  mode,
  onChange,
  colors,
  labelSingle,
  labelCouncil,
  tooltip,
  singleHint,
  councilHint,
}) => {
  const hint = mode === "single" ? singleHint : councilHint;
  return (
    <div style={containerStyle} title={tooltip}>
      <TabButton
        label={labelSingle}
        count={1}
        active={mode === "single"}
        onClick={() => onChange("single")}
        colors={colors}
      />
      <TabButton
        label={labelCouncil}
        count={3}
        active={mode === "council"}
        onClick={() => onChange("council")}
        colors={colors}
      />
      {hint && <span style={hintStyle(colors)}>{hint}</span>}
    </div>
  );
};

const TabButton: React.FC<{
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
  colors: ColorPalette;
}> = ({ label, count, active, onClick, colors }) => (
  <button
    onClick={onClick}
    style={{
      background: active ? `${colors.accent}15` : "none",
      border: "none",
      borderBottom: active ? `2px solid ${colors.accent}` : "2px solid transparent",
      color: active ? colors.accent : colors.textMuted,
      fontSize: 11,
      fontWeight: active ? 600 : 400,
      padding: "4px 8px",
      cursor: "pointer",
      transition: "color 0.15s, border-color 0.15s, background 0.15s",
      lineHeight: 1,
      borderRadius: "4px 4px 0 0",
      display: "flex",
      alignItems: "center",
      gap: 4,
    }}
  >
    {label}
    <span style={{ fontSize: 9, opacity: 0.6 }}>{count}</span>
  </button>
);

const containerStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 0,
};

const hintStyle = (colors: ColorPalette): React.CSSProperties => ({
  fontSize: 9,
  color: colors.textMuted,
  marginLeft: 8,
  whiteSpace: "nowrap",
});
