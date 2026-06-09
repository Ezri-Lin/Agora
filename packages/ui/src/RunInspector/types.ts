import type { CouncilMessage, CouncilRoundSnapshot, RoleCard, RoleRoundHistory, SuggestedPerspective } from "@agora/shared";
import type { RoleStreamState } from "../CouncilMonitor/CouncilMonitor.js";

export interface SourceRef {
  path: string;
  label: string;
}

export interface ContextDebug {
  moderatorHasOverflow: boolean;
  moderatorOverflowDocs: string[];
  moderatorIncludedDocCount: number;
  moderatorTotalChars: number;
  roleContextMode: string;
  roleTruncatedDocs: number;
  roleTotalChars: number;
  roleDocCount: number;
}

export interface RunInspectorProps {
  visible: boolean;
  panelPhase: "idle" | "running" | "completed" | "error";
  roleStreamStates: Map<string, RoleStreamState>;
  lastRoundSnapshot: CouncilRoundSnapshot | null;
  roles: RoleCard[];
  messages: CouncilMessage[];
  outputs: string[];
  references: SourceRef[];
  workspacePath?: string;
  userMessage?: string;
  activeRoleIdsFromMessages?: Set<string>;
  roleHistories?: Map<string, RoleRoundHistory[]>;
  memoryCount?: number;
  contextDebug?: ContextDebug;
  onToggle?: () => void;
  onInviteRole?: (roleId: string) => void;
  onStopRole?: (roleId: string) => void;
  onRemoveRole?: (roleId: string) => void;
  onJumpToMessage?: (messageId: string) => void;
  onAddPerspective?: (roleId: string, roleName: string) => void;
  suggestedPerspectives?: SuggestedPerspective[];
  onOpenWriteProposals?: () => void;
  onOpenMemoryReview?: () => void;
  onOpenSessionSummary?: () => void;
}
