import React from "react";
import type { DiffPreviewViewModel } from "./types.js";
import { WriteRiskBadge } from "./WriteRiskBadge.js";
import { useTheme } from "../theme/ThemeContext.js";
import {
  diffPanelStyle,
  diffHeaderStyle,
  diffSummaryStyle,
  diffStatsStyle,
  diffAddStyle,
  diffDelStyle,
  diffTextStyle,
  resultBoxStyle,
} from "./styles.js";

interface DiffPreviewPanelProps {
  preview: DiffPreviewViewModel;
  isApplying?: boolean;
  applyResult?: { applied: boolean; newHash?: string; rollbackId?: string; warnings: string[] } | null;
  onApply: () => void;
  onClose: () => void;
}

export const DiffPreviewPanel: React.FC<DiffPreviewPanelProps> = ({
  preview,
  isApplying,
  applyResult,
  onApply,
  onClose,
}) => {
  const { colors } = useTheme();

  return (
    <div style={diffPanelStyle(colors)}>
      <div style={diffHeaderStyle}>
        <div style={diffSummaryStyle(colors)}>{preview.summary}</div>
        <WriteRiskBadge riskLevel={preview.riskLevel} />
      </div>

      <div style={diffStatsStyle(colors)}>
        <span style={diffAddStyle}>+{preview.additions}</span>
        <span style={diffDelStyle}>-{preview.deletions}</span>
      </div>

      <pre style={diffTextStyle(colors)}>{preview.diffText}</pre>

      {applyResult && (
        <div style={resultBoxStyle(colors, applyResult.applied)}>
          {applyResult.applied ? (
            <>
              写入成功
              {applyResult.newHash && <> · hash: {applyResult.newHash}</>}
              {applyResult.rollbackId && <> · rollback: {applyResult.rollbackId}</>}
              {applyResult.warnings.length > 0 && (
                <div style={{ marginTop: 4, fontSize: 11, opacity: 0.8 }}>
                  {applyResult.warnings.join("; ")}
                </div>
              )}
            </>
          ) : (
            <>写入失败</>
          )}
        </div>
      )}

      {!applyResult && (
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 10 }}>
          <button type="button" style={{ padding: "5px 14px", borderRadius: 16, fontSize: 12, cursor: "pointer", border: `1px solid ${colors.border}`, background: "transparent", color: colors.textMuted }} onClick={onClose}>
            取消
          </button>
          <button
            type="button"
            style={{ padding: "5px 14px", borderRadius: 16, fontSize: 12, fontWeight: 600, cursor: isApplying ? "not-allowed" : "pointer", border: "none", background: isApplying ? colors.border : colors.accent, color: isApplying ? colors.textMuted : "#fff" }}
            onClick={onApply}
            disabled={isApplying}
          >
            {isApplying ? "写入中…" : "确认写入"}
          </button>
        </div>
      )}
    </div>
  );
};
