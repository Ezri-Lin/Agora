import React from "react";
import type { SidecarTab } from "../AppShell/AppShell.types.js";
import { useTheme } from "../theme/ThemeContext.js";
import type { ColorPalette } from "../theme/tokens.js";
import { spacing, typography } from "../theme/tokens.js";

interface SidecarProps {
  tab: SidecarTab;
  onTabChange: (tab: SidecarTab) => void;
  progress: React.ReactNode;
  docs: React.ReactNode;
}

export const Sidecar: React.FC<SidecarProps> = ({ tab, onTabChange, progress, docs }) => {
  const { colors } = useTheme();
  const styles = createStyles(colors);

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <button
          style={tab === "progress" ? styles.tabActive : styles.tab}
          onClick={() => onTabChange("progress")}
        >
          Progress
        </button>
        <button
          style={tab === "docs" ? styles.tabActive : styles.tab}
          onClick={() => onTabChange("docs")}
        >
          Docs
        </button>
      </div>
      <div style={styles.body}>
        {tab === "progress" ? progress : docs}
      </div>
    </div>
  );
};

const createStyles = (colors: ColorPalette) => ({
  container: {
    display: "flex",
    flexDirection: "column" as const,
    height: "100%",
    background: colors.bg,
  },
  header: {
    display: "flex",
    alignItems: "center",
    height: 40,
    gap: 0,
    borderBottom: `1px solid ${colors.border}`,
    padding: `0 ${spacing.md}px`,
    flexShrink: 0,
  },
  tab: {
    background: "none",
    border: "none",
    borderBottom: "2px solid transparent",
    padding: `${spacing.sm}px ${spacing.md}px`,
    fontSize: typography.meta.size,
    fontWeight: 500,
    color: colors.textMuted,
    cursor: "pointer",
    transition: "color 0.15s, border-color 0.15s",
  },
  tabActive: {
    background: "none",
    border: "none",
    borderBottom: `2px solid ${colors.accent}`,
    padding: `${spacing.sm}px ${spacing.md}px`,
    fontSize: typography.meta.size,
    fontWeight: 600,
    color: colors.text,
    cursor: "pointer",
    transition: "color 0.15s, border-color 0.15s",
  },
  body: {
    flex: 1,
    overflow: "hidden",
  },
});
