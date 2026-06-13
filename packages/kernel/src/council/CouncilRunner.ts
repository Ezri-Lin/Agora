import type {
  CouncilMessage,
  RoleCard,
  RoleRoutingDecision,
} from "@agora/shared";
import { normalizeCouncilRoleSettings, toRoleRoutingSettings } from "@agora/shared";
import type { LLMProvider } from "../types/index.js";
import { routeRolesLocal } from "../routing/routeRoles.js";
import { buildContextPack } from "../context/ContextPack.js";
import { buildModeratorContextPack } from "../context/ModeratorContextPack.js";
import { retrieveAndCompileContext } from "../context/retrieveAndCompileContext.js";
import { buildModeratorPrompt } from "../context/promptContracts.js";
import { buildRoundCompact } from "../compact/buildRoundCompact.js";
import { formatCompactsForPrompt } from "../compact/formatCompactsForPrompt.js";
import { formatSessionBriefForPrompt } from "../compact/formatSessionBriefForPrompt.js";
import { buildSessionRunningBrief } from "../compact/buildSessionRunningBrief.js";
import type { MemoryStore } from "../memory/MemoryStore.js";
import { extractMemories } from "../memory/MemoryExtractor.js";
import type { CouncilRunResult, RunCouncilRoundInput } from "./councilTypes.js";
import { stopRole, runRolePhase } from "./runRolePhase.js";
import { runCrossExam } from "./runCrossExam.js";

export { stopRole } from "./runRolePhase.js";
export type { CouncilRunResult, RunCouncilRoundInput, ContextDebug } from "./councilTypes.js";

export async function runCouncilRound(input: RunCouncilRoundInput): Promise<CouncilRunResult> {
  const {
    room, topic, userMessage, availableRoles, llm,
    recentMessages = [], docContents, memoryStore,
    onEvent, roleSettings, explicitRoleRequests,
    getContractForRole, retrievalEngine, retrievalQuery, contextPackage: explicitContextPackage,
    sessionRunningBrief: inputSessionBrief, selectedRoleIds,
  } = input;
  const effectiveSettings = normalizeCouncilRoleSettings(roleSettings);
  const roundId = `round_${room.id}_${Date.now()}`;

  // Step 0: Resolve context package
  let effectiveContextPackage = explicitContextPackage;
  if (!effectiveContextPackage && retrievalEngine) {
    effectiveContextPackage = await retrieveAndCompileContext({
      task: topic, query: retrievalQuery ?? topic, retrievalEngine, mode: "synthesize", limit: 6,
    }) ?? undefined;
  }

  // Step 0.5: Inject memories
  const effectiveDocContents = new Map(docContents ?? new Map<string, string>());
  if (memoryStore) {
    const topicWords = topic.toLowerCase().split(/\s+/).filter((w) => w.length > 3);
    const memories = await memoryStore.loadByTags(topicWords);
    for (const mem of memories) {
      const key = `memory:${mem.id}`;
      if (!effectiveDocContents.has(key)) {
        effectiveDocContents.set(key, `[Memory — ${mem.scope}]\n${mem.content}`);
      }
    }
  }

  // Step 1: Build dual context packs
  const modPack = buildModeratorContextPack(room, topic, [...recentMessages, userMessage], effectiveDocContents);
  const rolePack = buildContextPack(room, topic, [...recentMessages, userMessage], effectiveDocContents);

  // Step 2: Moderator analyzes
  const analyzePrompt = buildModeratorPrompt("analyze", modPack);
  const analysisResult = await llm.callModerator({ roomId: room.id, task: "analyze", context: analyzePrompt });
  const analysis = analysisResult.content;
  onEvent?.({ type: "moderator_done", message: {
    id: `msg_mod_analysis_${Date.now()}`, roomId: room.id, senderType: "moderator", senderId: "moderator",
    content: analysis, thinking: analysisResult.thinking, status: "ok", createdAt: new Date().toISOString(),
  }});

  // Step 3: Select roles
  const { routingDecision, finalRoles } = await selectRolesForRound({
    selectedRoleIds, availableRoles, topic, effectiveSettings, recentMessages, explicitRoleRequests, room, llm, modPack,
  });

  // Step 4: Role responses
  const { roleMessages, failedRoles, messageCompacts } = await runRolePhase({
    finalRoles, roundId, room, topic, userMessage, recentMessages, analysis, rolePack, llm, onEvent,
    getContractForRole, contextPackage: effectiveContextPackage, sessionRunningBrief: inputSessionBrief,
  });

  // Step 4.5: Build round compact
  const roundCompact = buildRoundCompact({
    roundId, userQuestion: userMessage.content, moderatorFraming: undefined,
    selectedPersonas: finalRoles.map((r) => r.id), messageCompacts,
  });

  // Step 4.6: Cross-examination
  const crossExaminationMessages = await runCrossExam({
    finalRoles, roleMessages, failedRoles, messageCompacts, room, recentMessages, userMessage, llm,
  });

  // Step 5: Moderator summarizes
  const summary = await buildSummary({
    modPack, roleMessages, crossExaminationMessages, messageCompacts, inputSessionBrief, room, userMessage, llm, onEvent,
  });

  // Step 6: Extract memories
  const extractedMemories = await extractMemoriesFromRound({ memoryStore, llm, room, topic, summary });

  // Build context debug + session brief
  const contextDebug = {
    moderatorHasOverflow: modPack.meta.hasOverflow,
    moderatorOverflowDocs: modPack.meta.overflowDocs,
    moderatorIncludedDocCount: modPack.meta.selectedDocCount,
    moderatorTotalChars: modPack.meta.totalSelectedChars,
    roleContextMode: rolePack.meta.mode,
    roleTruncatedDocs: rolePack.meta.truncatedDocs,
    roleTotalChars: rolePack.meta.totalUsedChars,
    roleDocCount: rolePack.meta.docCount,
  };

  const sessionRunningBrief = buildSessionRunningBrief({
    previous: inputSessionBrief, roundCompact, topic, latestUserIntent: userMessage.content,
  });

  return {
    moderatorAnalysis: analysis, roleMessages, crossExaminationMessages, summary,
    roleContextPack: rolePack, moderatorContextPack: modPack, contextDebug,
    extractedMemories, routingDecision, messageCompacts, roundCompact, sessionRunningBrief,
  };
}

// ── Helpers ──

async function selectRolesForRound(input: {
  selectedRoleIds?: string[];
  availableRoles: RoleCard[];
  topic: string;
  effectiveSettings: any;
  recentMessages: CouncilMessage[];
  explicitRoleRequests?: any[];
  room: { id: string };
  llm: LLMProvider;
  modPack: any;
}): Promise<{ routingDecision: RoleRoutingDecision; finalRoles: RoleCard[] }> {
  const { selectedRoleIds, availableRoles, topic, effectiveSettings, recentMessages, explicitRoleRequests, room, llm, modPack } = input;

  if (selectedRoleIds !== undefined) {
    const finalRoles = selectedRoleIds
      .map((id) => availableRoles.find((r) => r.id === id))
      .filter((r): r is RoleCard => r !== undefined);
    return {
      routingDecision: {
        intent: "continue_discussion", participationPolicy: "all_selected",
        activeEntrants: finalRoles.map((r) => ({ roleId: r.id, name: r.name, subtitle: r.subtitle, source: "manual" as const })),
        silentExistingRoles: [], suggestedPerspectives: [], scores: [],
      },
      finalRoles,
    };
  }

  const selectPrompt = buildModeratorPrompt("select_roles", modPack);
  const selectResult = await llm.callModerator({ roomId: room.id, task: "select_roles", context: selectPrompt, availableRoles });
  let selectedIds: string[];
  try { selectedIds = JSON.parse(selectResult.content); } catch { selectedIds = []; }

  const selectedRoles = selectedIds
    .map((id) => availableRoles.find((r) => r.id === id))
    .filter((r): r is RoleCard => r !== undefined);

  const routingSettings = toRoleRoutingSettings(effectiveSettings);
  const routingDecision = routeRolesLocal(
    selectedRoles.length >= 2 ? selectedRoles : availableRoles, topic, routingSettings,
    { previousSpeakerIds: recentMessages.filter((m) => m.senderType === "role").map((m) => m.senderId), existingActiveRoleIds: availableRoles.map((r) => r.id), explicitRoleRequests },
  );

  const allSelectedRoles = routingDecision.activeEntrants
    .map((sr) => availableRoles.find((r) => r.id === sr.roleId))
    .filter((r): r is RoleCard => r !== undefined);

  const isNewEntrantsOnly = routingDecision.participationPolicy === "new_entrants_only";
  const newEntrantIds = new Set(routingDecision.activeEntrants.filter((r) => r.source !== "existing_role_card").map((r) => r.roleId));
  const finalRoles = isNewEntrantsOnly ? allSelectedRoles.filter((r) => newEntrantIds.has(r.id)) : allSelectedRoles;

  return { routingDecision, finalRoles };
}

async function buildSummary(input: {
  modPack: any; roleMessages: CouncilMessage[]; crossExaminationMessages: CouncilMessage[];
  messageCompacts: any[]; inputSessionBrief: any; room: { id: string };
  userMessage: CouncilMessage; llm: LLMProvider; onEvent?: (event: any) => void;
}): Promise<string> {
  const { modPack, roleMessages, crossExaminationMessages, messageCompacts, inputSessionBrief, room, userMessage, llm, onEvent } = input;

  const okResponses = roleMessages.filter((m) => m.status !== "error");
  const errorResponses = roleMessages.filter((m) => m.status === "error");

  const summaryLines = [modPack.sharedPrefix, "", "## Role Responses", "", ...okResponses.map((m) => `### [${m.senderId}]\n${m.content}`)];

  if (inputSessionBrief) {
    const briefText = formatSessionBriefForPrompt(inputSessionBrief);
    if (briefText) summaryLines.push("", briefText);
  }

  const compactSummaryForMod = formatCompactsForPrompt(messageCompacts);
  if (compactSummaryForMod) summaryLines.push("", compactSummaryForMod);

  if (crossExaminationMessages.length > 0) {
    summaryLines.push("", "## Cross-Examination", "", ...crossExaminationMessages.map((m) => `### [${m.senderId}] challenges\n${m.content}`));
  }

  if (errorResponses.length > 0) {
    summaryLines.push("", "## Failed Roles (not included as opinions)", "",
      ...errorResponses.map((m) => `- ${m.targetRoleId}: ${m.errorCode} — ${m.errorMessage}`), "",
      "Note: The above roles failed to respond. Do not treat their errors as opinions.",
      "Base your summary only on successful role responses.",
    );
  }

  const summaryModPack = { ...modPack, sharedPrefix: summaryLines.join("\n") };
  const summaryPrompt = buildModeratorPrompt("summarize", summaryModPack);
  const summaryResult = await llm.callModerator({ roomId: room.id, task: "summarize", context: summaryPrompt, messages: [userMessage, ...roleMessages] });
  onEvent?.({ type: "summary_done", content: summaryResult.content });
  return summaryResult.content;
}

async function extractMemoriesFromRound(input: {
  memoryStore?: MemoryStore; llm: LLMProvider; room: { id: string }; topic: string; summary: string;
}) {
  const { memoryStore, llm, room, topic, summary } = input;
  if (!memoryStore) return [];
  try {
    const insights = await extractMemories(llm, room.id, topic, summary);
    const saved = [];
    for (const insight of insights) {
      saved.push(await memoryStore.save({ roomId: room.id, scope: insight.scope, domains: insight.domains, tags: insight.tags, content: insight.content, confidence: 0.7 }));
    }
    return saved;
  } catch {
    return [];
  }
}
