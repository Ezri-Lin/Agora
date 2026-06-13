import type {
  CouncilRoom,
  CouncilMessage,
  RoleCard,
  RoleCallResult,
  ProviderErrorCode,
  MemoryCandidate,
  CouncilEvent,
  CouncilRoleSettings,
  ExplicitRoleRequest,
  RoleRoutingDecision,
  PersonaContract,
} from "@agora/shared";
import { extractGraphSummary, firstMeaningfulSentence, normalizeCouncilRoleSettings } from "@agora/shared";
import type { LLMProvider } from "../types/index.js";
import { selectRoles } from "../routing/RoleRouter.js";
import { routeRolesLocal } from "../routing/routeRoles.js";
import { toRoleRoutingSettings } from "@agora/shared";
import { buildContextPack, type ContextPack } from "../context/ContextPack.js";
import { buildModeratorContextPack, type ModeratorContextPack } from "../context/ModeratorContextPack.js";
import type { RetrievalEngine } from "../context/types.js";
import type { ContextPackage } from "../context/ContextCompiler.js";
import { retrieveAndCompileContext } from "../context/retrieveAndCompileContext.js";
import { buildRolePrompt, buildModeratorPrompt, buildCrossExaminationPrompt } from "../context/promptContracts.js";
import { compilePersonaPrompt } from "../prompt/compilePersonaPrompt.js";
import { parseTailCompact } from "../compact/parseTailCompact.js";
import { buildRoundCompact } from "../compact/buildRoundCompact.js";
import { formatCompactsForPrompt } from "../compact/formatCompactsForPrompt.js";
import { buildSessionRunningBrief } from "../compact/buildSessionRunningBrief.js";
import { formatSessionBriefForPrompt } from "../compact/formatSessionBriefForPrompt.js";
import type { MessageCompact, CouncilRoundCompact, SessionRunningBrief } from "../compact/types.js";
import type { MemoryStore } from "../memory/MemoryStore.js";
import { extractMemories } from "../memory/MemoryExtractor.js";

// Module-level abort controllers — keyed by `${roundId}_${roleId}`
const roleAbortControllers = new Map<string, AbortController>();

/** Stop a running role by roundId + roleId. No-op if not found. */
export function stopRole(roundId: string, roleId: string): void {
  const key = `${roundId}_${roleId}`;
  const controller = roleAbortControllers.get(key);
  if (controller) {
    controller.abort();
    roleAbortControllers.delete(key);
  }
}

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
  /** Optional resolver to look up a PersonaContract by role ID. Enables PromptCompiler integration. */
  getContractForRole?: (roleId: string) => PersonaContract | undefined;
  /** Optional retrieval engine for dynamic document context. */
  retrievalEngine?: RetrievalEngine;
  /** Query string for retrieval. Defaults to topic if not provided. */
  retrievalQuery?: string;
  /** Pre-compiled context package. Takes precedence over retrievalEngine. */
  contextPackage?: ContextPackage;
  /** Session running brief from prior rounds. Injected into moderator + persona prompts. */
  sessionRunningBrief?: SessionRunningBrief;
  /**
   * Explicit role IDs to use for this round, overriding routing decision.
   * When provided, skips moderator role selection and uses these roles directly.
   * Empty array → no role fan-out, moderator-only response.
   */
  selectedRoleIds?: string[];
}

/**
 * Run a full council round with dual-layer context:
 *
 * 1. Inject relevant memories into context
 * 2. Build ModeratorContextPack (full selected docs) — moderator is full-context reader
 * 3. Build RoleContextPack (budgeted excerpts) — roles are budgeted-context participants
 * 4. Moderator analyzes scene (full context)
 * 5. Select roles (full context) + auto-invite matching persona lenses
 * 6. Each role responds independently (budgeted context, multi-call)
 * 7. Moderator summarizes (full context + role responses)
 * 8. Extract memory candidates from the discussion
 */
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

  // Step 0.5: Resolve context package (explicit > retrieval > fallback)
  let effectiveContextPackage: ContextPackage | undefined = explicitContextPackage;
  if (!effectiveContextPackage && retrievalEngine) {
    effectiveContextPackage = await retrieveAndCompileContext({
      task: topic,
      query: retrievalQuery ?? topic,
      retrievalEngine,
      mode: "synthesize",
      limit: 6,
    }) ?? undefined;
  }
  // Step 0: Inject relevant memories into docContents
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

  // Step 2: Moderator analyzes (full context)
  const analyzePrompt = buildModeratorPrompt("analyze", modPack);
  const analysisResult = await llm.callModerator({
    roomId: room.id,
    task: "analyze",
    context: analyzePrompt,
  });
  const analysis = analysisResult.content;
  onEvent?.({ type: "moderator_done", message: {
    id: `msg_mod_analysis_${Date.now()}`, roomId: room.id, senderType: "moderator", senderId: "moderator",
    content: analysis, thinking: analysisResult.thinking, status: "ok", createdAt: new Date().toISOString(),
  }});

  // Step 3: Select roles — use explicit selectedRoleIds or moderator + routing
  let routingDecision: import("@agora/shared").RoleRoutingDecision;
  let finalRoles: RoleCard[];

  if (selectedRoleIds !== undefined) {
    // Explicit role IDs from dispatch preview — skip moderator selection
    finalRoles = selectedRoleIds
      .map((id) => availableRoles.find((r) => r.id === id))
      .filter((r): r is RoleCard => r !== undefined);

    // Build a minimal routing decision for downstream consumers
    routingDecision = {
      intent: "continue_discussion",
      participationPolicy: "all_selected",
      activeEntrants: finalRoles.map((r) => ({
        roleId: r.id,
        name: r.name,
        subtitle: r.subtitle,
        source: "manual" as const,
      })),
      silentExistingRoles: [],
      suggestedPerspectives: [],
      scores: [],
    };
  } else {
    // Original flow: moderator selects roles, then route
    const selectPrompt = buildModeratorPrompt("select_roles", modPack);
    const selectResult = await llm.callModerator({
      roomId: room.id,
      task: "select_roles",
      context: selectPrompt,
      availableRoles,
    });
    let selectedIds: string[];
    try {
      selectedIds = JSON.parse(selectResult.content);
    } catch {
      selectedIds = [];
    }

    const selectedRoles = selectedIds
      .map((id) => availableRoles.find((r) => r.id === id))
      .filter((r): r is RoleCard => r !== undefined);

    const routingSettings = toRoleRoutingSettings(effectiveSettings);
    routingDecision = routeRolesLocal(
      selectedRoles.length >= 2 ? selectedRoles : availableRoles,
      topic,
      routingSettings,
      {
        previousSpeakerIds: recentMessages
          .filter((m) => m.senderType === "role")
          .map((m) => m.senderId),
        existingActiveRoleIds: availableRoles.map((r) => r.id),
        explicitRoleRequests,
      },
    );

    // Map routing decision back to RoleCard for downstream use
    const allSelectedRoles = routingDecision.activeEntrants
      .map((sr) => availableRoles.find((r) => r.id === sr.roleId))
      .filter((r): r is RoleCard => r !== undefined);

    // Respect participation policy
    const isNewEntrantsOnly = routingDecision.participationPolicy === "new_entrants_only";
    const newEntrantIds = new Set(
      routingDecision.activeEntrants
        .filter((r) => r.source !== "existing_role_card")
        .map((r) => r.roleId),
    );

    finalRoles = isNewEntrantsOnly
      ? allSelectedRoles.filter((r) => newEntrantIds.has(r.id))
      : allSelectedRoles;
  }

  // Step 4: Each role responds independently — all called concurrently with per-role abort
  const roleMessages: CouncilMessage[] = [];
  const failedRoles: string[] = [];
  const messageCompacts: MessageCompact[] = [];

  // Register abort controllers for each role
  for (const role of finalRoles) {
    const key = `${roundId}_${role.id}`;
    roleAbortControllers.set(key, new AbortController());
  }

  const roleResults = await Promise.allSettled(finalRoles.map(async (role) => {
    const key = `${roundId}_${role.id}`;
    const controller = roleAbortControllers.get(key);
    const signal = controller?.signal;

    // Use PersonaContract-aware prompt if available, else fall back to legacy
    const contract = getContractForRole?.(role.id);
    const sessionBriefText = inputSessionBrief
      ? formatSessionBriefForPrompt(inputSessionBrief)
      : undefined;
    const rolePrompt = contract
      ? compilePersonaPrompt({
          personaContract: contract,
          phase: "opening",
          roomContext: {
            topic,
            userMessage: userMessage.content,
            participants: finalRoles.map((r) => ({ id: r.id, name: r.name })),
          },
          contextPackage: effectiveContextPackage,
          existingContext: sessionBriefText || undefined,
        }).promptText
      : buildRolePrompt(role, rolePack);
    onEvent?.({ type: "role_start", roleId: role.id, roundId });

    // Track partial content for abort case
    let partialContent = "";
    let partialThinking = "";

    try {
      let result: RoleCallResult;
      const input = {
        roomId: room.id, role, sharedContext: rolePrompt,
        roomSummary: analysis, recentMessages: [...recentMessages, userMessage],
      };

      if (onEvent && llm.callRoleStream) {
        result = await llm.callRoleStream(
          input,
          (delta, thinkingDelta) => {
            partialContent += delta ?? "";
            partialThinking += thinkingDelta ?? "";
            onEvent({ type: "role_chunk", roleId: role.id, delta, thinking: thinkingDelta });
          },
          signal,
        );
      } else {
        result = await llm.callRole(input, signal);
        partialContent = result.content;
        partialThinking = result.thinking ?? "";
      }

      // Extract graph summary with shared fallback
      const parsedSummary = extractGraphSummary(result.content);
      const graphSummary = parsedSummary ?? firstMeaningfulSentence(result.content) ?? undefined;
      const cleanContent = parsedSummary
        ? result.content.replace(/<!--\s*summary:\s*.+?\s*-->/, "").trim()
        : result.content;

      // Parse tail compact block (strip from visible content)
      const compactResult = parseTailCompact({
        content: cleanContent,
        messageId: `msg_${role.id}_${Date.now()}`,
        speakerId: role.id,
        phase: "opening",
      });
      const visibleContent = compactResult.visibleContent;
      if (compactResult.compact) {
        messageCompacts.push(compactResult.compact);
      }

      const msg: CouncilMessage = {
        id: `msg_${role.id}_${Date.now()}`,
        roomId: room.id,
        senderType: "role",
        senderId: role.id,
        content: visibleContent,
        thinking: result.thinking,
        graphSummary,
        toolCalls: result.toolCalls,
        status: "ok",
        createdAt: new Date().toISOString(),
      };
      roleMessages.push(msg);
      onEvent?.({ type: "role_done", roleId: role.id, roundId, message: msg });
    } catch (err: unknown) {
      // Handle abort — emit role_stopped, not an error
      if (err instanceof Error && err.name === "AbortError") {
        const partialSummary = extractGraphSummary(partialContent)
          ?? firstMeaningfulSentence(partialContent)
          ?? undefined;
        onEvent?.({
          type: "role_stopped",
          roleId: role.id,
          roundId,
          partialContent,
          graphSummary: partialSummary,
        });
        return;
      }

      const errMsg = err instanceof Error ? err.message : String(err);
      const code: ProviderErrorCode =
        errMsg.startsWith("missing_api_key") ? "missing_api_key" :
        errMsg.startsWith("invalid_api_key") ? "invalid_api_key" :
        errMsg.startsWith("rate_limited") ? "rate_limited" :
        errMsg.startsWith("model_not_found") ? "model_not_found" :
        errMsg.startsWith("network_error") ? "network_error" :
        errMsg.startsWith("timeout") ? "timeout" :
        errMsg.startsWith("empty_response") ? "empty_response" :
        "unknown";

      failedRoles.push(role.id);
      roleMessages.push({
        id: `msg_err_${role.id}_${Date.now()}`,
        roomId: room.id,
        senderType: "system",
        senderId: "provider",
        content: `${role.name} failed: ${errMsg}`,
        status: "error",
        errorCode: code,
        errorMessage: errMsg,
        targetRoleId: role.id,
        createdAt: new Date().toISOString(),
      });
    } finally {
      roleAbortControllers.delete(key);
    }
  }));

  // Step 4.5: Build round compact from message compacts
  const roundCompact = buildRoundCompact({
    roundId,
    userQuestion: userMessage.content,
    moderatorFraming: undefined,
    selectedPersonas: finalRoles.map((r) => r.id),
    messageCompacts,
  });

  // Step 4.6: Cross-examination (roles challenge each other)
  const crossExaminationMessages: CouncilMessage[] = [];
  if (room.settings.allowCrossExamination) {
    const okResponsesForX = roleMessages.filter((m) => m.status !== "error");
    if (okResponsesForX.length >= 2) {
      for (const role of finalRoles) {
        if (failedRoles.includes(role.id)) continue;
        const others = okResponsesForX
          .filter((m) => m.senderId !== role.id)
          .map((m) => {
            const otherRole = finalRoles.find((r) => r.id === m.senderId);
            return { roleId: m.senderId, roleName: otherRole?.name ?? m.senderId, content: m.content };
          });
        if (others.length === 0) continue;
        const compactSummary = formatCompactsForPrompt(messageCompacts);
        const xPrompt = buildCrossExaminationPrompt(role, others)
          + (compactSummary ? "\n\n" + compactSummary : "");
        try {
          const xResult = await llm.callRole({
            roomId: room.id,
            role,
            sharedContext: xPrompt,
            roomSummary: "Cross-examination phase: challenge or question other roles' responses.",
            recentMessages: [...recentMessages, userMessage, ...roleMessages],
          });
          crossExaminationMessages.push({
            id: `msg_x_${role.id}_${Date.now()}`,
            roomId: room.id,
            senderType: "role",
            senderId: role.id,
            content: xResult.content,
            status: "ok",
            createdAt: new Date().toISOString(),
          });
        } catch {
          // Cross-examination failure is non-fatal
        }
      }
    }
  }

  // Step 5: Moderator summarizes (full context + all role responses)
  const okResponses = roleMessages.filter((m) => m.status !== "error");
  const errorResponses = roleMessages.filter((m) => m.status === "error");

  const summaryLines = [
    modPack.sharedPrefix,
    "",
    "## Role Responses",
    "",
    ...okResponses.map((m) => `### [${m.senderId}]\n${m.content}`),
  ];

  // Inject session brief for moderator synthesis (from prior rounds)
  if (inputSessionBrief) {
    const briefText = formatSessionBriefForPrompt(inputSessionBrief);
    if (briefText) summaryLines.push("", briefText);
  }

  // Inject compact summary for moderator synthesis
  const compactSummaryForMod = formatCompactsForPrompt(messageCompacts);
  if (compactSummaryForMod) {
    summaryLines.push("", compactSummaryForMod);
  }

  if (crossExaminationMessages.length > 0) {
    summaryLines.push(
      "",
      "## Cross-Examination",
      "",
      ...crossExaminationMessages.map((m) => `### [${m.senderId}] challenges\n${m.content}`),
    );
  }

  if (errorResponses.length > 0) {
    summaryLines.push(
      "",
      "## Failed Roles (not included as opinions)",
      "",
      ...errorResponses.map((m) => `- ${m.targetRoleId}: ${m.errorCode} — ${m.errorMessage}`),
      "",
      "Note: The above roles failed to respond. Do not treat their errors as opinions.",
      "Base your summary only on successful role responses.",
    );
  }

  const summaryModPack: ModeratorContextPack = {
    ...modPack,
    sharedPrefix: summaryLines.join("\n"),
  };
  const summaryPrompt = buildModeratorPrompt("summarize", summaryModPack);
  const summaryResult = await llm.callModerator({
    roomId: room.id,
    task: "summarize",
    context: summaryPrompt,
    messages: [userMessage, ...roleMessages],
  });
  const summary = summaryResult.content;
  onEvent?.({ type: "summary_done", content: summary });

  // Step 6: Extract memory candidates
  let extractedMemories: MemoryCandidate[] = [];
  if (memoryStore) {
    try {
      const insights = await extractMemories(llm, room.id, topic, summary);
      for (const insight of insights) {
        const saved = await memoryStore.save({
          roomId: room.id,
          scope: insight.scope,
          domains: insight.domains,
          tags: insight.tags,
          content: insight.content,
          confidence: 0.7,
        });
        extractedMemories.push(saved);
      }
    } catch {
      // Memory extraction failure should not break the council round
    }
  }

  const contextDebug: ContextDebug = {
    moderatorHasOverflow: modPack.meta.hasOverflow,
    moderatorOverflowDocs: modPack.meta.overflowDocs,
    moderatorIncludedDocCount: modPack.meta.selectedDocCount,
    moderatorTotalChars: modPack.meta.totalSelectedChars,
    roleContextMode: rolePack.meta.mode,
    roleTruncatedDocs: rolePack.meta.truncatedDocs,
    roleTotalChars: rolePack.meta.totalUsedChars,
    roleDocCount: rolePack.meta.docCount,
  };

  // Build updated session running brief
  const sessionRunningBrief = buildSessionRunningBrief({
    previous: inputSessionBrief,
    roundCompact,
    topic,
    latestUserIntent: userMessage.content,
  });

  return {
    moderatorAnalysis: analysis,
    roleMessages,
    crossExaminationMessages,
    summary,
    roleContextPack: rolePack,
    moderatorContextPack: modPack,
    contextDebug,
    extractedMemories,
    routingDecision,
    messageCompacts,
    roundCompact,
    sessionRunningBrief,
  };
}
