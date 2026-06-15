/**
 * Dispatch types — role candidates, selection policy, dispatch preview.
 */

import type { TaskFrame } from "./taskFrameTypes.js";

// === RoleCandidate ===

export interface RoleCandidate {
  roleId: string;
  name: string;
  subtitle: string;
  domainId: string;
  familyId: string;
  tags: string[];
  score: number;
  scoreBreakdown: {
    relevance: number;
    diversity: number;
    conflictValue: number;
    userPreferenceFit: number;
    groundingQuality: number;
  };
  reason: string;
  source: "router_recommended" | "persona_search" | "explicit_user_request" | "manual_search";
  rank: number;
  defaultSelected: boolean;
}

// === DefaultSelection ===

export interface DefaultSelectionResult {
  rankedCandidates: RoleCandidate[];
  defaultSelectedRoleIds: string[];
  recommendedAlternativeRoleIds: string[];
}

// === DispatchPreview ===

export interface DispatchPreview {
  roundId: string;
  userMessageId: string;
  taskFrameId: string;
  moderatorSummary: string;
  councilValueReason: string[];
  rankedCandidates: RoleCandidate[];
  defaultSelectedRoleIds: string[];
  recommendedAlternativeRoleIds: string[];
  settings: {
    defaultSelectedRoleLimit: number;
    candidateDisplayLimit: number;
    skipConfirm: boolean;
    requireCriticByDefault: boolean;
  };
  audit: {
    routerReason: string;
    roleSearchQueries: string[];
    candidateCount: number;
    generatedAt: string;
  };
}

// === CouncilDispatchSettings ===

export interface CouncilDispatchSettings {
  defaultSelectedRoleLimit: number;
  candidateDisplayLimit: number;
  skipConfirm: boolean;
  requireCriticByDefault: boolean;
  softSelectionWarningThreshold?: number;
  hardSelectionLimit?: number;
}

// === RoutingDecisionRecord ===

export interface RoutingDecisionRecord {
  id: string;
  userMessageId: string;
  taskFrameId: string;
  inputRoute: string;
  engagementDecision: string;
  roleSearchQueries: string[];
  rankedCandidates: RoleCandidate[];
  defaultSelectedRoleIds: string[];
  finalSelectedRoleIds?: string[];
  userModifiedSelection?: boolean;
  createdAt: string;
}
