import React from "react";
import type { ColorPalette } from "../theme/palettes.js";
import { headerActionsStyle, headerStyle, headerTitleStyle, iconButtonStyle } from "./runInspectorStyles.js";

interface RunInspectorHeaderProps {
  title: string;
  colors: ColorPalette;
  onClose?: () => void;
}

export const RunInspectorHeader: React.FC<RunInspectorHeaderProps> = ({
  title,
  colors,
  onClose,
}) => (
  <div style={headerStyle(colors)}>
    <div style={headerTitleStyle(colors)}>{title}</div>
    <div style={headerActionsStyle}>
      {onClose && (
        <button type="button" style={iconButtonStyle(colors)} aria-label="Close inspector" onClick={onClose}>
          x
        </button>
      )}
    </div>
  </div>
);
