import type { ColorPalette } from "../theme/palettes.js";
import type { MemoryCandidateScope } from "./types.js";

// ── Scope badge ─────────────────────────────────────────────────

const SCOPE_CONFIG: Record<MemoryCandidateScope, { label: string; bg: string; text: string; border: string }> = {
  global:            { label: "全局",   bg: "rgba(136,146,164,0.12)", text: "#8892a4", border: "rgba(136,146,164,0.3)" },
  domain:            { label: "领域",   bg: "rgba(63,81,181,0.12)",  text: "#3f51b5", border: "rgba(63,81,181,0.3)" },
  project:           { label: "项目",   bg: "rgba(33,150,243,0.12)", text: "#2196f3", border: "rgba(33,150,243,0.3)" },
  shared_experience: { label: "共同经历", bg: "rgba(39,174,96,0.12)",  text: "#27ae60", border: "rgba(39,174,96,0.3)" },
  role_usage:        { label: "角色使用", bg: "rgba(156,39,176,0.12)", text: "#9c27b0", border: "rgba(156,39,176,0.3)" },
  decision:          { label: "决策",   bg: "rgba(255,152,0,0.12)",  text: "#ff9800", border: "rgba(255,152,0,0.3)" },
};

export function scopeBadgeStyle(scope: MemoryCandidateScope): React.CSSProperties {
  const c = SCOPE_CONFIG[scope] ?? SCOPE_CONFIG.global;
  return {
    display: "inline-flex",
    alignItems: "center",
    padding: "2px 8px",
    borderRadius: 10,
    fontSize: 10,
    fontWeight: 600,
    background: c.bg,
    color: c.text,
    border: `1px solid ${c.border}`,
    letterSpacing: 0.3,
    flexShrink: 0,
  };
}

export function getScopeLabel(scope: MemoryCandidateScope): string {
  return (SCOPE_CONFIG[scope] ?? SCOPE_CONFIG.global).label;
}

// ── Panel ───────────────────────────────────────────────────────

export function reviewPanelStyle(colors: ColorPalette): React.CSSProperties {
  return {
    background: colors.surface,
    borderRadius: 16,
    border: `1px solid ${colors.border}`,
    maxWidth: 620,
    width: "100%",
    maxHeight: "70vh",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    boxShadow: "0 8px 32px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.04)",
  };
}

export const reviewScrollBodyStyle: React.CSSProperties = {
  flex: 1,
  overflowY: "auto",
  padding: "20px 20px 0",
};

export const reviewTitleStyle = (colors: ColorPalette): React.CSSProperties => ({
  fontSize: 15,
  fontWeight: 700,
  color: colors.text,
  marginBottom: 4,
});

export const reviewSubtitleStyle = (colors: ColorPalette): React.CSSProperties => ({
  fontSize: 11,
  color: colors.textMuted,
  marginBottom: 16,
});

// ── Candidate card ──────────────────────────────────────────────

export function candidateCardStyle(colors: ColorPalette, selected: boolean): React.CSSProperties {
  return {
    display: "flex",
    alignItems: "flex-start",
    gap: 10,
    padding: "12px 14px",
    borderRadius: 12,
    border: `1px solid ${selected ? colors.accent + "60" : colors.border}`,
    background: selected ? colors.accent + "08" : colors.bg,
    marginBottom: 10,
    cursor: "pointer",
    transition: "border-color 0.15s, background 0.15s",
  };
}

export const checkboxStyle = (colors: ColorPalette, selected: boolean): React.CSSProperties => ({
  width: 18,
  height: 18,
  borderRadius: 4,
  border: `2px solid ${selected ? colors.accent : colors.border}`,
  background: selected ? colors.accent : "transparent",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
  marginTop: 2,
  fontSize: 11,
  fontWeight: 700,
  color: "#fff",
  transition: "background 0.15s, border-color 0.15s",
});

export const candidateBodyStyle: React.CSSProperties = {
  flex: 1,
  minWidth: 0,
};

export const candidateTextStyle = (colors: ColorPalette): React.CSSProperties => ({
  fontSize: 13,
  color: colors.text,
  lineHeight: 1.5,
  marginBottom: 4,
});

export const candidateReasonStyle = (colors: ColorPalette): React.CSSProperties => ({
  fontSize: 11,
  color: colors.textMuted,
  lineHeight: 1.4,
  marginBottom: 4,
});

export const tagsRowStyle: React.CSSProperties = {
  display: "flex",
  gap: 4,
  flexWrap: "wrap",
};

export const tagStyle = (colors: ColorPalette): React.CSSProperties => ({
  fontSize: 10,
  padding: "1px 6px",
  borderRadius: 4,
  background: colors.border,
  color: colors.textMuted,
});

// ── Footer ──────────────────────────────────────────────────────

export function reviewFooterStyle(colors: ColorPalette): React.CSSProperties {
  return {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "12px 20px",
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

export function reviewBtnStyle(colors: ColorPalette, variant: "default" | "accent" = "default"): React.CSSProperties {
  const base = {
    padding: "6px 16px",
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

export function reviewBtnDisabledStyle(colors: ColorPalette): React.CSSProperties {
  return {
    padding: "6px 16px",
    borderRadius: 16,
    fontSize: 12,
    fontWeight: 600,
    cursor: "not-allowed",
    border: "none",
    background: colors.border,
    color: colors.textMuted,
    opacity: 0.5,
  };
}

export const emptyStyle = (colors: ColorPalette): React.CSSProperties => ({
  textAlign: "center",
  padding: "32px 0",
  fontSize: 12,
  color: colors.textMuted,
  opacity: 0.6,
});
