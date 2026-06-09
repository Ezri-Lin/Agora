import type { ColorPalette } from "../theme/palettes.js";
import {
  agoraDarkColors,
  agoraLightColors,
  blur,
  blurDark,
  layout,
  motion,
  radius,
  shadow,
  shadowDark,
  spacing,
  typography,
  zIndex,
} from "../theme/tokens.js";

function isDark(colors: ColorPalette): boolean {
  return colors.bg === agoraDarkColors.bgApp;
}

export function inspectorPanelStyle(colors: ColorPalette): React.CSSProperties {
  const dark = isDark(colors);
  return {
    position: "absolute",
    top: spacing.lg,
    right: spacing.lg,
    bottom: spacing.lg,
    width: layout.inspector,
    maxWidth: `calc(100% - ${spacing.lg * 2}px)`,
    background: dark ? agoraDarkColors.surfaceFrosted : agoraLightColors.surfaceFrosted,
    border: `1px solid ${dark ? agoraDarkColors.borderSubtle : agoraLightColors.borderSubtle}`,
    borderRadius: radius.lg,
    boxShadow: dark ? shadowDark.floating : shadow.floating,
    backdropFilter: dark ? blurDark.frosted : blur.frosted,
    WebkitBackdropFilter: dark ? blurDark.frosted : blur.frosted,
    zIndex: zIndex.inspector,
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
  };
}

export const scrollAreaStyle: React.CSSProperties = {
  flex: 1,
  overflowY: "auto",
  padding: spacing.md,
};

export function headerStyle(colors: ColorPalette): React.CSSProperties {
  return {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
    padding: `${spacing.md}px ${spacing.lg}px`,
    borderBottom: `1px solid ${colors.border}`,
    flexShrink: 0,
  };
}

export const headerActionsStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: spacing.xs,
};

export function headerTitleStyle(colors: ColorPalette): React.CSSProperties {
  return {
    color: colors.text,
    fontSize: typography.meta.size,
    fontWeight: 700,
    lineHeight: typography.meta.lineHeight,
  };
}

export function iconButtonStyle(colors: ColorPalette): React.CSSProperties {
  return {
    minWidth: 26,
    height: 26,
    borderRadius: radius.xs,
    border: `1px solid ${colors.border}`,
    background: colors.surface,
    color: colors.textMuted,
    cursor: "pointer",
    fontSize: typography.meta.size,
    transition: `background ${motion.fast}, color ${motion.fast}, border-color ${motion.fast}`,
  };
}

export function sectionStyle(colors: ColorPalette): React.CSSProperties {
  return {
    border: `1px solid ${colors.border}`,
    borderRadius: radius.md,
    background: colors.surface,
    marginBottom: spacing.sm,
    overflow: "hidden",
  };
}

export function sectionHeaderStyle(colors: ColorPalette): React.CSSProperties {
  return {
    padding: `${spacing.sm}px ${spacing.md}px`,
    borderBottom: `1px solid ${colors.border}`,
    color: colors.textMuted,
    fontSize: typography.sectionTitle.size,
    fontWeight: typography.sectionTitle.weight,
    lineHeight: typography.sectionTitle.lineHeight,
    letterSpacing: typography.sectionTitle.tracking,
    textTransform: "uppercase",
  };
}

export const sectionBodyStyle: React.CSSProperties = {
  padding: spacing.md,
};

export function mutedTextStyle(colors: ColorPalette): React.CSSProperties {
  return {
    color: colors.textMuted,
    fontSize: typography.meta.size,
    lineHeight: typography.meta.lineHeight,
  };
}

export function itemRowStyle(colors: ColorPalette): React.CSSProperties {
  return {
    display: "flex",
    alignItems: "center",
    gap: spacing.sm,
    padding: `${spacing.xs}px 0`,
    color: colors.text,
    fontSize: typography.meta.size,
    lineHeight: typography.meta.lineHeight,
  };
}

export function actionButtonStyle(colors: ColorPalette, variant: "default" | "accent" = "default"): React.CSSProperties {
  return {
    marginTop: spacing.sm,
    borderRadius: radius.sm,
    border: `1px solid ${variant === "accent" ? colors.accent : colors.border}`,
    background: variant === "accent" ? colors.accent : "transparent",
    color: variant === "accent" ? "#fff" : colors.text,
    padding: `${spacing.xs + 1}px ${spacing.md}px`,
    fontSize: typography.meta.size,
    fontWeight: 700,
    cursor: "pointer",
  };
}

export function statGridStyle(colors: ColorPalette): React.CSSProperties {
  return {
    display: "grid",
    gridTemplateColumns: "1fr auto",
    gap: `${spacing.xs}px ${spacing.md}px`,
    color: colors.text,
    fontSize: typography.meta.size,
    lineHeight: typography.meta.lineHeight,
  };
}
