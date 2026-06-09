/**
 * buildSessionRunningBrief — accumulate round compacts into a session brief.
 *
 * Each round's CouncilRoundCompact is merged into the running brief,
 * enabling the next round to understand prior context without re-reading
 * all raw messages.
 */

import type {
  CouncilRoundCompact,
  MessageCompact,
  PersonaStanceCompact,
  SessionRunningBrief,
} from "./types.js";

/** Maximum items per list to prevent unbounded growth. */
const CAPS = {
  consensus: 8,
  disagreements: 8,
  questions: 8,
  memoryCandidates: 10,
  docWriteCandidates: 10,
};

export interface BuildSessionBriefInput {
  previous?: SessionRunningBrief;
  roundCompact: CouncilRoundCompact;
  topic: string;
  latestUserIntent?: string;
  activeGoal?: string;
}

/**
 * Build or update a SessionRunningBrief from a round compact.
 *
 * If `previous` is provided, merges new data into it.
 * Otherwise creates a fresh brief.
 */
export function buildSessionRunningBrief(input: BuildSessionBriefInput): SessionRunningBrief {
  const { previous, roundCompact, topic, latestUserIntent, activeGoal } = input;

  // Build persona stances from this round's message compacts
  const newStances = roundCompact.messageCompacts.map(extractPersonaStance);

  if (!previous) {
    return {
      topic,
      activeGoal,
      latestUserIntent,
      currentConsensus: roundCompact.consensus.slice(0, CAPS.consensus),
      currentDisagreements: roundCompact.disagreements.slice(0, CAPS.disagreements),
      unresolvedQuestions: roundCompact.openQuestions.slice(0, CAPS.questions),
      personaStances: newStances,
      importantDecisions: [],
      memoryCandidates: roundCompact.memoryCandidates.slice(0, CAPS.memoryCandidates),
      docWriteCandidates: roundCompact.docWriteCandidates.slice(0, CAPS.docWriteCandidates),
      roundCount: 1,
      updatedAt: new Date().toISOString(),
    };
  }

  // Merge with previous brief
  const mergedStances = mergePersonaStances(previous.personaStances, newStances);

  return {
    sessionId: previous.sessionId,
    topic,
    activeGoal: activeGoal ?? previous.activeGoal,
    latestUserIntent: latestUserIntent ?? previous.latestUserIntent,
    currentConsensus: dedupeCap([...previous.currentConsensus, ...roundCompact.consensus], CAPS.consensus),
    currentDisagreements: dedupeCapInteractions(
      [...previous.currentDisagreements, ...roundCompact.disagreements],
      CAPS.disagreements,
    ),
    unresolvedQuestions: dedupeCap(
      [...previous.unresolvedQuestions, ...roundCompact.openQuestions],
      CAPS.questions,
    ),
    personaStances: mergedStances,
    importantDecisions: previous.importantDecisions,
    memoryCandidates: dedupeCap(
      [...previous.memoryCandidates, ...roundCompact.memoryCandidates],
      CAPS.memoryCandidates,
    ),
    docWriteCandidates: dedupeCap(
      [...previous.docWriteCandidates, ...roundCompact.docWriteCandidates],
      CAPS.docWriteCandidates,
    ),
    roundCount: previous.roundCount + 1,
    updatedAt: new Date().toISOString(),
  };
}

/** Extract a PersonaStanceCompact from a MessageCompact. */
function extractPersonaStance(compact: MessageCompact): PersonaStanceCompact {
  return {
    personaId: compact.speakerId,
    currentPosition: compact.summary,
    strongestClaim: compact.keyClaims[0],
    concerns: compact.risks,
    agreements: compact.agreements.map((a) => ({
      withPersonaId: a.with,
      point: a.point,
    })),
    disagreements: compact.disagreements.map((d) => ({
      withPersonaId: d.with,
      point: d.point,
    })),
  };
}

/**
 * Merge persona stances: latest stance wins for position/claim,
 * but concerns/agreements/disagreements are accumulated and deduped.
 */
function mergePersonaStances(
  previous: PersonaStanceCompact[],
  incoming: PersonaStanceCompact[],
): PersonaStanceCompact[] {
  const byId = new Map<string, PersonaStanceCompact>();

  // Add previous stances
  for (const s of previous) {
    byId.set(s.personaId, { ...s });
  }

  // Merge incoming (latest wins for position/claim)
  for (const s of incoming) {
    const existing = byId.get(s.personaId);
    if (!existing) {
      byId.set(s.personaId, { ...s });
      continue;
    }

    // Latest stance wins for position and strongest claim
    existing.currentPosition = s.currentPosition;
    existing.strongestClaim = s.strongestClaim ?? existing.strongestClaim;
    existing.changedMind = s.changedMind ?? existing.changedMind;

    // Accumulate and dedupe concerns
    existing.concerns = dedupeCap([...existing.concerns, ...s.concerns], 10);

    // Accumulate and dedupe interactions
    existing.agreements = dedupeCapInteractionsObj(
      [...existing.agreements, ...s.agreements],
      10,
    );
    existing.disagreements = dedupeCapInteractionsObj(
      [...existing.disagreements, ...s.disagreements],
      10,
    );
  }

  return [...byId.values()];
}

function dedupeCap(items: string[], cap: number): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const item of items) {
    const normalized = item.trim().toLowerCase();
    if (normalized && !seen.has(normalized)) {
      seen.add(normalized);
      result.push(item);
    }
  }
  return result.slice(0, cap);
}

function dedupeCapInteractions(
  items: Array<{ with: string; point: string }>,
  cap: number,
): Array<{ with: string; point: string }> {
  const seen = new Set<string>();
  const result: Array<{ with: string; point: string }> = [];
  for (const item of items) {
    const key = `${item.with}:${item.point}`.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      result.push(item);
    }
  }
  return result.slice(0, cap);
}

function dedupeCapInteractionsObj(
  items: Array<{ withPersonaId: string; point: string }>,
  cap: number,
): Array<{ withPersonaId: string; point: string }> {
  const seen = new Set<string>();
  const result: Array<{ withPersonaId: string; point: string }> = [];
  for (const item of items) {
    const key = `${item.withPersonaId}:${item.point}`.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      result.push(item);
    }
  }
  return result.slice(0, cap);
}
