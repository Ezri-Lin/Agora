import React from "react";
import { sizes } from "../theme/tokens.js";
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

export const TitleBar: React.FC<TitleBarProps> = ({ workspaceName, onOpenWorkspace, onOpenSettings, terminalVisible, onToggleTerminal, panelVisible, onTogglePanel }) => {
  const { t, toggleLocale, locale } = useI18n();
  const { colors, theme, toggleTheme } = useTheme();
  const styles = createStyles(colors);
  return (
    <header style={styles.bar}>
      <div style={styles.left}>
        <span style={styles.logo}>A</span>
        <span style={styles.title}>{t.appTitle}</span>
      </div>
      <div style={styles.center}>
        <button style={styles.workspaceBtn} onClick={onOpenWorkspace}>
          {workspaceName || t.openWorkspace}
        </button>
      </div>
      <div style={styles.right}>
        <span style={styles.badge}>{t.localFirst}</span>
        <span style={styles.badge}>{t.docsOnly}</span>
        <button style={styles.langBtn} onClick={toggleLocale} title="Language">
          {locale === "en" ? "中文" : "EN"}
        </button>
        <button style={styles.langBtn} onClick={toggleTheme} title={theme === "dark" ? t.lightMode : t.darkMode}>
          {theme === "dark" ? "☀" : "☾"}
        </button>
        {onToggleTerminal && (
          <button
            style={{ ...styles.langBtn, borderColor: terminalVisible ? colors.accent : undefined, color: terminalVisible ? colors.accent : undefined }}
            onClick={onToggleTerminal}
            title={t.terminal}
          >
            {">_"}
          </button>
        )}
        {onTogglePanel && (
          <button
            style={{ ...styles.langBtn, borderColor: panelVisible ? colors.accent : undefined, color: panelVisible ? colors.accent : undefined }}
            onClick={onTogglePanel}
            title={panelVisible ? t.collapse : t.expand}
          >
            {panelVisible ? "☑" : "☐"}
          </button>
        )}
        {onOpenSettings && (
          <button style={styles.settingsBtn} onClick={onOpenSettings} title={t.modelSettings}>
            {t.settings}
          </button>
        )}
      </div>
    </header>
  );
};

const createStyles = (colors: ColorPalette): Record<string, React.CSSProperties> => ({
  bar: {
    height: sizes.titleBar,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "0 12px",
    background: colors.surface,
    borderBottom: `1px solid ${colors.border}`,
    userSelect: "none",
  },
  left: { display: "flex", alignItems: "center", gap: 8 },
  logo: {
    width: 24,
    height: 24,
    borderRadius: 4,
    background: colors.accent,
    color: "#fff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 700,
    fontSize: 14,
  },
  title: { fontWeight: 600, fontSize: 14, color: colors.text },
  center: { flex: 1, textAlign: "center" },
  workspaceBtn: {
    background: "none",
    border: `1px solid ${colors.border}`,
    borderRadius: 6,
    padding: "3px 12px",
    color: colors.text,
    fontSize: 12,
    cursor: "pointer",
  },
  right: { display: "flex", gap: 6 },
  badge: {
    fontSize: 10,
    padding: "2px 6px",
    borderRadius: 4,
    background: colors.border,
    color: colors.textMuted,
  },
  langBtn: {
    background: "none",
    border: `1px solid ${colors.border}`,
    borderRadius: 4,
    padding: "2px 8px",
    fontSize: 10,
    color: colors.textMuted,
    cursor: "pointer",
  },
  settingsBtn: {
    background: "none",
    border: `1px solid ${colors.border}`,
    borderRadius: 4,
    padding: "2px 8px",
    fontSize: 10,
    color: colors.textMuted,
    cursor: "pointer",
  },
});
