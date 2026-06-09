import React from "react";
import { useTheme } from "../theme/ThemeContext.js";
import { searchBoxStyle, searchInputStyle, searchIconStyle } from "./styles.js";

export interface RoleSearchBoxProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export const RoleSearchBox: React.FC<RoleSearchBoxProps> = ({
  value,
  onChange,
  placeholder = "搜索角色、领域、标签…",
}) => {
  const { colors } = useTheme();

  return (
    <div style={searchBoxStyle(colors)}>
      <span style={searchIconStyle(colors)} aria-hidden="true">
        🔍
      </span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={searchInputStyle(colors)}
        aria-label="搜索角色"
      />
    </div>
  );
};
