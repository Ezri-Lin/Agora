import type { ColorPalette } from "../theme/palettes.js";
import { spacing, radius, fontFamilies } from "../theme/tokens.js";

export const createToolStyles = (colors: ColorPalette) => ({
  toolCard: {
    borderRadius: 10,
    border: `1px solid ${colors.border}`,
    background: colors.surface,
    overflow: "hidden",
  } as React.CSSProperties,

  toolHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "0 10px",
    height: 28,
  } as React.CSSProperties,

  toolHeaderLeft: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    minWidth: 0,
    overflow: "hidden",
  } as React.CSSProperties,

  toolHeaderText: {
    fontSize: 12,
    lineHeight: "16px",
    color: colors.textMuted,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  } as React.CSSProperties,

  toolHeaderTextAnimating: {
    fontSize: 12,
    lineHeight: "16px",
    color: colors.textMuted,
  } as React.CSSProperties,

  toolBody: {
    borderTop: `1px solid ${colors.border}`,
    padding: "6px 10px",
    fontFamily: fontFamilies.mono,
    fontSize: 12,
    lineHeight: "16px",
    background: colors.bg,
    overflow: "hidden",
  } as React.CSSProperties,

  toolBodyScrollable: {
    borderTop: `1px solid ${colors.border}`,
    padding: "6px 10px",
    fontFamily: fontFamilies.mono,
    fontSize: 12,
    lineHeight: "16px",
    background: colors.bg,
    maxHeight: 80,
    overflow: "hidden",
  } as React.CSSProperties,

  bashPrompt: {
    color: "#f5c56b",
    userSelect: "none",
  } as React.CSSProperties,

  bashCommand: {
    color: colors.text,
  } as React.CSSProperties,

  bashOutput: {
    marginTop: 4,
    color: colors.textMuted,
    whiteSpace: "pre-line",
    maxHeight: 80,
    overflow: "hidden",
  } as React.CSSProperties,

  spinner: {
    width: 12,
    height: 12,
    color: colors.textMuted,
    flexShrink: 0,
  } as React.CSSProperties,

  expandableContent: {
    maxHeight: 175,
    overflowY: "auto",
  } as React.CSSProperties,

  thoughtContent: {
    fontSize: 13,
    lineHeight: "20px",
    color: colors.textMuted,
    whiteSpace: "pre-wrap",
  } as React.CSSProperties,

  diffContainer: {
    fontFamily: fontFamilies.mono,
    fontSize: 12,
    lineHeight: "16px",
  } as React.CSSProperties,

  diffLine: {
    padding: "1px 8px",
  } as React.CSSProperties,

  diffLineAdd: {
    padding: "1px 8px",
    background: "rgba(34, 197, 94, 0.1)",
    borderLeft: "3px solid rgba(34, 197, 94, 0.5)",
    color: "#15803d",
  } as React.CSSProperties,

  diffLineRemove: {
    padding: "1px 8px",
    background: "rgba(239, 68, 68, 0.1)",
    borderLeft: "3px solid rgba(239, 68, 68, 0.5)",
    color: "#dc2626",
  } as React.CSSProperties,

  approvalFooter: {
    display: "flex",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: spacing.sm,
    padding: `${spacing.xs}px 10px`,
    borderTop: `1px solid ${colors.border}`,
    background: colors.surfaceHover,
  } as React.CSSProperties,

  approvalBtn: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    height: 28,
    padding: "0 12px",
    borderRadius: radius.xs,
    fontSize: 12,
    fontWeight: 500,
    cursor: "pointer",
    border: `1px solid ${colors.border}`,
    background: colors.surface,
    color: colors.text,
    transition: "background 0.15s ease",
  } as React.CSSProperties,

  approvalBtnPrimary: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    height: 28,
    padding: "0 12px",
    borderRadius: radius.xs,
    fontSize: 12,
    fontWeight: 500,
    cursor: "pointer",
    border: "1px solid #6aa9ff",
    background: "#6aa9ff",
    color: "#fff",
    transition: "opacity 0.15s ease",
  } as React.CSSProperties,

  preview: {
    cursor: "pointer",
    color: colors.textMuted,
    fontSize: 13,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  } as React.CSSProperties,

  previewTag: {
    display: "inline-block",
    marginRight: 8,
    padding: "2px 6px",
    borderRadius: 4,
    background: colors.surfaceHover,
    fontSize: 11,
    color: colors.textMuted,
  } as React.CSSProperties,
});
