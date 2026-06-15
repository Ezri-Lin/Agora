/**
 * Dispatch types — types for the prepareCouncilDispatch split.
 *
 * PR-14: Prepares a dispatch preview before running the round,
 * allowing UI to confirm/adjust selected roles.
 */

import type {
  CouncilRoom,
  CouncilMessage,
  RoleCard,
  RoleRoutingDecision,
  CouncilRoleSettings,
  RoleRoutingSettings,
  ExplicitRoleRequest,
  PersonaContract,
} from "@agora/shared";
import type { RetrievalEngine } from "../context/types.js";
import type { ContextPackage } from "../context/ContextCompiler.js";
import type { SessionRunningBrief } from "../compact/types.js";

export interface PrepareCouncilDispatchInput {
  room: CouncilRoom;
  topic: string;
  userMessage: CouncilMessage;
  availableRoles: RoleCard[];
  recentMessages?: CouncilMessage[];
  docContents?: Map<string, string>;
  retrievalEngine?: RetrievalEngine;
  retrievalQuery?: string;
  contextPackage?: ContextPackage;
  sessionRunningBrief?: SessionRunningBrief;
  roleSettings?: Partial<CouncilRoleSettings>;
  /** Override routing settings (e.g. lower relevanceThreshold for testing). */
  routingSettings?: Partial<RoleRoutingSettings>;
  explicitRoleRequests?: ExplicitRoleRequest[];
  getContractForRole?: (roleId: string) => PersonaContract | undefined;
}

export interface CouncilDispatchPreview {
  userMessageId: string;
  topic: string;
  moderatorSummary: string;
  routingDecision: RoleRoutingDecision;
  defaultSelectedRoleIds: string[];
  alternativeRoleIds: string[];
  contextPackage?: ContextPackage;
  sessionRunningBrief?: SessionRunningBrief;
  /** LLM moderator analysis (replaces deterministic summary when available) */
  moderatorAnalysis?: string;
  /** Moderator thinking/reasoning from LLM */
  moderatorThinking?: string;
}
