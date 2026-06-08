// === Workspace ===

export interface WorkspaceRoot {
  id: string;
  path: string;
  visibility: "public" | "private";
}

export interface WorkspaceConfig {
  mode: "single_private" | "public_private_overlay";
  roots: WorkspaceRoot[];
  defaultMemoryRoot: string;
  defaultRoomRoot: string;
  defaultWritePolicy: "docs_only";
}

// === Room ===

export interface RoomSettings {
  roleCount: number;
  maxMessagesPerRoleBeforeUserReply: number;
  allowAutoDocs: boolean;
  allowCrossExamination: boolean;
  generationMode: "multi_call_cached";
  contextMode: ContextMode;
}

export interface CouncilRoom {
  id: string;
  title: string;
  workspaceId: string;
  sourceRefs: SourceRef[];
  participants: Participant[];
  settings: RoomSettings;
  visibility: "private" | "public";
  createdAt: string;
  updatedAt: string;
}

export type SourceRefImportance = "primary" | "supporting" | "memory" | "background";

export interface SourceRef {
  type: "file" | "url" | "snippet";
  path?: string;
  url?: string;
  snippet?: string;
  label?: string;
  importance?: SourceRefImportance;
}

export interface Participant {
  roleId: string;
  roleType: string;
  joinedAt: string;
}

// === Messages ===

export type SenderType = "user" | "moderator" | "role" | "system";

export type ProviderErrorCode = "missing_api_key" | "invalid_api_key" | "rate_limited" | "model_not_found" | "network_error" | "timeout" | "empty_response" | "unknown";

export interface CouncilMessage {
  id: string;
  roomId: string;
  senderType: SenderType;
  senderId: string;
  content: string;
  createdAt: string;
  /** "error" for system error events, "ok" or undefined for normal messages */
  status?: "ok" | "error";
  /** Error code for system error messages */
  errorCode?: ProviderErrorCode;
  /** Human-readable error detail */
  errorMessage?: string;
  /** For system/error messages targeting a specific role */
  targetRoleId?: string;
  /** Chain-of-thought / reasoning trace (collapsible in UI) */
  thinking?: string;
  /** One-line summary for graph display */
  graphSummary?: string;
}

// === Role ===

export interface RoleCard {
  id: string;
  name: string;
  nameCN: string;
  subtitle: string;
  type: "moderator" | "critic" | "historian" | "strategist" | "lens" | "architect";
  systemPrompt: string;
  tags: string[];
}

export interface RoleCallInput {
  roomId: string;
  role: RoleCard;
  sharedContext: string;
  roomSummary: string;
  recentMessages: CouncilMessage[];
}

// === Context ===

export type ContextMode = "quick" | "standard" | "deep" | "full_doc";

export interface ContextRequest {
  refPath: string;
  reason: string;
}

export interface RoleCallResult {
  roleId: string;
  content: string;
  thinking?: string;
  tokenUsage?: { input: number; output: number };
  needsMoreContext?: boolean;
  contextRequests?: ContextRequest[];
}

// === LLM Config ===

export type LLMProviderKind = "mock" | "openai_compatible" | "anthropic";

export interface LLMConfig {
  provider: LLMProviderKind;
  model: string;
  apiKeyEnv?: string;
  baseUrl?: string;
}

export const DEFAULT_LLM_CONFIG: LLMConfig = {
  provider: "mock",
  model: "mock",
};

// === Memory ===

export type MemoryScope = "universal" | "domain" | "project" | "role" | "session";

export interface MemoryCandidate {
  id: string;
  roomId: string;
  scope: MemoryScope;
  domains: string[];
  tags: string[];
  content: string;
  confidence: number;
  status: "candidate" | "accepted" | "rejected";
  createdAt: string;
}

// === Streaming Events ===

export type CouncilEventType =
  | "step"
  | "role_start"
  | "role_chunk"
  | "role_done"
  | "role_stopped"
  | "cross_start"
  | "cross_chunk"
  | "cross_done"
  | "moderator_done"
  | "summary_done";

export interface CouncilEvent {
  type: CouncilEventType;
  step?: string;
  roleId?: string;
  roundId?: string;
  delta?: string;
  thinking?: string;
  message?: CouncilMessage;
  content?: string;
  messageId?: string;
  partialContent?: string;
  graphSummary?: string;
}

// === Round Lifecycle ===

/** Overall state of a council round */
export type CouncilRoundStatus = "idle" | "running" | "completed" | "failed" | "cancelled";

/** Panel display phase — derived from round status + user interaction */
export type CouncilPanelPhase = "idle" | "running" | "completed" | "error";

/** Panel visibility — controls floating panel state */
export type CouncilPanelVisibility = "hidden" | "collapsed_pill" | "open";

/** Snapshot of a single role's run result (retained after round completes) */
export interface RoleRunSnapshot {
  roleId: string;
  status: "done" | "error";
  startedAt: number;
  endedAt: number;
  microSummary: string;
  errorMessage?: string;
}

/** Snapshot of an entire completed round (used by floating panel post-completion) */
export interface CouncilRoundSnapshot {
  roundId: string;
  completedAt: number;
  roleSnapshots: RoleRunSnapshot[];
  summary?: string;
  roleCount: number;
  doneCount: number;
  errorCount: number;
}

// === Role Selection Settings ===

export interface CouncilRoleSettings {
  roleCount: number;
  maxActiveRolesPerRound: number;
  maxAutoInviteLenses: number;
  autoInviteLensThreshold: number;
  allowAutoInviteLenses: boolean;
  allowInviteDuringRunning: boolean;
}

export const DEFAULT_ROLE_SETTINGS: CouncilRoleSettings = {
  roleCount: 3,
  maxActiveRolesPerRound: 6,
  maxAutoInviteLenses: 2,
  autoInviteLensThreshold: 3,
  allowAutoInviteLenses: true,
  allowInviteDuringRunning: false,
};

function clampInt(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Math.round(value)));
}

export function normalizeCouncilRoleSettings(input?: Partial<CouncilRoleSettings>): CouncilRoleSettings {
  const merged = { ...DEFAULT_ROLE_SETTINGS, ...input };
  return {
    roleCount: clampInt(merged.roleCount, 1, merged.maxActiveRolesPerRound),
    maxActiveRolesPerRound: clampInt(merged.maxActiveRolesPerRound, 1, 12),
    maxAutoInviteLenses: clampInt(merged.maxAutoInviteLenses, 0, merged.maxActiveRolesPerRound),
    autoInviteLensThreshold: clampInt(merged.autoInviteLensThreshold, 1, 10),
    allowAutoInviteLenses: Boolean(merged.allowAutoInviteLenses),
    allowInviteDuringRunning: Boolean(merged.allowInviteDuringRunning),
  };
}

// === Role Selection Result ===

export interface SelectedRole {
  roleId: string;
  name: string;
  subtitle?: string;
  type?: string;
  tags?: string[];
  prompt?: string;
  source: "base" | "auto_invited" | "manual";
}

export interface SuggestedRole {
  roleId: string;
  name: string;
  subtitle?: string;
  reason: string;
  score: number;
  matchedTags: string[];
  inviteMode: "next_round" | "join_now";
  blockedBy?: "over_limit" | "below_auto_threshold" | "manual_only" | "already_removed";
}

export interface RoleSelectionResult {
  activeRoles: SelectedRole[];
  suggestedRoles: SuggestedRole[];
  skippedRoles?: Array<{
    roleId: string;
    reason: "over_limit" | "below_threshold" | "already_active" | "disabled" | "removed";
    score?: number;
  }>;
}

// === Role Round History ===

export interface RoleRoundHistory {
  roomId: string;
  roleId: string;
  roundId: string;
  roundIndex: number;
  messageId?: string;
  topic: string;
  summary: string;
  preview?: string;
  status: "done" | "stopped" | "error" | "partial";
  source: "message" | "stream" | "snapshot";
  timestamp: string;
}
