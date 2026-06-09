import type { ColorPalette } from "../theme/palettes.js";

// ── Panel ───────────────────────────────────────────────────────

export function summaryPanelStyle(colors: ColorPalette): React.CSSProperties {
  return {
    background: colors.surface,
    borderRadius: 16,
    border: `1px solid ${colors.border}`,
    maxWidth: 680,
    width: "100%",
    maxHeight: "75vh",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    boxShadow: "0 8px 32px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.04)",
  };
}

export const summaryScrollBodyStyle: React.CSSProperties = {
  flex: 1,
  overflowY: "auto",
  padding: "20px 20px 0",
};

// ── Header ──────────────────────────────────────────────────────

export const summaryTitleStyle = (colors: ColorPalette): React.CSSProperties => ({
  fontSize: 15,
  fontWeight: 700,
  color: colors.text,
  marginBottom: 4,
});

export const summaryMetaStyle = (colors: ColorPalette): React.CSSProperties => ({
  fontSize: 11,
  color: colors.textMuted,
  marginBottom: 20,
  lineHeight: 1.5,
});

// ── Section ─────────────────────────────────────────────────────

export const sectionHeadingStyle = (colors: ColorPalette): React.CSSProperties => ({
  fontSize: 11,
  fontWeight: 700,
  color: colors.textMuted,
  textTransform: "uppercase",
  letterSpacing: 1,
  marginBottom: 8,
  marginTop: 16,
});

export const sectionListStyle: React.CSSProperties = {
  margin: 0,
  paddingLeft: 16,
  listStyleType: "disc",
};

export const sectionItemStyle = (colors: ColorPalette): React.CSSProperties => ({
  fontSize: 12,
  color: colors.text,
  lineHeight: 1.6,
  marginBottom: 2,
});

export const sectionEmptyStyle = (colors: ColorPalette): React.CSSProperties => ({
  fontSize: 11,
  color: colors.textMuted,
  opacity: 0.5,
  fontStyle: "italic",
  marginBottom: 4,
});

// ── Disagreement ────────────────────────────────────────────────

export const disagreementItemStyle = (colors: ColorPalette): React.CSSProperties => ({
  fontSize: 12,
  color: colors.text,
  lineHeight: 1.6,
  marginBottom: 4,
  paddingLeft: 4,
});

export const disagreementWithStyle = (colors: ColorPalette): React.CSSProperties => ({
  fontSize: 11,
  fontWeight: 600,
  color: colors.accent,
  marginRight: 4,
});

// ── Action item ─────────────────────────────────────────────────

export const actionItemStyle = (colors: ColorPalette): React.CSSProperties => ({
  fontSize: 12,
  color: colors.text,
  lineHeight: 1.6,
  marginBottom: 6,
  display: "flex",
  alignItems: "flex-start",
  gap: 6,
});

export const actionItemBulletStyle = (colors: ColorPalette): React.CSSProperties => ({
  fontSize: 10,
  color: colors.accent,
  flexShrink: 0,
  marginTop: 3,
});

export const actionItemMetaStyle = (colors: ColorPalette): React.CSSProperties => ({
  fontSize: 10,
  color: colors.textMuted,
  marginLeft: 4,
});

// ── Candidate counts ────────────────────────────────────────────

export const countsRowStyle = (colors: ColorPalette): React.CSSProperties => ({
  display: "flex",
  gap: 16,
  marginTop: 16,
  padding: "10px 14px",
  borderRadius: 10,
  background: colors.bg,
  border: `1px solid ${colors.border}`,
});

export const countItemStyle = (colors: ColorPalette): React.CSSProperties => ({
  fontSize: 11,
  color: colors.textMuted,
});

export const countValueStyle = (colors: ColorPalette): React.CSSProperties => ({
  fontWeight: 700,
  color: colors.accent,
});

// ── Footer ──────────────────────────────────────────────────────

export function summaryFooterStyle(colors: ColorPalette): React.CSSProperties {
  return {
    display: "flex",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 8,
    padding: "12px 20px",
    borderTop: `1px solid ${colors.border}`,
    flexShrink: 0,
    flexWrap: "wrap",
  };
}

export function footerBtnStyle(colors: ColorPalette, variant: "default" | "accent" = "default"): React.CSSProperties {
  const base = {
    padding: "6px 14px",
    borderRadius: 16,
    fontSize: 12,
    fontWeight: 600,
    cursor: "pointer",
    border: "none",
    transition: "background 0.15s",
  };
  return variant === "accent"
    ? { ...base, background: colors.accent, color: "#fff" }
    : { ...base, background: "transparent", color: colors.textMuted, border: `1px solid ${colors.border}` };
}
