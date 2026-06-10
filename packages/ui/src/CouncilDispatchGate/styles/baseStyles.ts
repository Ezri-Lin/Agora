import type { ColorPalette } from "../../theme/palettes.js";
import { blur, radius, shadow, spacing, typography, zIndex } from "../../theme/tokens.js";

export function overlayStyle(colors: ColorPalette): React.CSSProperties {
  return {
    position: "fixed",
    inset: 0,
    zIndex: zIndex.modal,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xxl,
    background: colors.overlay,
    backdropFilter: blur.frosted,
    WebkitBackdropFilter: blur.frosted,
  };
}

export function panelStyle(colors: ColorPalette): React.CSSProperties {
  return {
    background: colors.surface,
    borderRadius: radius.lg,
    border: `1px solid ${colors.border}`,
    maxWidth: 820,
    width: "100%",
    maxHeight: "80vh",
    display: "flex",
    flexDirection: "column",
    boxShadow: shadow.floating,
    overflow: "hidden",
  };
}

export const scrollBodyStyle: React.CSSProperties = {
  flex: 1,
  overflowY: "auto",
  padding: `${spacing.xl}px ${spacing.xl}px 0`,
};

export function sectionTitleStyle(colors: ColorPalette): React.CSSProperties {
  return {
    fontSize: typography.sectionTitle.size,
    fontWeight: typography.sectionTitle.weight,
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: typography.sectionTitle.tracking,
    marginBottom: spacing.sm + 2,
  };
}

export const gridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
  gap: spacing.sm + 2,
  marginBottom: spacing.xl,
};

export function searchBoxStyle(colors: ColorPalette): React.CSSProperties {
  return {
    display: "flex",
    alignItems: "center",
    gap: spacing.sm,
    padding: `${spacing.sm}px ${spacing.md + 2}px`,
    borderRadius: radius.md,
    border: `1px solid ${colors.border}`,
    background: colors.bg,
    marginBottom: spacing.lg,
  };
}

export const searchIconStyle = (_colors: ColorPalette): React.CSSProperties => ({
  fontSize: typography.chatBody.size,
  opacity: 0.5,
  flexShrink: 0,
});

export const searchInputStyle = (colors: ColorPalette): React.CSSProperties => ({
  flex: 1,
  border: "none",
  outline: "none",
  background: "transparent",
  color: colors.text,
  fontSize: typography.chatBody.size,
  lineHeight: "20px",
});

export const emptySearchStyle = (colors: ColorPalette): React.CSSProperties => ({
  fontSize: typography.meta.size,
  color: colors.textMuted,
  textAlign: "center",
  padding: `${spacing.xl}px 0`,
  opacity: 0.6,
});
