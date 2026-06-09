import React from "react";
import { layout, radius, spacing, typography, motion, zIndex, shadow } from "../theme/tokens.js";
import { useI18n } from "../i18n/I18nContext.js";
import { useTheme } from "../theme/ThemeContext.js";
import type { ColorPalette } from "../theme/palettes.js";

interface TitleBarProps {
  workspaceName: string;
  onOpenWorkspace: () => void;
  onOpenSettings?: () => void;
  terminalVisible?: boolean;
  onToggleTerminal?: () => void;
  panelVisible?: boolean;
  onTogglePanel?: () => void;
}

export const TitleBar: React.FC<TitleBarProps> = ({
  workspaceName,
  onOpenWorkspace,
  onOpenSettings,
  terminalVisible,
  onToggleTerminal,
  panelVisible,
  onTogglePanel,
}) => {
  const { t } = useI18n();
  const { colors } = useTheme();
  const styles = createStyles(colors);
  return (
    <header style={styles.bar}>
      <div style={styles.left}>
        <button style={styles.workspaceBtn} onClick={onOpenWorkspace}>
          {workspaceName || t.openWorkspace}
        </button>
      </div>
      <div style={styles.center} />
      <div style={styles.right}>
        {onTogglePanel && (
          <button
            style={{
              ...styles.iconBtn,
              ...(panelVisible ? styles.iconBtnActive : {}),
            }}
            onClick={onTogglePanel}
            title={panelVisible ? t.collapse : t.expand}
          >
            {panelVisible ? "☑" : "☐"}
          </button>
        )}
        {onToggleTerminal && (
          <button
            style={{
              ...styles.iconBtn,
              ...(terminalVisible ? styles.iconBtnActive : {}),
            }}
            onClick={onToggleTerminal}
            title={t.terminal}
          >
            {">_"}
          </button>
        )}
        {onOpenSettings && (
          <button style={styles.iconBtn} onClick={onOpenSettings} title={t.settings}>
            {"⚙"}
          </button>
        )}
      </div>
    </header>
  );
};

const createStyles = (colors: ColorPalette): Record<string, React.CSSProperties> => ({
  bar: {
    height: layout.titleBar,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: `0 ${spacing.md}px`,
    background: colors.surface,
    borderBottom: `1px solid ${colors.border}`,
    userSelect: "none",
    zIndex: zIndex.titleBar,
  },
  left: {
    display: "flex",
    alignItems: "center",
    minWidth: 200,
  },
  center: { flex: 1 },
  workspaceBtn: {
    background: "none",
    border: `1px solid ${colors.border}`,
    borderRadius: radius.sm,
    padding: `${spacing.xxs}px ${spacing.md}px`,
    color: colors.text,
    fontSize: typography.meta.size,
    cursor: "pointer",
    transition: `border-color ${motion.fast}`,
    maxWidth: 280,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  right: {
    display: "flex",
    alignItems: "center",
    gap: spacing.xxs,
  },
  iconBtn: {
    background: "none",
    border: `1px solid transparent`,
    borderRadius: radius.xs,
    width: 28,
    height: 28,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: colors.textMuted,
    fontSize: typography.meta.size,
    cursor: "pointer",
    transition: `all ${motion.fast}`,
  },
  iconBtnActive: {
    borderColor: colors.accent,
    color: colors.accent,
  },
});
