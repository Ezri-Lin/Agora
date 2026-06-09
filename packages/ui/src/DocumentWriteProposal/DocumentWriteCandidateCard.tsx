import React from "react";
import type { DocWriteCandidateViewModel, SupportedChangeMode } from "./types.js";
import { WriteRiskBadge } from "./WriteRiskBadge.js";
import { useTheme } from "../theme/ThemeContext.js";
import {
  candidateCardStyle,
  candidatePathStyle,
  candidateModeRowStyle,
  candidateIntentStyle,
  candidateRationaleStyle,
  candidateActionsStyle,
  smallBtnStyle,
  disabledBtnStyle,
  getModeLabel,
  resultBoxStyle,
} from "./styles.js";

const SUPPORTED_MODES: ReadonlySet<string> = new Set<SupportedChangeMode>([
  "create_document",
  "append_section",
  "update_section",
]);

interface DocumentWriteCandidateCardProps {
  candidate: DocWriteCandidateViewModel;
  onGenerateDiff: (id: string) => void;
  onDismiss: (id: string) => void;
}

export const DocumentWriteCandidateCard: React.FC<DocumentWriteCandidateCardProps> = ({
  candidate,
  onGenerateDiff,
  onDismiss,
}) => {
  const { colors } = useTheme();
  const supported = SUPPORTED_MODES.has(candidate.mode);

  return (
    <div style={candidateCardStyle(colors, candidate.riskLevel)}>
      <div style={candidatePathStyle(colors)}>{candidate.targetPath}</div>
      <div style={candidateModeRowStyle}>
        <span style={{ fontSize: 11, color: colors.textMuted }}>{getModeLabel(candidate.mode)}</span>
        <WriteRiskBadge riskLevel={candidate.riskLevel} />
      </div>
      <div style={candidateIntentStyle(colors)}>{candidate.intent}</div>
      <div style={candidateRationaleStyle(colors)}>{candidate.rationale}</div>

      {candidate.status === "error" && candidate.error && (
        <div style={resultBoxStyle(colors, false)}>{candidate.error}</div>
      )}
      {candidate.status === "success" && (
        <div style={resultBoxStyle(colors, true)}>写入成功</div>
      )}

      {candidate.status !== "success" && (
        <div style={candidateActionsStyle}>
          <button
            type="button"
            style={smallBtnStyle(colors)}
            onClick={() => onDismiss(candidate.id)}
          >
            忽略
          </button>
          {supported ? (
            <button
              type="button"
              style={smallBtnStyle(colors, "accent")}
              onClick={() => onGenerateDiff(candidate.id)}
              disabled={candidate.status === "applying"}
            >
              {candidate.status === "applying" ? "处理中…" : "生成 Diff Preview"}
            </button>
          ) : (
            <button type="button" style={disabledBtnStyle(colors)} disabled>
              暂不支持此变更类型
            </button>
          )}
        </div>
      )}
    </div>
  );
};
