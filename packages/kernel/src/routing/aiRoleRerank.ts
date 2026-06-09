import type {
  AIRoleScore,
  CandidateRecallResult,
  RolePersona,
} from "@agora/shared";

export const TOP_CANDIDATES_FOR_AI_RERANK = 30;

export type AIRoleRerankMode = "enabled" | "disabled" | "fallback_local";

export interface AIRoleRerankCandidate {
  personaId: string;
  name: string;
  domainId: string;
  familyId: string;
  summary: string;
  localScore: number;
  matchedSignals: string[];
}

export interface AIRoleRerankInput {
  latestUserMessage: string;
  roomSummary: string;
  recentTranscriptSummary: string;
  candidates: AIRoleRerankCandidate[];
  maxActiveRolesPerRound: number;
  maxNewEntrantsPerRound: number;
}

export interface AIRoleRerankCaller {
  (input: AIRoleRerankInput): Promise<AIRoleScore[]>;
}

function validateScores(
  scores: AIRoleScore[],
  knownPersonaIds: Set<string>,
): AIRoleScore[] {
  const seen = new Set<string>();
  const valid: AIRoleScore[] = [];

  for (const s of scores) {
    if (!knownPersonaIds.has(s.personaId)) continue;
    if (typeof s.score !== "number" || s.score < 0 || s.score > 1) continue;
    if (seen.has(s.personaId)) continue;
    seen.add(s.personaId);
    valid.push(s);
  }

  return valid;
}

function buildFallbackScores(
  candidates: CandidateRecallResult[],
): AIRoleScore[] {
  return candidates.map((c) => ({
    personaId: c.personaId,
    score: c.localScore,
    shouldEnter: c.localScore >= 0.68,
    suggestedOnly: c.localScore < 0.68 && c.localScore >= 0.50,
    reason: c.matchedSignals.length > 0
      ? `local: ${c.matchedSignals.join(", ")}`
      : "local fallback",
  }));
}

export async function rerankRoles(
  candidates: CandidateRecallResult[],
  personas: RolePersona[],
  input: {
    latestUserMessage: string;
    roomSummary: string;
    recentTranscriptSummary: string;
  },
  mode: AIRoleRerankMode,
  caller?: AIRoleRerankCaller,
): Promise<AIRoleScore[]> {
  if (mode === "disabled" || !caller) {
    return buildFallbackScores(candidates);
  }

  // Top-N cap: only send top candidates to AI
  const topCandidates = candidates.slice(0, TOP_CANDIDATES_FOR_AI_RERANK);
  const personaMap = new Map(personas.map((p) => [p.id, p]));
  const knownIds = new Set(topCandidates.map((c) => c.personaId));

  const rerankInput: AIRoleRerankInput = {
    latestUserMessage: input.latestUserMessage,
    roomSummary: input.roomSummary,
    recentTranscriptSummary: input.recentTranscriptSummary,
    candidates: topCandidates.map((c) => {
      const persona = personaMap.get(c.personaId);
      return {
        personaId: c.personaId,
        name: persona?.name ?? c.personaId,
        domainId: persona?.domainId ?? "",
        familyId: persona?.familyId ?? "",
        summary: persona?.mission ?? "",
        localScore: c.localScore,
        matchedSignals: c.matchedSignals,
      };
    }),
    maxActiveRolesPerRound: 5,
    maxNewEntrantsPerRound: 3,
  };

  try {
    const aiScores = await caller(rerankInput);
    const validated = validateScores(aiScores, knownIds);

    if (validated.length === 0 && mode === "fallback_local") {
      return buildFallbackScores(candidates);
    }

    // Merge: use AI score where available, fallback to local for missing
    const aiMap = new Map(validated.map((s) => [s.personaId, s]));
    return candidates.map((c) => {
      const ai = aiMap.get(c.personaId);
      if (ai) return ai;
      return {
        personaId: c.personaId,
        score: c.localScore,
        shouldEnter: false,
        suggestedOnly: c.localScore >= 0.50,
        reason: `local fallback: ${c.matchedSignals.join(", ")}`,
      };
    });
  } catch {
    if (mode === "fallback_local") {
      return buildFallbackScores(candidates);
    }
    return buildFallbackScores(candidates);
  }
}
