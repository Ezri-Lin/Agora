import React, { type ReactNode } from "react";
import { TextShimmer } from "./TextShimmer.js";
import { useTheme } from "../theme/ThemeContext.js";
import { createToolStyles } from "./toolStyles.js";

export type ToolRowBaseProps = {
  icon?: ReactNode;
  shimmerLabel?: string;
  completeLabel: string;
  isAnimating: boolean;
  detail?: string;
  trailingContent?: ReactNode;
  expandable?: boolean;
  expanded?: boolean;
  defaultOpen?: boolean;
  onToggleExpand?: () => void;
  children?: ReactNode;
};

export function ToolRowBase({
  icon,
  shimmerLabel,
  completeLabel,
  isAnimating,
  detail,
  trailingContent,
  expandable = false,
  expanded,
  defaultOpen = false,
  onToggleExpand,
  children,
}: ToolRowBaseProps) {
  const { colors } = useTheme();
  const styles = createToolStyles(colors);
  const isExpanded = expanded ?? defaultOpen;
  const canToggle = expandable && (!isAnimating || isExpanded);

  const row = (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        maxWidth: "100%",
        userSelect: "none",
        gap: 4,
        borderRadius: 10,
        cursor: canToggle ? "pointer" : "default",
      }}
      onClick={canToggle ? onToggleExpand : undefined}
    >
      <div style={styles.toolHeaderLeft}>
        {icon && (
          <span style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 12, height: 12, flexShrink: 0 }}>
            {icon}
          </span>
        )}
        <span style={{ fontWeight: 450, whiteSpace: "nowrap", flexShrink: 0 }}>
          {isAnimating && shimmerLabel ? (
            <TextShimmer
              as="span"
              duration={1.2}
              style={{ display: "inline-flex", alignItems: "center", lineHeight: 1, height: 16, margin: 0 }}
            >
              {shimmerLabel}
            </TextShimmer>
          ) : (
            completeLabel
          )}
        </span>
        {detail && (
          <span style={{ fontWeight: 400, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", minWidth: 0, flex: 1, opacity: 0.6, color: colors.textMuted }}>
            {detail}
          </span>
        )}
        {trailingContent}
      </div>
      {expandable && (
        <svg
          style={{
            width: 12,
            height: 12,
            flexShrink: 0,
            color: colors.textMuted,
            transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)",
            transition: "transform 0.15s ease-out",
          }}
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M6 4l4 4-4 4" />
        </svg>
      )}
    </div>
  );

  if (!expandable) {
    return <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>{row}</div>;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, width: "100%" }}>
      {row}
      {isExpanded && children && (
        <div style={{ overflow: "hidden" }}>
          {children}
        </div>
      )}
    </div>
  );
}
