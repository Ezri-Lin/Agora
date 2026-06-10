import type { ColorPalette } from "../../theme/palettes.js";
import { radius, shadow, spacing, typography } from "../../theme/tokens.js";

export function bioPanelStyle(colors: ColorPalette): React.CSSProperties {
  return {
    padding: `${spacing.md + 2}px ${spacing.lg}px`,
    borderRadius: radius.md,
    background: colors.surface,
    border: `1px solid ${colors.border}`,
    marginBottom: spacing.lg,
    boxShadow: shadow.card,
  };
}

export const bioHeaderStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "flex-start",
  gap: spacing.md,
  marginBottom: spacing.md,
};

export const bioAvatarLgStyle = (gradient: string): React.CSSProperties => ({
  width: 44,
  height: 44,
  borderRadius: radius.pill,
  background: gradient,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
  fontSize: typography.heroTitle.size - 4,
  color: "rgba(255,255,255,0.9)",
  boxShadow: shadow.soft,
});

export const bioNameStyle = (colors: ColorPalette): React.CSSProperties => ({
  fontSize: typography.chatBody.size,
  fontWeight: 700,
  color: colors.text,
});

export const bioSubtitleStyle = (colors: ColorPalette): React.CSSProperties => ({
  fontSize: typography.meta.size,
  color: colors.textMuted,
  marginTop: spacing.xxs,
});

export const bioMetaRowStyle = (colors: ColorPalette): React.CSSProperties => ({
  display: "flex",
  gap: spacing.sm,
  marginTop: spacing.xs,
  fontSize: typography.badge.size,
  color: colors.accent,
});

export const bioSectionLabelStyle = (colors: ColorPalette): React.CSSProperties => ({
  fontSize: typography.badge.size,
  fontWeight: 700,
  color: colors.textMuted,
  textTransform: "uppercase",
  letterSpacing: typography.badge.tracking,
  marginBottom: spacing.xs,
});

export const bioSectionListStyle = (colors: ColorPalette): React.CSSProperties => ({
  margin: 0,
  paddingLeft: spacing.lg,
  fontSize: typography.meta.size,
  color: colors.text,
  lineHeight: 1.6,
});

export const bioReasonStyle = (colors: ColorPalette): React.CSSProperties => ({
  fontSize: typography.meta.size,
  color: colors.text,
  lineHeight: 1.5,
  marginBottom: spacing.md,
  padding: `${spacing.sm}px ${spacing.md - 2}px`,
  borderRadius: radius.sm,
  background: colors.accentDim + "10",
  border: `1px solid ${colors.accentDim}20`,
});

export const bioCloseBtnStyle = (colors: ColorPalette): React.CSSProperties => ({
  width: 24,
  height: 24,
  borderRadius: radius.pill,
  border: "none",
  background: "transparent",
  color: colors.textMuted,
  fontSize: typography.chatBody.size,
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
});

export const bioBodyTextStyle = (colors: ColorPalette): React.CSSProperties => ({
  fontSize: typography.meta.size,
  color: colors.text,
  lineHeight: 1.6,
  marginBottom: spacing.md,
});

export const bioSectionStyle: React.CSSProperties = {
  marginBottom: spacing.sm + 2,
};

export const bioEmptyStyle = (colors: ColorPalette): React.CSSProperties => ({
  fontSize: typography.meta.size,
  color: colors.textMuted,
  opacity: 0.6,
});
