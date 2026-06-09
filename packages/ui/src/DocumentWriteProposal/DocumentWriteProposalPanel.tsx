import React from "react";
import type { DocumentWriteProposalPanelProps } from "./types.js";
import { DocumentWriteCandidateCard } from "./DocumentWriteCandidateCard.js";
import { DiffPreviewPanel } from "./DiffPreviewPanel.js";
import { useTheme } from "../theme/ThemeContext.js";
import {
  proposalPanelStyle,
  proposalScrollBodyStyle,
  proposalHeaderStyle,
  proposalTitleStyle,
  proposalSubtitleStyle,
  smallBtnStyle,
} from "./styles.js";

export const DocumentWriteProposalPanel: React.FC<DocumentWriteProposalPanelProps> = ({
  candidates,
  diffPreview,
  previewForId,
  isGeneratingDiff,
  isApplying,
  applyResult,
  onGenerateDiff,
  onApply,
  onDismiss,
  onDismissAll,
  onCloseDiff,
  headerExtra,
}) => {
  const { colors } = useTheme();

  const pendingCount = candidates.filter(
    (c) => c.status !== "success",
  ).length;

  return (
    <div style={proposalPanelStyle(colors)}>
      <div style={proposalScrollBodyStyle}>
        <div style={proposalHeaderStyle(colors)}>
          <div>
            <div style={proposalTitleStyle(colors)}>文档写入建议</div>
            <div style={proposalSubtitleStyle(colors)}>
              {pendingCount > 0
                ? `${pendingCount} 条待处理建议`
                : "所有建议已处理"}
            </div>
          </div>
          {headerExtra}
        </div>

        {candidates.map((candidate) => (
          <DocumentWriteCandidateCard
            key={candidate.id}
            candidate={candidate}
            onGenerateDiff={onGenerateDiff}
            onDismiss={onDismiss}
          />
        ))}

        {previewForId && diffPreview && (
          <DiffPreviewPanel
            preview={diffPreview}
            isApplying={isApplying}
            applyResult={applyResult}
            onApply={() => onApply(previewForId)}
            onClose={onCloseDiff}
          />
        )}

        {isGeneratingDiff && (
          <div style={{ textAlign: "center", padding: "16px 0", fontSize: 12, color: colors.textMuted }}>
            生成 Diff Preview…
          </div>
        )}

        {candidates.length === 0 && (
          <div style={{ textAlign: "center", padding: "32px 0", fontSize: 12, color: colors.textMuted, opacity: 0.6 }}>
            No document write proposals yet.
          </div>
        )}
      </div>

      {candidates.length > 0 && pendingCount > 0 && (
        <div style={{ display: "flex", justifyContent: "flex-end", padding: "12px 20px", borderTop: `1px solid ${colors.border}` }}>
          <button type="button" style={smallBtnStyle(colors)} onClick={onDismissAll}>
            全部忽略
          </button>
        </div>
      )}
    </div>
  );
};
