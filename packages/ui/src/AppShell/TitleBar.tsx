import React from "react";
import { colors, sizes } from "../theme/tokens.js";
import { useI18n } from "../i18n/I18nContext.js";

interface TitleBarProps {
  workspaceName: string;
  onOpenWorkspace: () => void;
  onOpenSettings?: () => void;
}

export const TitleBar: React.FC<TitleBarProps> = ({ workspaceName, onOpenWorkspace, onOpenSettings }) => {
  const { t, toggleLocale, locale } = useI18n();
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
        {onOpenSettings && (
          <button style={styles.settingsBtn} onClick={onOpenSettings} title={t.modelSettings}>
            {t.settings}
          </button>
        )}
      </div>
    </header>
  );
};

const styles: Record<string, React.CSSProperties> = {
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
};
