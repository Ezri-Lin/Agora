import React from "react";
import { useTheme } from "../theme/ThemeContext.js";
import {
  sectionHeadingStyle,
  sectionListStyle,
  sectionItemStyle,
  sectionEmptyStyle,
} from "./styles.js";

interface SummarySectionProps {
  title: string;
  items: string[];
  emptyText?: string;
}

export const SummarySection: React.FC<SummarySectionProps> = ({
  title,
  items,
  emptyText,
}) => {
  const { colors } = useTheme();

  return (
    <div>
      <div style={sectionHeadingStyle(colors)}>{title}</div>
      {items.length > 0 ? (
        <ul style={sectionListStyle}>
          {items.map((item, i) => (
            <li key={i} style={sectionItemStyle(colors)}>{item}</li>
          ))}
        </ul>
      ) : (
        <div style={sectionEmptyStyle(colors)}>
          {emptyText ?? `暂无${title}`}
        </div>
      )}
    </div>
  );
};
