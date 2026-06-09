import React, { useState, useEffect } from "react";
import type { RecentWorkspace } from "./AgoraBridge.js";
import { useI18n } from "./i18n/I18nContext.js";
import { useTheme } from "./theme/ThemeContext.js";
import type { ColorPalette } from "./theme/palettes.js";
import { brandGlow, radius, shadow, spacing, typography } from "./theme/tokens.js";

interface EmptyStateProps {
  onOpen: () => void;
  onOpenRecent?: (path: string) => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ onOpen, onOpenRecent }) => {
  const { t } = useI18n();
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const [recent, setRecent] = useState<RecentWorkspace[]>([]);

  useEffect(() => {
    window.agora?.workspace.getRecent().then(setRecent).catch(() => {});
  }, []);

  return (
    <div style={styles.root}>
      <div style={styles.card}>
        <div style={styles.logo} role="img" aria-label="Agora logo">A</div>
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

const createStyles = (colors: ColorPalette): Record<string, React.CSSProperties> => ({
  root: {
    height: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: colors.bg,
  },
  card: {
    textAlign: "center",
    padding: spacing.xxl,
    maxWidth: 480,
    width: "100%",
  },
  logo: {
    width: 64,
    height: 64,
    borderRadius: radius.md,
    background: colors.accentDim,
    color: colors.bg,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: typography.heroTitle.weight,
    fontSize: typography.heroTitle.size,
    margin: `0 auto ${spacing.lg}px`,
    boxShadow: brandGlow,
  },
  title: {
    fontSize: typography.heroTitle.size,
    fontWeight: typography.heroTitle.weight,
    lineHeight: typography.heroTitle.lineHeight,
    color: colors.text,
    margin: 0,
  },
  subtitle: {
    fontSize: typography.chatBody.size,
    lineHeight: typography.chatBody.lineHeight,
    color: colors.textMuted,
    marginTop: spacing.sm,
    marginBottom: spacing.xl,
  },
  btn: {
    padding: `${spacing.sm + 2}px ${spacing.xl}px`,
    borderRadius: radius.sm,
    background: colors.accentDim,
    border: "none",
    color: colors.bg,
    fontSize: typography.chatBody.size,
    fontWeight: 700,
    cursor: "pointer",
  },
  recentSection: {
    marginTop: spacing.xxl,
    textAlign: "left",
  },
  recentLabel: {
    fontSize: typography.sectionTitle.size,
    fontWeight: typography.sectionTitle.weight,
    color: colors.textMuted,
    textTransform: "uppercase" as const,
    letterSpacing: typography.sectionTitle.tracking,
    marginBottom: spacing.sm,
  },
  recentItem: {
    display: "flex",
    flexDirection: "column" as const,
    width: "100%",
    padding: `${spacing.sm}px ${spacing.md}px`,
    background: colors.surface,
    border: `1px solid ${colors.border}`,
    borderRadius: radius.sm,
    marginBottom: spacing.xs,
    cursor: "pointer",
    textAlign: "left" as const,
    boxShadow: shadow.card,
  },
  recentName: {
    fontSize: typography.chatBody.size,
    fontWeight: 700,
    color: colors.text,
  },
  recentPath: {
    fontSize: typography.meta.size,
    color: colors.textMuted,
    marginTop: spacing.xxs,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap" as const,
  },
});
