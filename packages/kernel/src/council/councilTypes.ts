import type {
  CouncilRoom,
  CouncilMessage,
  RoleCard,
  MemoryCandidate,
  CouncilEvent,
  CouncilRoleSettings,
  ExplicitRoleRequest,
  RoleRoutingDecision,
  PersonaContract,
  TaskFrame,
} from "@agora/shared";
import type { LLMProvider } from "../types/index.js";
import type { ContextPack } from "../context/ContextPack.js";
import type { ModeratorContextPack } from "../context/ModeratorContextPack.js";
import type { RetrievalEngine } from "../context/types.js";
import type { ContextPackage } from "../context/ContextCompiler.js";
import type { MemoryStore } from "../memory/MemoryStore.js";
import type { MessageCompact, CouncilRoundCompact, SessionRunningBrief } from "../compact/types.js";

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

export interface CouncilRunResult {
  moderatorAnalysis: string;
  roleMessages: CouncilMessage[];
  crossExaminationMessages: CouncilMessage[];
  summary: string;
  roleContextPack: ContextPack;
  moderatorContextPack: ModeratorContextPack;
  contextDebug: ContextDebug;
  extractedMemories: MemoryCandidate[];
  routingDecision?: RoleRoutingDecision;
  messageCompacts?: MessageCompact[];
  roundCompact?: CouncilRoundCompact;
  sessionRunningBrief?: SessionRunningBrief;
}

export interface RunCouncilRoundInput {
  room: CouncilRoom;
  topic: string;
  userMessage: CouncilMessage;
  availableRoles: RoleCard[];
  llm: LLMProvider;
  recentMessages?: CouncilMessage[];
  docContents?: Map<string, string>;
  memoryStore?: MemoryStore;
  onEvent?: (event: CouncilEvent) => void;
  roleSettings?: Partial<CouncilRoleSettings>;
  explicitRoleRequests?: ExplicitRoleRequest[];
  getContractForRole?: (roleId: string) => PersonaContract | undefined;
  retrievalEngine?: RetrievalEngine;
  retrievalQuery?: string;
  contextPackage?: ContextPackage;
  sessionRunningBrief?: SessionRunningBrief;
  selectedRoleIds?: string[];
  /** Adaptive Council Graph: task frame for context */
  taskFrame?: TaskFrame;
  /** Adaptive Council Graph: user-confirmed role IDs (takes precedence over selectedRoleIds) */
  finalSelectedRoleIds?: string[];
  /** Roles excluded from candidate pool (paused + removed) */
  excludedRoleIds?: string[];
  /** Roles manually included — exempt from cap/blocking but not forced */
  includedRoleIds?: string[];
}
