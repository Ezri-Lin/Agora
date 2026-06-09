import React from "react";
import { useTheme } from "../theme/ThemeContext.js";
import { summaryContainerStyle, summaryLabelStyle, summaryTextStyle } from "./styles.js";

export interface ModeratorDispatchSummaryProps {
  summary: string;
}

export const ModeratorDispatchSummary: React.FC<ModeratorDispatchSummaryProps> = ({
  summary,
}) => {
  const { colors } = useTheme();

  return (
    <div style={summaryContainerStyle(colors)}>
      <div style={summaryLabelStyle(colors)}>主持人</div>
      <div style={summaryTextStyle(colors)}>{summary}</div>
    </div>
  );
};
