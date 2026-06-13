import React from "react";
import { layout, radius, spacing, typography, motion, zIndex } from "../theme/tokens.js";
import { useI18n } from "../i18n/I18nContext.js";
import { useTheme } from "../theme/ThemeContext.js";
import type { ColorPalette } from "../theme/palettes.js";
import { useNarrowViewport } from "../hooks/useNarrowViewport.js";
import type { AppView } from "./AppShell.types.js";

interface TitleBarProps {
  workspaceName: string;
  onOpenWorkspace: () => void;
  view?: AppView;
  onViewChange?: (view: AppView) => void;
  onOpenSettings?: () => void;
  terminalVisible?: boolean;
  onToggleTerminal?: () => void;
  panelVisible?: boolean;
  onTogglePanel?: () => void;
}

export const TitleBar: React.FC<TitleBarProps> = ({
  workspaceName,
  onOpenWorkspace,
  view,
  onViewChange,
  onOpenSettings,
  terminalVisible,
  onToggleTerminal,
  panelVisible,
  onTogglePanel,
}) => {
  const { t } = useI18n();
  const { colors } = useTheme();
  const isNarrow = useNarrowViewport();
  const styles = createStyles(colors, isNarrow);
  return (
    <header style={styles.bar}>
      <div style={styles.left}>
        <button style={styles.workspaceBtn} onClick={onOpenWorkspace}>
          {workspaceName || t.openWorkspace}
        </button>
      </div>
      <nav style={styles.center} aria-label="Primary">
        {(["home", "room"] as const).map((item) => (
          <button
            key={item}
            type="button"
            style={{
              ...styles.navButton,
              ...(view === item ? styles.navButtonActive : {}),
            }}
            aria-pressed={view === item}
            onClick={() => onViewChange?.(item)}
          >
            {item === "home" ? "Home" : "Room"}
          </button>
        ))}
      </nav>
      <div style={styles.right}>
        {view === "room" && onTogglePanel && (
          <button
            style={{
              ...styles.utilityButton,
              ...(panelVisible ? styles.utilityButtonActive : {}),
            }}
            onClick={onTogglePanel}
            title={panelVisible ? t.collapse : t.expand}
          >
            Inspector
          </button>
        )}
        {!isNarrow && onToggleTerminal && (
          <button
            style={{
              ...styles.utilityButton,
              ...(terminalVisible ? styles.utilityButtonActive : {}),
            }}
            onClick={onToggleTerminal}
            title={t.terminal}
          >
            Activity
          </button>
        )}
        {onOpenSettings && (
          <button style={styles.settingsButton} onClick={onOpenSettings}>
            {t.settings}
          </button>
        )}
      </div>
    </header>
  );
};

const createStyles = (colors: ColorPalette, isNarrow: boolean): Record<string, React.CSSProperties> => ({
  bar: {
    height: layout.titleBar,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: `0 ${isNarrow ? spacing.sm : spacing.md}px`,
    background: colors.surface,
    borderBottom: `1px solid ${colors.border}`,
    userSelect: "none",
    zIndex: zIndex.titleBar,
  },
  left: {
    display: "flex",
    alignItems: "center",
    minWidth: isNarrow ? 0 : 200,
    maxWidth: isNarrow ? 98 : undefined,
  },
  center: {
    flex: 1,
    display: "flex",
    justifyContent: "center",
    gap: isNarrow ? 0 : spacing.xs,
  },
  navButton: {
    border: "none",
    borderRadius: radius.pill,
    background: "transparent",
    color: colors.textMuted,
    fontSize: typography.meta.size,
    fontWeight: 800,
    padding: `${spacing.xs}px ${isNarrow ? spacing.sm : spacing.md}px`,
    cursor: "pointer",
  },
  navButtonActive: {
    background: colors.surfaceHover,
    color: colors.text,
  },
  workspaceBtn: {
    background: "none",
    border: `1px solid ${colors.border}`,
    borderRadius: radius.sm,
    padding: `${spacing.xxs}px ${spacing.md}px`,
    color: colors.text,
    fontSize: typography.meta.size,
    cursor: "pointer",
    transition: `border-color ${motion.fast}`,
    maxWidth: isNarrow ? 88 : 280,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  right: {
    display: "flex",
    alignItems: "center",
    gap: spacing.xxs,
  },
  utilityButton: {
    border: `1px solid transparent`,
    borderRadius: radius.sm,
    background: "transparent",
    color: colors.textMuted,
    fontSize: typography.meta.size,
    fontWeight: 800,
    padding: `${spacing.xs}px ${isNarrow ? spacing.sm : spacing.md}px`,
    cursor: "pointer",
  },
  utilityButtonActive: {
    borderColor: colors.border,
    background: colors.surfaceHover,
    color: colors.text,
  },
  settingsButton: {
    border: `1px solid ${colors.border}`,
    borderRadius: radius.sm,
    background: "transparent",
    color: colors.text,
    fontSize: typography.meta.size,
    fontWeight: 800,
    padding: `${spacing.xs}px ${isNarrow ? spacing.sm : spacing.md}px`,
    cursor: "pointer",
  },
});
