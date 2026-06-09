import type {
  RolePersona,
  CandidateRecallResult,
  ExplicitRoleRequest,
} from "@agora/shared";

export interface CandidateRecallInput {
  queryText: string;
  enabledDomainIds: string[];
  enabledFamilyIds: string[];
  personas: RolePersona[];
  previousSpeakerIds: Set<string>;
  explicitRequests: ExplicitRoleRequest[];
  suppressedPersonaIds?: Set<string>;
}

export function buildRetrievalDoc(persona: RolePersona): string {
  const parts = [
    `Role: ${persona.name}`,
    persona.domainId ? `Domain: ${persona.domainId}` : "",
    persona.familyId ? `Family: ${persona.familyId}` : "",
    `Mission: ${persona.mission}`,
    persona.whenToUse.length > 0 ? `When to use:\n- ${persona.whenToUse.join("\n- ")}` : "",
    persona.capabilities.length > 0 ? `Capabilities:\n- ${persona.capabilities.join("\n- ")}` : "",
    persona.exampleQueries.length > 0 ? `Example queries:\n- ${persona.exampleQueries.join("\n- ")}` : "",
  ];
  return parts.filter(Boolean).join("\n");
}

function tokenize(text: string): Set<string> {
  const tokens = text
    .toLowerCase()
    // preserve Chinese character sequences as tokens
    .replace(/[\u4e00-\u9fff]+/g, (m) => ` ${m} `)
    // split non-Chinese by word boundaries
    .replace(/[^\w\u4e00-\u9fff]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter((t) => t.length >= 2);
  return new Set(tokens);
}

function textSimilarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let overlap = 0;
  for (const token of a) {
    if (b.has(token)) overlap++;
  }
  return overlap / Math.max(a.size, b.size);
}

function explicitBoost(persona: RolePersona, requests: ExplicitRoleRequest[]): number {
  let boost = 0;
  for (const req of requests) {
    if (req.targetType === "persona" && req.targetId === persona.id) {
      boost = Math.max(boost, req.confidence);
    }
    if (req.targetType === "family" && req.targetId === persona.familyId) {
      boost = Math.max(boost, req.confidence * 0.8);
    }
    if (req.targetType === "domain" && req.targetId === persona.domainId) {
      boost = Math.max(boost, req.confidence * 0.6);
    }
  }
  return boost;
}

export function scoreCandidate(
  persona: RolePersona,
  queryText: string,
  input: CandidateRecallInput,
): CandidateRecallResult {
  const queryTokens = tokenize(queryText);
  const retrievalDoc = buildRetrievalDoc(persona);
  const docTokens = tokenize(retrievalDoc);

  const retrievalDocSimilarity = textSimilarity(queryTokens, docTokens);

  const capabilityTokens = new Set(tokenize(persona.capabilities.join(" ")));
  const capabilityMatch = textSimilarity(queryTokens, capabilityTokens);

  const exampleTokens = new Set(tokenize(persona.exampleQueries.join(" ")));
  const exampleQueryMatch = textSimilarity(queryTokens, exampleTokens);

  const tagTokens = new Set(persona.tags.map((t) => t.toLowerCase()));
  const tagOverlap = textSimilarity(queryTokens, tagTokens);

  const explicitRequestBoost = explicitBoost(persona, input.explicitRequests);

  const diversityBonus = input.previousSpeakerIds.has(persona.id) ? 0 : 0.05;
  const recencyPenalty = input.previousSpeakerIds.has(persona.id) ? 0.15 : 0;
  const alreadySpokenPenalty = input.previousSpeakerIds.has(persona.id) ? 0.20 : 0;

  const raw =
    retrievalDocSimilarity * 0.45 +
    capabilityMatch * 0.20 +
    exampleQueryMatch * 0.15 +
    tagOverlap * 0.10 +
    explicitRequestBoost * 0.30 +
    diversityBonus -
    recencyPenalty -
    alreadySpokenPenalty;

  const localScore = Math.max(0, Math.min(1, raw));

  const matchedSignals: string[] = [];
  if (retrievalDocSimilarity > 0.1) matchedSignals.push("retrieval_doc");
  if (capabilityMatch > 0.1) matchedSignals.push("capability");
  if (exampleQueryMatch > 0.1) matchedSignals.push("example_query");
  if (tagOverlap > 0.1) matchedSignals.push("tag");
  if (explicitRequestBoost > 0) matchedSignals.push("explicit_request");

  return {
    personaId: persona.id,
    metadataScore: raw,
    localScore,
    matchedSignals,
  };
}

export function recallCandidates(input: CandidateRecallInput): CandidateRecallResult[] {
  const { personas, queryText, enabledDomainIds, enabledFamilyIds, suppressedPersonaIds } = input;

  // Filter by enabled domains/families
  const enabledDomainSet = new Set(enabledDomainIds);
  const enabledFamilySet = new Set(enabledFamilyIds);
  const useAllDomains = enabledDomainIds.length === 0;
  const useAllFamilies = enabledFamilyIds.length === 0;

  const eligible = personas.filter((p) => {
    if (suppressedPersonaIds?.has(p.id)) return false;
    if (!useAllDomains && !enabledDomainSet.has(p.domainId)) return false;
    if (!useAllFamilies && !enabledFamilySet.has(p.familyId)) return false;
    return true;
  });

  return eligible
    .map((p) => scoreCandidate(p, queryText, input))
    .sort((a, b) => b.localScore - a.localScore);
}
