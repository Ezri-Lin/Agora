import type {
  RoutingIntent,
  ParticipationPolicy,
  CandidateRecallResult,
  AIRoleScore,
  RolePersona,
  RoleRoutingSettings,
  RoleRoutingDecision,
  RoutingSelectedRole,
  SuggestedPerspective,
  RoleRoutingScore,
} from "@agora/shared";

export interface ApplyRoleCapsInput {
  intent: RoutingIntent;
  participationPolicy: ParticipationPolicy;
  candidates: CandidateRecallResult[];
  aiScores?: AIRoleScore[];
  personas: RolePersona[];
  settings: RoleRoutingSettings;
  previousSpeakerIds: string[];
  existingActiveRoleIds: string[];
}

interface ScoredCandidate {
  personaId: string;
  finalScore: number;
  reason: string;
  aiScore?: number;
  localScore: number;
  persona: RolePersona;
  isNewEntrant: boolean;
  alreadySpoken: boolean;
}

function mergeScores(input: ApplyRoleCapsInput): ScoredCandidate[] {
  const personaMap = new Map(input.personas.map((p) => [p.id, p]));
  const aiMap = new Map((input.aiScores ?? []).map((s) => [s.personaId, s]));
  const prevSet = new Set(input.previousSpeakerIds);
  const existingSet = new Set(input.existingActiveRoleIds);

  return input.candidates.map((c) => {
    const persona = personaMap.get(c.personaId);
    const ai = aiMap.get(c.personaId);
    const finalScore = ai?.score ?? c.localScore;
    const reason = ai?.reason ?? (c.matchedSignals.length > 0
      ? `local: ${c.matchedSignals.join(", ")}`
      : "local scoring");

    return {
      personaId: c.personaId,
      finalScore,
      reason,
      aiScore: ai?.score,
      localScore: c.localScore,
      persona: persona!,
      isNewEntrant: !existingSet.has(c.personaId),
      alreadySpoken: prevSet.has(c.personaId),
    };
  });
}

function buildSelectedRole(candidate: ScoredCandidate): RoutingSelectedRole {
  return {
    roleId: candidate.persona.id,
    personaId: candidate.persona.id,
    domainId: candidate.persona.domainId,
    familyId: candidate.persona.familyId,
    name: candidate.persona.name,
    nameCN: candidate.persona.nameCN,
    subtitle: candidate.persona.subtitle,
    reason: candidate.reason,
    source: "persona",
  };
}

export function applyHardCaps(input: ApplyRoleCapsInput): RoleRoutingDecision {
  const { settings } = input;
  const scored = mergeScores(input);

  // Sort by finalScore descending
  scored.sort((a, b) => b.finalScore - a.finalScore);

  const activeEntrants: RoutingSelectedRole[] = [];
  const scores: RoleRoutingScore[] = [];
  const familyCount = new Map<string, number>();
  let newEntrantCount = 0;

  const blockedCandidates: ScoredCandidate[] = [];

  for (const candidate of scored) {
    const { persona, finalScore, reason, isNewEntrant, alreadySpoken } = candidate;

    // Build score entry
    const scoreEntry: RoleRoutingScore = {
      personaId: persona.id,
      roleFamilyId: persona.familyId,
      domainId: persona.domainId,
      localScore: candidate.localScore,
      aiScore: candidate.aiScore,
      finalScore,
      reason,
    };

    // Check threshold
    if (finalScore < settings.relevanceThreshold) {
      scoreEntry.blockedBy = "below_threshold";
      scores.push(scoreEntry);
      blockedCandidates.push(candidate);
      continue;
    }

    // Check round cap
    if (activeEntrants.length >= settings.maxActiveRolesPerRound) {
      scoreEntry.blockedBy = "round_cap";
      scores.push(scoreEntry);
      blockedCandidates.push(candidate);
      continue;
    }

    // Check new entrant cap (non-spoken roles count as new entrants)
    if (!alreadySpoken && newEntrantCount >= settings.maxNewEntrantsPerRound) {
      scoreEntry.blockedBy = "new_entrant_cap";
      scores.push(scoreEntry);
      blockedCandidates.push(candidate);
      continue;
    }

    // Check family cap
    const famCount = familyCount.get(persona.familyId) ?? 0;
    if (famCount >= settings.maxPersonasPerRoleFamily) {
      scoreEntry.blockedBy = "family_cap";
      scores.push(scoreEntry);
      blockedCandidates.push(candidate);
      continue;
    }

    // Check already spoken (for new_entrants_only policy)
    if (input.participationPolicy === "new_entrants_only" && alreadySpoken) {
      scoreEntry.blockedBy = "already_spoken";
      scores.push(scoreEntry);
      blockedCandidates.push(candidate);
      continue;
    }

    // Accept
    activeEntrants.push(buildSelectedRole(candidate));
    familyCount.set(persona.familyId, famCount + 1);
    if (!alreadySpoken) newEntrantCount++;
    scores.push({ ...scoreEntry, blockedBy: undefined });
  }

  // Build silent existing roles (roles that were active before but not selected this round)
  const activeIds = new Set(activeEntrants.map((a) => a.personaId));
  const silentExistingRoles: RoutingSelectedRole[] = scored
    .filter((c) => !activeIds.has(c.personaId) && !c.isNewEntrant)
    .slice(0, 5)
    .map(buildSelectedRole);

  // Build suggested perspectives (score >= suggestionThreshold, not active, top 5)
  const suggestedPerspectives: SuggestedPerspective[] = blockedCandidates
    .filter((c) => c.finalScore >= settings.suggestionThreshold)
    .slice(0, 5)
    .map((c) => ({
      familyId: c.persona.familyId,
      familyName: c.persona.familyId,
      domainId: c.persona.domainId,
      reason: c.reason,
      score: c.finalScore,
      personaId: c.persona.id,
      personaName: c.persona.name,
    }));

  return {
    intent: input.intent,
    participationPolicy: input.participationPolicy,
    activeEntrants,
    silentExistingRoles,
    suggestedPerspectives,
    scores,
  };
}
