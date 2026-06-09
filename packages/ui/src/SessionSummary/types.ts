export interface SessionSummaryViewModel {
  id: string;
  title?: string;
  topic?: string;
  roundCount?: number;

  consensus: string[];
  disagreements: Array<{
    with?: string;
    point: string;
  }>;
  unresolvedQuestions: string[];
  decisions: string[];
  actionItems: Array<{
    text: string;
    owner?: string;
    due?: string;
  }>;

  keyInsights?: string[];
  docWriteCandidateCount?: number;
  memoryCandidateCount?: number;
}

export interface SessionSummaryPanelProps {
  summary: SessionSummaryViewModel;
  onSaveSummary?: (summary: SessionSummaryViewModel) => void;
  onSaveDecisionLog?: (decisions: string[]) => void;
  onCreatePermanentNoteSeed?: (summary: SessionSummaryViewModel) => void;
  onOpenMemoryReview?: () => void;
  onDismiss?: () => void;
}
