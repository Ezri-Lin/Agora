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
}

export const RoomModeTabs: React.FC<RoomModeTabsProps> = ({
  mode,
  onChange,
  colors,
  labelSingle,
  labelCouncil,
  tooltip,
}) => {
  return (
    <div style={containerStyle} title={tooltip}>
      <TabButton
        label={labelSingle}
        active={mode === "single"}
        onClick={() => onChange("single")}
        colors={colors}
      />
      <TabButton
        label={labelCouncil}
        active={mode === "council"}
        onClick={() => onChange("council")}
        colors={colors}
      />
    </div>
  );
};

const TabButton: React.FC<{
  label: string;
  active: boolean;
  onClick: () => void;
  colors: ColorPalette;
}> = ({ label, active, onClick, colors }) => (
  <button
    onClick={onClick}
    style={{
      background: "none",
      border: "none",
      borderBottom: active ? `2px solid ${colors.accent}` : "2px solid transparent",
      color: active ? colors.accent : colors.textMuted,
      fontSize: 11,
      fontWeight: active ? 600 : 400,
      padding: "4px 8px",
      cursor: "pointer",
      transition: "color 0.15s, border-color 0.15s",
      lineHeight: 1,
    }}
  >
    {label}
  </button>
);

const containerStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 0,
};
