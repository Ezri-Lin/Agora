import React, { useState, useEffect } from "react";
import type { RecentWorkspace } from "./AgoraBridge.js";
import { colors } from "./theme/tokens.js";
import { useI18n } from "./i18n/I18nContext.js";

interface EmptyStateProps {
  onOpen: () => void;
  onOpenRecent?: (path: string) => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ onOpen, onOpenRecent }) => {
  const { t } = useI18n();
  const [recent, setRecent] = useState<RecentWorkspace[]>([]);

  useEffect(() => {
    window.agora?.workspace.getRecent().then(setRecent).catch(() => {});
  }, []);

  return (
    <div style={styles.root}>
      <div style={styles.card}>
        <div style={styles.logo}>A</div>
        <h1 style={styles.title}>{t.appTitle}</h1>
        <p style={styles.subtitle}>{t.appSubtitle}</p>
        <button style={styles.btn} onClick={onOpen}>
          {t.openWorkspace}
        </button>

        {recent.length > 0 && (
          <div style={styles.recentSection}>
            <div style={styles.recentLabel}>{t.recentWorkspaces}</div>
            {recent.map((ws) => (
              <button
                key={ws.path}
                style={styles.recentItem}
                onClick={() => onOpenRecent?.(ws.path)}
              >
                <span style={styles.recentName}>{ws.name}</span>
                <span style={styles.recentPath}>{ws.path}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  root: {
    height: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: colors.bg,
  },
  card: {
    textAlign: "center",
    padding: 48,
    maxWidth: 480,
    width: "100%",
  },
  logo: {
    width: 64,
    height: 64,
    borderRadius: 12,
    background: colors.accent,
    color: "#fff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 700,
    fontSize: 32,
    margin: "0 auto 16px",
  },
  title: {
    fontSize: 28,
    fontWeight: 700,
    color: colors.text,
    margin: 0,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textMuted,
    marginTop: 8,
    marginBottom: 24,
  },
  btn: {
    padding: "10px 24px",
    borderRadius: 8,
    background: colors.accent,
    border: "none",
    color: "#fff",
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
  },
  recentSection: {
    marginTop: 32,
    textAlign: "left",
  },
  recentLabel: {
    fontSize: 11,
    fontWeight: 600,
    color: colors.textMuted,
    textTransform: "uppercase" as const,
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  recentItem: {
    display: "flex",
    flexDirection: "column" as const,
    width: "100%",
    padding: "8px 12px",
    background: "none",
    border: `1px solid ${colors.border}`,
    borderRadius: 6,
    marginBottom: 4,
    cursor: "pointer",
    textAlign: "left" as const,
  },
  recentName: {
    fontSize: 13,
    fontWeight: 600,
    color: colors.text,
  },
  recentPath: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap" as const,
  },
};
