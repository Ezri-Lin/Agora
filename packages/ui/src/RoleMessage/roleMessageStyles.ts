import type { ColorPalette } from "../theme/palettes.js";
import { motion, radius, spacing, typography } from "../theme/tokens.js";

export function createRoleMessageStyles(colors: ColorPalette) {
  return {
    row: {
      display: "flex",
      gap: spacing.md,
      padding: `${spacing.sm}px 0`,
      alignItems: "flex-start",
    } satisfies React.CSSProperties,
    content: {
      flex: 1,
      minWidth: 0,
      maxWidth: 760,
    } satisfies React.CSSProperties,
    header: {
      display: "flex",
      alignItems: "baseline",
      gap: spacing.sm,
      marginBottom: spacing.xs,
    } satisfies React.CSSProperties,
    name: {
      fontSize: typography.meta.size,
      fontWeight: 700,
      lineHeight: typography.meta.lineHeight,
    } satisfies React.CSSProperties,
    subtitle: {
      fontSize: typography.badge.size,
      color: colors.textMuted,
      lineHeight: typography.badge.lineHeight,
    } satisfies React.CSSProperties,
    timestamp: {
      fontSize: typography.badge.size,
      color: colors.textMuted,
      lineHeight: typography.badge.lineHeight,
    } satisfies React.CSSProperties,
    preview: {
      fontSize: typography.meta.size,
      color: colors.textMuted,
      lineHeight: 1.5,
      padding: `${spacing.sm}px ${spacing.md}px`,
      cursor: "pointer",
      background: colors.surface,
      borderRadius: `0 ${radius.sm}px ${radius.sm}px ${radius.sm}px`,
      border: `1px solid ${colors.border}`,
      display: "-webkit-box",
      WebkitLineClamp: 4,
      WebkitBoxOrient: "vertical",
      overflow: "hidden",
      position: "relative",
    } satisfies React.CSSProperties,
    summaryBadge: {
      fontSize: typography.badge.size,
      color: colors.accent,
      textTransform: "uppercase",
      letterSpacing: typography.badge.tracking,
      fontWeight: typography.badge.weight,
      marginBottom: spacing.xs,
      display: "block",
    } satisfies React.CSSProperties,
    expandIndicator: {
      position: "absolute",
      bottom: spacing.xs,
      right: spacing.sm,
      fontSize: typography.badge.size,
      color: colors.textMuted,
      opacity: 0.65,
    } satisfies React.CSSProperties,
    bubbleWrapper: {
      cursor: "pointer",
      position: "relative",
    } satisfies React.CSSProperties,
    bubble: {
      background: colors.surface,
      borderRadius: `0 ${radius.sm}px ${radius.sm}px ${radius.sm}px`,
      padding: `${spacing.sm}px ${spacing.md}px`,
      fontSize: typography.chatBody.size,
      lineHeight: typography.chatBody.lineHeight,
      color: colors.text,
      border: `1px solid ${colors.border}`,
      borderLeft: "2px solid",
      whiteSpace: "pre-wrap",
      wordBreak: "break-word",
    } satisfies React.CSSProperties,
    userBubble: {
      background: colors.surfaceHover,
      borderRadius: `${radius.sm}px 0 ${radius.sm}px ${radius.sm}px`,
      borderLeft: `1px solid ${colors.border}`,
      borderRight: `2px solid ${colors.accent}`,
    } satisfies React.CSSProperties,
    collapseHint: {
      textAlign: "center",
      fontSize: typography.badge.size,
      color: colors.textMuted,
      opacity: 0.55,
      marginTop: spacing.xs,
      cursor: "pointer",
      userSelect: "none",
    } satisfies React.CSSProperties,
    actionRow: {
      display: "flex",
      justifyContent: "flex-end",
      marginTop: spacing.sm,
      paddingTop: spacing.xs,
      borderTop: `1px solid ${colors.border}`,
    } satisfies React.CSSProperties,
    errorRow: {
      display: "flex",
      gap: spacing.sm,
      padding: `${spacing.sm}px 0`,
      alignItems: "flex-start",
    } satisfies React.CSSProperties,
    errorContent: {
      flex: 1,
      background: colors.dangerBg,
      border: `1px solid ${colors.dangerBorder}`,
      borderRadius: `0 ${radius.sm}px ${radius.sm}px ${radius.sm}px`,
      padding: `${spacing.sm}px ${spacing.md}px`,
    } satisfies React.CSSProperties,
    errorTitle: {
      fontSize: typography.meta.size,
      fontWeight: 700,
      color: colors.danger,
      marginBottom: spacing.xs,
    } satisfies React.CSSProperties,
    errorBody: {
      fontSize: typography.meta.size,
      color: colors.danger,
      lineHeight: typography.meta.lineHeight,
    } satisfies React.CSSProperties,
    detailButton: {
      border: "none",
      background: "transparent",
      color: colors.textMuted,
      cursor: "pointer",
      fontSize: typography.badge.size,
      fontWeight: 700,
      padding: 0,
      transition: `color ${motion.fast}`,
    } satisfies React.CSSProperties,
  };
}

export function avatarStyle(colors: ColorPalette, accent: string, active = false): React.CSSProperties {
  return {
    width: 32,
    height: 32,
    borderRadius: radius.pill,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: colors.text,
    background: colors.surface,
    border: `2px solid ${accent}`,
    boxShadow: active ? `0 0 0 4px ${accent}1f` : "none",
    fontWeight: 700,
    fontSize: typography.meta.size,
    flexShrink: 0,
  };
}

export function processPanelStyle(colors: ColorPalette): React.CSSProperties {
  return {
    marginBottom: spacing.sm,
    padding: spacing.sm,
    borderRadius: radius.sm,
    border: `1px solid ${colors.border}`,
    background: colors.surfaceHover,
  };
}

export function processTitleStyle(colors: ColorPalette): React.CSSProperties {
  return {
    fontSize: typography.badge.size,
    fontWeight: typography.badge.weight,
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: typography.badge.tracking,
    marginBottom: spacing.xs,
  };
}

export function processRowStyle(colors: ColorPalette): React.CSSProperties {
  return {
    display: "flex",
    alignItems: "center",
    gap: spacing.sm,
    color: colors.text,
    fontSize: typography.meta.size,
    lineHeight: typography.meta.lineHeight,
    padding: `${spacing.xs}px 0`,
  };
}

export function processDotStyle(colors: ColorPalette): React.CSSProperties {
  return {
    width: 7,
    height: 7,
    borderRadius: radius.pill,
    background: colors.accent,
    flexShrink: 0,
  };
}

export function rawThinkingStyle(colors: ColorPalette): React.CSSProperties {
  return {
    marginTop: spacing.sm,
    padding: `${spacing.sm}px ${spacing.md}px`,
    color: colors.textMuted,
    background: colors.surface,
    borderLeft: `2px solid ${colors.accentDim}`,
    borderRadius: `0 ${radius.xs}px ${radius.xs}px 0`,
    maxHeight: 220,
    overflowY: "auto",
  };
}
