import React from "react";
import { DocumentWriteProposalPanel } from "../DocumentWriteProposal/DocumentWriteProposalPanel.js";
import { MemoryCandidateReviewPanel } from "../MemoryReview/MemoryCandidateReviewPanel.js";
import { SessionSummaryPanel } from "../SessionSummary/SessionSummaryPanel.js";
import type { SessionSummaryViewModel } from "../SessionSummary/types.js";
import { useTheme } from "../theme/ThemeContext.js";
import {
  agoraDarkColors,
  agoraLightColors,
  blur,
  blurDark,
  radius,
  shadow,
  shadowDark,
  spacing,
  typography,
  zIndex,
} from "../theme/tokens.js";
import type { ColorPalette } from "../theme/palettes.js";

export interface ReviewPanelHostProps {
  showWriteProposalPanel: boolean;
  showMemoryReviewPanel: boolean;
  showSessionSummaryPanel: boolean;
  onCloseWriteProposalPanel: () => void;
  onCloseMemoryReviewPanel: () => void;
  onCloseSessionSummaryPanel: () => void;
  onOpenMemoryReviewPanel: () => void;
  // 新增: Memory Review 数据源
  memoryCandidates?: import("../MemoryReview/types.js").MemoryCandidateViewModel[];
  onMemorySave?: (selectedCandidates: import("../MemoryReview/types.js").MemoryCandidateViewModel[]) => void;
}

const EMPTY_SUMMARY: SessionSummaryViewModel = {
  id: "empty-session-summary",
  title: "No session summary generated yet.",
  consensus: [],
  disagreements: [],
  unresolvedQuestions: [],
  decisions: [],
  actionItems: [],
  docWriteCandidateCount: 0,
  memoryCandidateCount: 0,
};

export const ReviewPanelHost: React.FC<ReviewPanelHostProps> = ({
  showWriteProposalPanel,
  showMemoryReviewPanel,
  showSessionSummaryPanel,
  onCloseWriteProposalPanel,
  onCloseMemoryReviewPanel,
  onCloseSessionSummaryPanel,
  onOpenMemoryReviewPanel,
  memoryCandidates = [],
  onMemorySave,
}) => {
  const { colors } = useTheme();

  if (!showWriteProposalPanel && !showMemoryReviewPanel && !showSessionSummaryPanel) {
    return null;
  }

  return (
    <div style={hostStyle}>
      {showWriteProposalPanel && (
        <PanelFrame
          label="Document write proposals"
          closeLabel="Close write proposals"
          colors={colors}
          offset={0}
          onClose={onCloseWriteProposalPanel}
        >
          <DocumentWriteProposalPanel
            candidates={[]}
            onGenerateDiff={() => {}}
            onApply={() => {}}
            onDismiss={() => {}}
            onDismissAll={() => {}}
            onCloseDiff={() => {}}
          />
        </PanelFrame>
      )}
      {showMemoryReviewPanel && (
        <PanelFrame
          label="Memory candidate review"
          closeLabel="Close memory review"
          colors={colors}
          offset={showWriteProposalPanel ? 1 : 0}
          onClose={onCloseMemoryReviewPanel}
        >
          <MemoryCandidateReviewPanel
            candidates={memoryCandidates}
            onSave={onMemorySave ?? (() => {})}
            onDismiss={onCloseMemoryReviewPanel}
          />
        </PanelFrame>
      )}
      {showSessionSummaryPanel && (
        <PanelFrame
          label="Session summary"
          closeLabel="Close session summary"
          colors={colors}
          offset={(showWriteProposalPanel ? 1 : 0) + (showMemoryReviewPanel ? 1 : 0)}
          onClose={onCloseSessionSummaryPanel}
        >
          <SessionSummaryPanel
            summary={EMPTY_SUMMARY}
            onDismiss={onCloseSessionSummaryPanel}
            onOpenMemoryReview={onOpenMemoryReviewPanel}
          />
        </PanelFrame>
      )}
    </div>
  );
};

const PanelFrame: React.FC<{
  label: string;
  closeLabel: string;
  colors: ColorPalette;
  offset: number;
  onClose: () => void;
  children: React.ReactNode;
}> = ({ label, closeLabel, colors, offset, onClose, children }) => (
  <div role="dialog" aria-label={label} style={frameStyle(colors, offset)}>
    <button type="button" aria-label={closeLabel} style={closeButtonStyle(colors)} onClick={onClose}>
      x
    </button>
    {children}
  </div>
);

const hostStyle: React.CSSProperties = {
  position: "fixed",
  top: spacing.xxl + spacing.lg,
  right: spacing.xl,
  zIndex: zIndex.overlay,
  pointerEvents: "none",
};

function frameStyle(colors: ColorPalette, offset: number): React.CSSProperties {
  const dark = colors.bg === "#0d0d0f";
  return {
    position: "relative",
    width: 680,
    maxWidth: "calc(100vw - 40px)",
    marginTop: offset === 0 ? 0 : spacing.md,
    pointerEvents: "auto",
    borderRadius: radius.lg,
    border: `1px solid ${dark ? agoraDarkColors.borderSubtle : agoraLightColors.borderSubtle}`,
    background: dark ? agoraDarkColors.surfaceFrostedStrong : agoraLightColors.surfaceFrostedStrong,
    boxShadow: dark ? shadowDark.popover : shadow.popover,
    backdropFilter: dark ? blurDark.frosted : blur.frosted,
    WebkitBackdropFilter: dark ? blurDark.frosted : blur.frosted,
    overflow: "hidden",
  };
}

function closeButtonStyle(colors: ColorPalette): React.CSSProperties {
  return {
    position: "absolute",
    top: spacing.sm,
    right: spacing.sm,
    zIndex: 1,
    minWidth: 28,
    height: 28,
    borderRadius: radius.xs,
    border: `1px solid ${colors.border}`,
    background: colors.surface,
    color: colors.textMuted,
    fontSize: typography.meta.size,
    fontWeight: 700,
    cursor: "pointer",
  };
}
