export type MemoryCandidateScope =
  | "global"
  | "domain"
  | "project"
  | "shared_experience"
  | "role_usage"
  | "decision";

export interface MemoryCandidateViewModel {
  id: string;
  text: string;
  scope: MemoryCandidateScope;
  reason?: string;
  sourceRoundId?: string;
  sourcePersonaId?: string;
  tags?: string[];
  selectedByDefault?: boolean;
}

export interface MemoryCandidateReviewPanelProps {
  candidates: MemoryCandidateViewModel[];
  onSave: (selectedCandidates: MemoryCandidateViewModel[]) => void;
  onDismiss: () => void;
}
