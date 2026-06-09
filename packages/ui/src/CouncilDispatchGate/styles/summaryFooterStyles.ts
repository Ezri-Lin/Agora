import type { ColorPalette } from "../../theme/palettes.js";
import { radius, spacing, typography } from "../../theme/tokens.js";

export function summaryContainerStyle(colors: ColorPalette): React.CSSProperties {
  return {
    padding: `${spacing.md + 2}px ${spacing.lg + 2}px`,
    borderRadius: radius.md,
    background: colors.bg,
    border: `1px solid ${colors.border}`,
    marginBottom: spacing.xl,
  };
}

export const summaryLabelStyle = (colors: ColorPalette): React.CSSProperties => ({
  fontSize: typography.badge.size,
  fontWeight: 700,
  color: colors.textMuted,
  textTransform: "uppercase",
  letterSpacing: typography.badge.tracking,
  marginBottom: spacing.sm - 2,
});

export const summaryTextStyle = (colors: ColorPalette): React.CSSProperties => ({
  fontSize: typography.chatBody.size,
  color: colors.text,
  lineHeight: 1.6,
  whiteSpace: "pre-wrap",
});

export function footerStyle(colors: ColorPalette): React.CSSProperties {
  return {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: `${spacing.md + 2}px ${spacing.xl}px`,
    borderTop: `1px solid ${colors.border}`,
    flexShrink: 0,
  };
}

export const footerCountStyle = (colors: ColorPalette): React.CSSProperties => ({
  fontSize: typography.meta.size,
  color: colors.textMuted,
});

export const footerActionsStyle: React.CSSProperties = {
  display: "flex",
  gap: spacing.sm,
};

export const cancelBtnStyle = (colors: ColorPalette): React.CSSProperties => ({
  padding: `${spacing.sm - 1}px ${spacing.lg + 2}px`,
  borderRadius: radius.lg,
  border: `1px solid ${colors.border}`,
  background: "transparent",
  color: colors.textMuted,
  fontSize: typography.chatBody.size,
  cursor: "pointer",
  transition: "border-color 120ms ease, color 120ms ease",
});

export function continueBtnStyle(colors: ColorPalette, enabled: boolean): React.CSSProperties {
  return {
    padding: `${spacing.sm - 1}px ${spacing.xl + 2}px`,
    borderRadius: radius.lg,
    border: "none",
    background: enabled ? colors.accent : colors.border,
    color: enabled ? "#fff" : colors.textMuted,
    fontSize: typography.chatBody.size,
    fontWeight: 700,
    cursor: enabled ? "pointer" : "not-allowed",
    opacity: enabled ? 1 : 0.5,
    transition: "background 120ms ease, opacity 120ms ease",
  };
}
