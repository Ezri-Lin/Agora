import type {
  RoleCard,
  CouncilRoleSettings,
  RoleSelectionResult,
  RoleRoutingSettings,
  RoleRoutingDecision,
  RoutingIntent,
  ParticipationPolicy,
  ExplicitRoleRequest,
} from "@agora/shared";
import { toRoleRoutingSettings } from "@agora/shared";
import { roleCardsToPersonas } from "./roleCardToPersona.js";
import { parseExplicitRequests } from "./explicitRequests.js";
import { recallCandidates, type CandidateRecallInput } from "./candidateRecall.js";
import { applyHardCaps } from "./applyRoleCaps.js";
import { rerankRoles, type AIRoleRerankMode, type AIRoleRerankCaller } from "./aiRoleRerank.js";

export interface RouteLocalContext {
  previousSpeakerIds?: string[];
  existingActiveRoleIds?: string[];
  explicitRoleRequests?: ExplicitRoleRequest[];
}

export interface RouteContext extends RouteLocalContext {
  roomSummary?: string;
  recentTranscriptSummary?: string;
  aiRerankMode?: AIRoleRerankMode;
  aiRerankCaller?: AIRoleRerankCaller;
}

function detectIntent(
  topic: string,
  explicitRequests: ReturnType<typeof parseExplicitRequests>,
): { intent: RoutingIntent; policy: ParticipationPolicy } {
  if (explicitRequests.length > 0) {
    return { intent: "introduce_perspective", policy: "new_entrants_only" };
  }
  return { intent: "continue_discussion", policy: "all_selected" };
}

export function routeRolesLocal(
  available: RoleCard[],
  topic: string,
  settings: RoleRoutingSettings,
  context: RouteLocalContext = {},
): RoleRoutingDecision {
  const personas = roleCardsToPersonas(available);
  const textRequests = parseExplicitRequests(topic);
  const chipRequests = context.explicitRoleRequests ?? [];
  const explicitRequests = [...chipRequests, ...textRequests];
  const { intent, policy } = detectIntent(topic, explicitRequests);

  const recallInput: CandidateRecallInput = {
    queryText: topic,
    enabledDomainIds: settings.enabledDomainIds,
    enabledFamilyIds: settings.enabledRoleFamilyIds,
    personas,
    previousSpeakerIds: new Set(context.previousSpeakerIds ?? []),
    explicitRequests,
  };

  const candidates = recallCandidates(recallInput);

  return applyHardCaps({
    intent,
    participationPolicy: policy,
    candidates,
    personas,
    settings,
    previousSpeakerIds: context.previousSpeakerIds ?? [],
    existingActiveRoleIds: context.existingActiveRoleIds ?? [],
  });
}

export async function routeRoles(
  available: RoleCard[],
  topic: string,
  settings: RoleRoutingSettings,
  context: RouteContext = {},
): Promise<RoleRoutingDecision> {
  const personas = roleCardsToPersonas(available);
  const textRequests = parseExplicitRequests(topic);
  const chipRequests = context.explicitRoleRequests ?? [];
  const explicitRequests = [...chipRequests, ...textRequests];
  const { intent, policy } = detectIntent(topic, explicitRequests);

  const recallInput: CandidateRecallInput = {
    queryText: topic,
    enabledDomainIds: settings.enabledDomainIds,
    enabledFamilyIds: settings.enabledRoleFamilyIds,
    personas,
    previousSpeakerIds: new Set(context.previousSpeakerIds ?? []),
    explicitRequests,
  };

  const candidates = recallCandidates(recallInput);

  // Optional AI rerank
  const aiScores = await rerankRoles(
    candidates,
    personas,
    {
      latestUserMessage: topic,
      roomSummary: context.roomSummary ?? "",
      recentTranscriptSummary: context.recentTranscriptSummary ?? "",
    },
    context.aiRerankMode ?? "fallback_local",
    context.aiRerankCaller,
  );

  return applyHardCaps({
    intent,
    participationPolicy: policy,
    candidates,
    aiScores,
    personas,
    settings,
    previousSpeakerIds: context.previousSpeakerIds ?? [],
    existingActiveRoleIds: context.existingActiveRoleIds ?? [],
  });
}

/**
 * Backward-compatible wrapper.
 * Preserves the existing sync signature for CouncilRunner and other callers.
 */
export function selectRoles(
  available: RoleCard[],
  topic: string,
  settings: CouncilRoleSettings,
  removedRoleIds: Set<string> = new Set(),
): RoleSelectionResult {
  const routingSettings = toRoleRoutingSettings(settings);
  const effectiveAvailable = available.filter((r) => !removedRoleIds.has(r.id));

  const decision = routeRolesLocal(effectiveAvailable, topic, routingSettings);

  return {
    activeRoles: decision.activeEntrants.map((r) => ({
      roleId: r.roleId,
      name: r.name,
      subtitle: r.subtitle,
      source: r.source === "existing_role_card" ? "base" as const
        : r.source === "auto_routed" ? "auto_invited" as const
        : "manual" as const,
    })),
    suggestedRoles: decision.suggestedPerspectives.map((s) => ({
      roleId: s.personaId ?? s.familyId,
      name: s.personaName ?? s.familyName,
      subtitle: s.familyName,
      reason: s.reason,
      score: s.score,
      matchedTags: [],
      inviteMode: "next_round" as const,
      blockedBy: "below_auto_threshold" as const,
    })),
  };
}
