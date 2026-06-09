import type { ColorPalette } from "../theme/palettes.js";

// ── Risk badge ──────────────────────────────────────────────────

const RISK_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  low: { bg: "rgba(39,174,96,0.12)", text: "#27ae60", border: "rgba(39,174,96,0.3)" },
  medium: { bg: "rgba(230,126,34,0.12)", text: "#e67e22", border: "rgba(230,126,34,0.3)" },
  high: { bg: "rgba(231,76,60,0.12)", text: "#e74c3c", border: "rgba(231,76,60,0.3)" },
};

const RISK_LABELS: Record<string, string> = {
  low: "低风险",
  medium: "中风险",
  high: "高风险",
};

export function riskBadgeStyle(riskLevel: string): React.CSSProperties {
  const c = RISK_COLORS[riskLevel] ?? RISK_COLORS.low;
  return {
    display: "inline-flex",
    alignItems: "center",
    gap: 4,
    padding: "2px 8px",
    borderRadius: 10,
    fontSize: 10,
    fontWeight: 600,
    background: c.bg,
    color: c.text,
    border: `1px solid ${c.border}`,
    letterSpacing: 0.3,
  };
}

export function getRiskLabel(riskLevel: string): string {
  return RISK_LABELS[riskLevel] ?? riskLevel;
}

// ── Mode labels ─────────────────────────────────────────────────

const MODE_LABELS: Record<string, string> = {
  create_document: "新建文档",
  append_section: "追加章节",
  update_section: "更新章节",
  replace_section: "替换章节",
  insert_after: "插入内容",
  delete_section: "删除章节",
  rename_heading: "重命名标题",
  rewrite_document: "重写文档",
};

export function getModeLabel(mode: string): string {
  return MODE_LABELS[mode] ?? mode;
}

// ── Panel ───────────────────────────────────────────────────────

export function proposalPanelStyle(colors: ColorPalette): React.CSSProperties {
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

export const proposalScrollBodyStyle: React.CSSProperties = {
  flex: 1,
  overflowY: "auto",
  padding: "20px 20px 0",
};

export function proposalHeaderStyle(colors: ColorPalette): React.CSSProperties {
  return {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  };
}

export const proposalTitleStyle = (colors: ColorPalette): React.CSSProperties => ({
  fontSize: 15,
  fontWeight: 700,
  color: colors.text,
});

export const proposalSubtitleStyle = (colors: ColorPalette): React.CSSProperties => ({
  fontSize: 11,
  color: colors.textMuted,
  marginTop: 2,
});

// ── Candidate card ──────────────────────────────────────────────

export function candidateCardStyle(colors: ColorPalette, riskLevel: string): React.CSSProperties {
  const riskColor =
    riskLevel === "high" ? "#e74c3c" :
    riskLevel === "medium" ? "#e67e22" : colors.border;
  return {
    padding: "14px 16px",
    borderRadius: 12,
    border: `1px solid ${riskColor}40`,
    background: colors.bg,
    marginBottom: 12,
    transition: "border-color 0.15s",
  };
}

export const candidatePathStyle = (colors: ColorPalette): React.CSSProperties => ({
  fontSize: 12,
  fontWeight: 600,
  color: colors.accent,
  wordBreak: "break-all",
  marginBottom: 4,
});

export const candidateModeRowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  marginBottom: 6,
};

export const candidateIntentStyle = (colors: ColorPalette): React.CSSProperties => ({
  fontSize: 12,
  color: colors.text,
  lineHeight: 1.5,
  marginBottom: 4,
});

export const candidateRationaleStyle = (colors: ColorPalette): React.CSSProperties => ({
  fontSize: 11,
  color: colors.textMuted,
  lineHeight: 1.4,
  marginBottom: 10,
});

export const candidateActionsStyle: React.CSSProperties = {
  display: "flex",
  gap: 8,
  justifyContent: "flex-end",
};

// ── Diff preview ────────────────────────────────────────────────

export function diffPanelStyle(colors: ColorPalette): React.CSSProperties {
  return {
    padding: "14px 16px",
    borderRadius: 12,
    background: colors.bg,
    border: `1px solid ${colors.border}`,
    marginBottom: 16,
  };
}

export const diffHeaderStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  marginBottom: 10,
};

export const diffSummaryStyle = (colors: ColorPalette): React.CSSProperties => ({
  fontSize: 12,
  fontWeight: 600,
  color: colors.text,
});

export const diffStatsStyle = (colors: ColorPalette): React.CSSProperties => ({
  display: "flex",
  gap: 10,
  fontSize: 11,
  color: colors.textMuted,
  marginBottom: 10,
});

export const diffAddStyle = { color: "#27ae60" };
export const diffDelStyle = { color: "#e74c3c" };

export const diffTextStyle = (colors: ColorPalette): React.CSSProperties => ({
  fontFamily: "ui-monospace, SFMono-Regular, 'SF Mono', Menlo, monospace",
  fontSize: 11,
  lineHeight: 1.6,
  color: colors.text,
  background: colors.surface,
  padding: "10px 12px",
  borderRadius: 8,
  border: `1px solid ${colors.border}`,
  overflowX: "auto",
  whiteSpace: "pre",
  maxHeight: 240,
  overflowY: "auto",
});

// ── Result / error ──────────────────────────────────────────────

export function resultBoxStyle(colors: ColorPalette, success: boolean): React.CSSProperties {
  return {
    padding: "10px 14px",
    borderRadius: 10,
    border: `1px solid ${success ? colors.successBorder : colors.dangerBorder}`,
    background: success ? colors.successBg : colors.dangerBg,
    marginBottom: 12,
    fontSize: 12,
    color: success ? colors.success : colors.danger,
    lineHeight: 1.5,
  };
}

// ── Buttons (reuse DispatchGate pattern) ────────────────────────

export function smallBtnStyle(colors: ColorPalette, variant: "default" | "accent" | "danger" = "default"): React.CSSProperties {
  const base = {
    padding: "5px 14px",
    borderRadius: 16,
    fontSize: 12,
    fontWeight: 600,
    cursor: "pointer",
    transition: "background 0.15s, border-color 0.15s",
    border: "none",
  };
  switch (variant) {
    case "accent":
      return { ...base, background: colors.accent, color: "#fff" };
    case "danger":
      return { ...base, background: colors.danger, color: "#fff" };
    default:
      return { ...base, background: "transparent", color: colors.textMuted, border: `1px solid ${colors.border}` };
  }
}

export function disabledBtnStyle(colors: ColorPalette): React.CSSProperties {
  return {
    padding: "5px 14px",
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
