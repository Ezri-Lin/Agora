import type { ColorPalette } from "../../theme/palettes.js";
import { getRoleColor } from "../../theme/palettes.js";
import { radius, shadow, spacing, typography } from "../../theme/tokens.js";

export function capsuleCardStyle(
  colors: ColorPalette,
  roleId: string,
  selected: boolean,
): React.CSSProperties {
  const roleColor = getRoleColor(roleId);
  return {
    display: "flex",
    alignItems: "center",
    gap: spacing.sm + 2,
    padding: `${spacing.sm + 2}px ${spacing.md + 2}px`,
    borderRadius: radius.lg,
    border: `2px solid ${selected ? roleColor : colors.border}`,
    background: selected ? `${roleColor}20` : colors.bg,
    cursor: "pointer",
    transition: "border-color 120ms ease, background 120ms ease, box-shadow 120ms ease",
    minHeight: 56,
    textAlign: "left",
    boxShadow: selected ? `0 0 12px ${roleColor}30` : "none",
  };
}

export const dotStyle = (color: string): React.CSSProperties => ({
  width: 10,
  height: 10,
  borderRadius: radius.pill,
  background: color,
  flexShrink: 0,
  boxShadow: `0 0 6px ${color}60`,
});

export const nameStyle = (colors: ColorPalette): React.CSSProperties => ({
  fontSize: typography.chatBody.size,
  fontWeight: 700,
  color: colors.text,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
});

export const subtitleStyle = (colors: ColorPalette): React.CSSProperties => ({
  fontSize: typography.meta.size,
  color: colors.textMuted,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
});

export const checkStyle = (color: string): React.CSSProperties => ({
  width: 18,
  height: 18,
  borderRadius: radius.pill,
  background: color,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
  marginLeft: "auto",
  fontSize: typography.meta.size,
  fontWeight: 700,
  color: "#fff",
});

export const tagsRowStyle: React.CSSProperties = {
  display: "flex",
  gap: spacing.xs,
  flexWrap: "wrap",
  marginTop: spacing.xxs,
};

export const tagStyle = (colors: ColorPalette): React.CSSProperties => ({
  fontSize: typography.badge.size,
  padding: `1px ${spacing.sm - 2}px`,
  borderRadius: radius.legacyXs,
  background: colors.border,
  color: colors.textMuted,
});

export const avatarStyle = (gradient: string): React.CSSProperties => ({
  width: 36,
  height: 36,
  borderRadius: radius.pill,
  background: gradient,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
  fontSize: typography.heading.size,
  color: "rgba(255,255,255,0.9)",
  boxShadow: shadow.soft,
});

export const domainBadgeStyle = (colors: ColorPalette): React.CSSProperties => ({
  fontSize: typography.badge.size,
  fontWeight: 700,
  padding: `1px ${spacing.xs + 1}px`,
  borderRadius: radius.legacyXs,
  background: colors.accentDim + "20",
  color: colors.accent,
  letterSpacing: typography.badge.tracking,
  textTransform: "uppercase",
});

export const reasonStyle = (colors: ColorPalette): React.CSSProperties => ({
  fontSize: typography.badge.size,
  color: colors.textMuted,
  lineHeight: 1.4,
  marginTop: spacing.xxs,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
  opacity: 0.8,
});

export const infoBtnStyle = (colors: ColorPalette): React.CSSProperties => ({
  width: 20,
  height: 20,
  borderRadius: radius.pill,
  border: `1px solid ${colors.border}`,
  background: "transparent",
  color: colors.textMuted,
  fontSize: typography.meta.size,
  fontWeight: 700,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
  flexShrink: 0,
  transition: "border-color 120ms ease, color 120ms ease",
});
