import type {
  CouncilRoom,
  CouncilMessage,
  RoleCard,
  ProviderErrorCode,
} from "@agora/shared";
import type { LLMProvider } from "../types/index.js";
import { Moderator } from "../moderator/Moderator.js";
import { routeRoles } from "../routing/RoleRouter.js";
import { buildContextPack, type ContextPack } from "../context/ContextPack.js";
import { buildModeratorContextPack, type ModeratorContextPack } from "../context/ModeratorContextPack.js";
import { buildRolePrompt, buildModeratorPrompt } from "../context/promptContracts.js";

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
  summary: string;
  roleContextPack: ContextPack;
  moderatorContextPack: ModeratorContextPack;
  contextDebug: ContextDebug;
}

/**
 * Run a full council round with dual-layer context:
 *
 * 1. Build ModeratorContextPack (full selected docs) — moderator is full-context reader
 * 2. Build RoleContextPack (budgeted excerpts) — roles are budgeted-context participants
 * 3. Moderator analyzes scene (full context)
 * 4. Select roles (full context)
 * 5. Each role responds independently (budgeted context, multi-call)
 * 6. Moderator summarizes (full context + role responses)
 */
export async function runCouncilRound(
  room: CouncilRoom,
  topic: string,
  userMessage: CouncilMessage,
  availableRoles: RoleCard[],
  llm: LLMProvider,
  recentMessages: CouncilMessage[] = [],
  docContents?: Map<string, string>,
): Promise<CouncilRunResult> {
  // Step 1: Build dual context packs
  const modPack = buildModeratorContextPack(room, topic, [...recentMessages, userMessage], docContents);
  const rolePack = buildContextPack(room, topic, [...recentMessages, userMessage], docContents);

  // Step 2: Moderator analyzes (full context)
  const analyzePrompt = buildModeratorPrompt("analyze", modPack);
  const analysis = await llm.callModerator({
    roomId: room.id,
    task: "analyze",
    context: analyzePrompt,
  });

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

  // Step 4: Each role responds independently (budgeted context, multi-call)
  const roleMessages: CouncilMessage[] = [];
  const failedRoles: string[] = [];
  for (const role of roles) {
    const rolePrompt = buildRolePrompt(role, rolePack);
    try {
      const result = await llm.callRole({
        roomId: room.id,
        role,
        sharedContext: rolePrompt,
        roomSummary: analysis,
        recentMessages: [...recentMessages, userMessage],
      });
      roleMessages.push({
        id: `msg_${role.id}_${Date.now()}`,
        roomId: room.id,
        senderType: "role",
        senderId: role.id,
        content: result.content,
        status: "ok",
        createdAt: new Date().toISOString(),
      });
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
    summary,
    roleContextPack: rolePack,
    moderatorContextPack: modPack,
    contextDebug,
  };
}
