import type { ColorPalette } from "../theme/palettes.js";
import { getRoleColor } from "../theme/palettes.js";

// ── Overlay ──────────────────────────────────────────────────────

export const overlayStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 1000,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 24,
  background:
    "radial-gradient(circle at 30% 20%, rgba(255,255,255,0.06), transparent 28%), radial-gradient(circle at 70% 80%, rgba(120,140,255,0.07), transparent 32%), rgba(6,8,14,0.72)",
  backdropFilter: "blur(18px)",
  WebkitBackdropFilter: "blur(18px)",
};

// ── Panel ────────────────────────────────────────────────────────

export function panelStyle(opts: { surface: string; border: string }): React.CSSProperties {
  return {
    background: opts.surface,
    borderRadius: 28,
    border: `1px solid ${opts.border}`,
    maxWidth: 820,
    width: "100%",
    maxHeight: "80vh",
    display: "flex",
    flexDirection: "column",
    boxShadow: "0 12px 48px rgba(0,0,0,0.45), 0 0 0 1px rgba(255,255,255,0.04)",
    overflow: "hidden",
  };
}

// ── Scrollable body ──────────────────────────────────────────────

export const scrollBodyStyle: React.CSSProperties = {
  flex: 1,
  overflowY: "auto",
  padding: "24px 24px 0",
};

// ── Section ──────────────────────────────────────────────────────

export function sectionTitleStyle(colors: ColorPalette): React.CSSProperties {
  return {
    fontSize: 11,
    fontWeight: 700,
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 10,
  };
}

export const gridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
  gap: 10,
  marginBottom: 20,
};

// ── Search box ───────────────────────────────────────────────────

export function searchBoxStyle(colors: ColorPalette): React.CSSProperties {
  return {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "8px 14px",
    borderRadius: 12,
    border: `1px solid ${colors.border}`,
    background: colors.bg,
    marginBottom: 16,
  };
}

export const searchIconStyle = (colors: ColorPalette): React.CSSProperties => ({
  fontSize: 13,
  opacity: 0.5,
  flexShrink: 0,
});

export const searchInputStyle = (colors: ColorPalette): React.CSSProperties => ({
  flex: 1,
  border: "none",
  outline: "none",
  background: "transparent",
  color: colors.text,
  fontSize: 13,
  lineHeight: "20px",
});

export const emptySearchStyle = (colors: ColorPalette): React.CSSProperties => ({
  fontSize: 12,
  color: colors.textMuted,
  textAlign: "center",
  padding: "20px 0",
  opacity: 0.6,
});

// ── Role capsule card ────────────────────────────────────────────

export function capsuleCardStyle(
  colors: ColorPalette,
  roleId: string,
  selected: boolean,
): React.CSSProperties {
  const roleColor = getRoleColor(roleId);
  return {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "10px 14px",
    borderRadius: 24,
    border: `2px solid ${selected ? roleColor : colors.border}`,
    background: selected ? `${roleColor}20` : colors.bg,
    cursor: "pointer",
    transition: "border-color 0.15s, background 0.15s, box-shadow 0.15s",
    minHeight: 56,
    textAlign: "left" as const,
    boxShadow: selected ? `0 0 12px ${roleColor}30` : "none",
  };
}

export const dotStyle = (color: string): React.CSSProperties => ({
  width: 10,
  height: 10,
  borderRadius: "50%",
  background: color,
  flexShrink: 0,
  boxShadow: `0 0 6px ${color}60`,
});

export const nameStyle = (colors: ColorPalette): React.CSSProperties => ({
  fontSize: 13,
  fontWeight: 600,
  color: colors.text,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
});

export const subtitleStyle = (colors: ColorPalette): React.CSSProperties => ({
  fontSize: 11,
  color: colors.textMuted,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
});

export const checkStyle = (color: string): React.CSSProperties => ({
  width: 18,
  height: 18,
  borderRadius: "50%",
  background: color,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
  marginLeft: "auto",
  fontSize: 11,
  fontWeight: 700,
  color: "#fff",
});

export const tagsRowStyle: React.CSSProperties = {
  display: "flex",
  gap: 4,
  flexWrap: "wrap",
  marginTop: 2,
};

export const tagStyle = (colors: ColorPalette): React.CSSProperties => ({
  fontSize: 10,
  padding: "1px 6px",
  borderRadius: 4,
  background: colors.border,
  color: colors.textMuted,
});

// ── Avatar ───────────────────────────────────────────────────────

export const avatarStyle = (gradient: string): React.CSSProperties => ({
  width: 36,
  height: 36,
  borderRadius: "50%",
  background: gradient,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
  fontSize: 16,
  color: "rgba(255,255,255,0.9)",
  boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
});

// ── Domain badge ─────────────────────────────────────────────────

export const domainBadgeStyle = (colors: ColorPalette): React.CSSProperties => ({
  fontSize: 9,
  fontWeight: 600,
  padding: "1px 5px",
  borderRadius: 3,
  background: colors.accentDim + "20",
  color: colors.accent,
  letterSpacing: 0.5,
  textTransform: "uppercase",
});

// ── Reason line ──────────────────────────────────────────────────

export const reasonStyle = (colors: ColorPalette): React.CSSProperties => ({
  fontSize: 10,
  color: colors.textMuted,
  lineHeight: 1.4,
  marginTop: 2,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
  opacity: 0.8,
});

// ── Info button ──────────────────────────────────────────────────

export const infoBtnStyle = (colors: ColorPalette): React.CSSProperties => ({
  width: 20,
  height: 20,
  borderRadius: "50%",
  border: `1px solid ${colors.border}`,
  background: "transparent",
  color: colors.textMuted,
  fontSize: 11,
  fontWeight: 700,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
  flexShrink: 0,
  transition: "border-color 0.15s, color 0.15s",
});

// ── Bio panel ────────────────────────────────────────────────────

export function bioPanelStyle(colors: ColorPalette): React.CSSProperties {
  return {
    padding: "14px 16px",
    borderRadius: 14,
    background: colors.surface,
    border: `1px solid ${colors.border}`,
    marginBottom: 16,
  };
}

export const bioHeaderStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "flex-start",
  gap: 12,
  marginBottom: 12,
};

export const bioAvatarLgStyle = (gradient: string): React.CSSProperties => ({
  width: 44,
  height: 44,
  borderRadius: "50%",
  background: gradient,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
  fontSize: 20,
  color: "rgba(255,255,255,0.9)",
  boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
});

export const bioNameStyle = (colors: ColorPalette): React.CSSProperties => ({
  fontSize: 14,
  fontWeight: 700,
  color: colors.text,
});

export const bioSubtitleStyle = (colors: ColorPalette): React.CSSProperties => ({
  fontSize: 11,
  color: colors.textMuted,
  marginTop: 2,
});

export const bioMetaRowStyle = (colors: ColorPalette): React.CSSProperties => ({
  display: "flex",
  gap: 8,
  marginTop: 4,
  fontSize: 10,
  color: colors.accent,
});

export const bioSectionLabelStyle = (colors: ColorPalette): React.CSSProperties => ({
  fontSize: 10,
  fontWeight: 700,
  color: colors.textMuted,
  textTransform: "uppercase",
  letterSpacing: 0.5,
  marginBottom: 4,
});

export const bioSectionListStyle = (colors: ColorPalette): React.CSSProperties => ({
  margin: 0,
  paddingLeft: 16,
  fontSize: 12,
  color: colors.text,
  lineHeight: 1.6,
});

export const bioReasonStyle = (colors: ColorPalette): React.CSSProperties => ({
  fontSize: 12,
  color: colors.text,
  lineHeight: 1.5,
  marginBottom: 12,
  padding: "8px 10px",
  borderRadius: 8,
  background: colors.accentDim + "10",
  border: `1px solid ${colors.accentDim}20`,
});

export const bioCloseBtnStyle = (colors: ColorPalette): React.CSSProperties => ({
  width: 24,
  height: 24,
  borderRadius: "50%",
  border: "none",
  background: "transparent",
  color: colors.textMuted,
  fontSize: 14,
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
});

// ── Moderator summary ────────────────────────────────────────────

export function summaryContainerStyle(colors: ColorPalette): React.CSSProperties {
  return {
    padding: "14px 18px",
    borderRadius: 16,
    background: colors.bg,
    border: `1px solid ${colors.border}`,
    marginBottom: 20,
  };
}

export const summaryLabelStyle = (colors: ColorPalette): React.CSSProperties => ({
  fontSize: 10,
  fontWeight: 700,
  color: colors.textMuted,
  textTransform: "uppercase",
  letterSpacing: 1,
  marginBottom: 6,
});

export const summaryTextStyle = (colors: ColorPalette): React.CSSProperties => ({
  fontSize: 13,
  color: colors.text,
  lineHeight: 1.6,
  whiteSpace: "pre-wrap",
});

// ── Footer ───────────────────────────────────────────────────────

export function footerStyle(colors: ColorPalette): React.CSSProperties {
  return {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "14px 24px",
    borderTop: `1px solid ${colors.border}`,
    flexShrink: 0,
  };
}

export const footerCountStyle = (colors: ColorPalette): React.CSSProperties => ({
  fontSize: 12,
  color: colors.textMuted,
});

export const footerActionsStyle: React.CSSProperties = {
  display: "flex",
  gap: 8,
};

export const cancelBtnStyle = (colors: ColorPalette): React.CSSProperties => ({
  padding: "7px 18px",
  borderRadius: 20,
  border: `1px solid ${colors.border}`,
  background: "transparent",
  color: colors.textMuted,
  fontSize: 13,
  cursor: "pointer",
  transition: "border-color 0.15s, color 0.15s",
});

export function continueBtnStyle(colors: ColorPalette, enabled: boolean): React.CSSProperties {
  return {
    padding: "7px 22px",
    borderRadius: 20,
    border: "none",
    background: enabled ? colors.accent : colors.border,
    color: enabled ? "#fff" : colors.textMuted,
    fontSize: 13,
    fontWeight: 600,
    cursor: enabled ? "pointer" : "not-allowed",
    opacity: enabled ? 1 : 0.5,
    transition: "background 0.15s, opacity 0.15s",
  };
}
