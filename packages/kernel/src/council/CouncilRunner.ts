import type {
  CouncilRoom,
  CouncilMessage,
  RoleCard,
  RoleCallResult,
  ProviderErrorCode,
  MemoryCandidate,
  CouncilEvent,
} from "@agora/shared";
import type { LLMProvider } from "../types/index.js";
import { routeRoles, autoInviteLenses } from "../routing/RoleRouter.js";
import { buildContextPack, type ContextPack } from "../context/ContextPack.js";
import { buildModeratorContextPack, type ModeratorContextPack } from "../context/ModeratorContextPack.js";
import { buildRolePrompt, buildModeratorPrompt, buildCrossExaminationPrompt } from "../context/promptContracts.js";
import type { MemoryStore } from "../memory/MemoryStore.js";
import { extractMemories } from "../memory/MemoryExtractor.js";

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
export async function runCouncilRound(
  room: CouncilRoom,
  topic: string,
  userMessage: CouncilMessage,
  availableRoles: RoleCard[],
  llm: LLMProvider,
  recentMessages: CouncilMessage[] = [],
  docContents?: Map<string, string>,
  memoryStore?: MemoryStore,
  onEvent?: (event: CouncilEvent) => void,
): Promise<CouncilRunResult> {
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
  const analysis = await llm.callModerator({
    roomId: room.id,
    task: "analyze",
    context: analyzePrompt,
  });
  onEvent?.({ type: "moderator_done", message: {
    id: `msg_mod_analysis_${Date.now()}`, roomId: room.id, senderType: "moderator", senderId: "moderator",
    content: analysis, status: "ok", createdAt: new Date().toISOString(),
  }});

  // Step 3: Select roles (full context)
  const selectPrompt = buildModeratorPrompt("select_roles", modPack);
  const selectedRaw = await llm.callModerator({
    roomId: room.id,
    task: "select_roles",
    context: selectPrompt,
    availableRoles,
  });
  let selectedIds: string[];
  try {
    selectedIds = JSON.parse(selectedRaw);
  } catch {
    selectedIds = [];
  }

  const selectedRoles = selectedIds
    .map((id) => availableRoles.find((r) => r.id === id))
    .filter((r): r is RoleCard => r !== undefined);

  const roles =
    selectedRoles.length >= 2
      ? selectedRoles
      : routeRoles(availableRoles, topic, room.settings.roleCount);

  // Step 3.5: Auto-invite persona lenses matching the topic
  const finalRoles = autoInviteLenses(roles, availableRoles, topic);

  // Step 4: Each role responds independently — all called concurrently
  const roleMessages: CouncilMessage[] = [];
  const failedRoles: string[] = [];

  await Promise.all(finalRoles.map(async (role) => {
    const rolePrompt = buildRolePrompt(role, rolePack);
    onEvent?.({ type: "role_start", roleId: role.id });
    try {
      let result: RoleCallResult;
      if (onEvent && llm.callRoleStream) {
        result = await llm.callRoleStream(
          { roomId: room.id, role, sharedContext: rolePrompt, roomSummary: analysis, recentMessages: [...recentMessages, userMessage] },
          (delta, thinkingDelta) => { onEvent({ type: "role_chunk", roleId: role.id, delta, thinking: thinkingDelta }); },
        );
      } else {
        result = await llm.callRole({
          roomId: room.id, role, sharedContext: rolePrompt,
          roomSummary: analysis, recentMessages: [...recentMessages, userMessage],
        });
      }
      const msg: CouncilMessage = {
        id: `msg_${role.id}_${Date.now()}`,
        roomId: room.id,
        senderType: "role",
        senderId: role.id,
        content: result.content,
        thinking: result.thinking,
        status: "ok",
        createdAt: new Date().toISOString(),
      };
      roleMessages.push(msg);
      onEvent?.({ type: "role_done", roleId: role.id, message: msg });
    } catch (err: unknown) {
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
    }
  }));

  // Step 4.5: Cross-examination (roles challenge each other)
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
        const xPrompt = buildCrossExaminationPrompt(role, others);
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
  const summary = await llm.callModerator({
    roomId: room.id,
    task: "summarize",
    context: summaryPrompt,
    messages: [userMessage, ...roleMessages],
  });
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

  return {
    moderatorAnalysis: analysis,
    roleMessages,
    crossExaminationMessages,
    summary,
    roleContextPack: rolePack,
    moderatorContextPack: modPack,
    contextDebug,
    extractedMemories,
  };
}
