import type {
  CouncilMessage,
  RoleCard,
  CouncilEvent,
  ProviderErrorCode,
} from "@agora/shared";
import { extractGraphSummary, firstMeaningfulSentence } from "@agora/shared";
import type { LLMProvider } from "../types/index.js";
import type { ContextPack } from "../context/ContextPack.js";
import { buildRolePrompt } from "../context/promptContracts.js";
import { compilePersonaPrompt } from "../prompt/compilePersonaPrompt.js";
import { parseTailCompact } from "../compact/parseTailCompact.js";
import { formatSessionBriefForPrompt } from "../compact/formatSessionBriefForPrompt.js";
import type { MessageCompact, SessionRunningBrief } from "../compact/types.js";
import type { PersonaContract } from "@agora/shared";
import type { ContextPackage } from "../context/ContextCompiler.js";

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

interface RunRolePhaseInput {
  finalRoles: RoleCard[];
  roundId: string;
  room: { id: string };
  topic: string;
  userMessage: CouncilMessage;
  recentMessages: CouncilMessage[];
  analysis: string;
  rolePack: ContextPack;
  llm: LLMProvider;
  onEvent?: (event: CouncilEvent) => void;
  getContractForRole?: (roleId: string) => PersonaContract | undefined;
  contextPackage?: ContextPackage;
  sessionRunningBrief?: SessionRunningBrief;
}

export interface RolePhaseResult {
  roleMessages: CouncilMessage[];
  failedRoles: string[];
  messageCompacts: MessageCompact[];
}

export async function runRolePhase(input: RunRolePhaseInput): Promise<RolePhaseResult> {
  const {
    finalRoles, roundId, room, topic, userMessage, recentMessages,
    analysis, rolePack, llm, onEvent, getContractForRole,
    contextPackage, sessionRunningBrief,
  } = input;

  const roleMessages: CouncilMessage[] = [];
  const failedRoles: string[] = [];
  const messageCompacts: MessageCompact[] = [];

  // Register abort controllers
  for (const role of finalRoles) {
    const key = `${roundId}_${role.id}`;
    roleAbortControllers.set(key, new AbortController());
  }

  const sessionBriefText = sessionRunningBrief
    ? formatSessionBriefForPrompt(sessionRunningBrief)
    : undefined;

  await Promise.allSettled(finalRoles.map(async (role) => {
    const key = `${roundId}_${role.id}`;
    const controller = roleAbortControllers.get(key);
    const signal = controller?.signal;

    const contract = getContractForRole?.(role.id);
    const rolePrompt = contract
      ? compilePersonaPrompt({
          personaContract: contract,
          phase: "opening",
          roomContext: { topic, userMessage: userMessage.content, participants: finalRoles.map((r) => ({ id: r.id, name: r.name })) },
          contextPackage,
          existingContext: sessionBriefText || undefined,
        }).promptText
      : buildRolePrompt(role, rolePack);
    onEvent?.({ type: "role_start", roleId: role.id, roundId });

    let partialContent = "";
    let partialThinking = "";

    try {
      const input = {
        roomId: room.id, role, sharedContext: rolePrompt,
        roomSummary: analysis, recentMessages: [...recentMessages, userMessage],
      };

      let result;
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

      const parsedSummary = extractGraphSummary(result.content);
      const graphSummary = parsedSummary ?? firstMeaningfulSentence(result.content) ?? undefined;
      const cleanContent = parsedSummary
        ? result.content.replace(/<!--\s*summary:\s*.+?\s*-->/, "").trim()
        : result.content;

      const compactResult = parseTailCompact({
        content: cleanContent,
        messageId: `msg_${role.id}_${Date.now()}`,
        speakerId: role.id,
        phase: "opening",
      });
      const visibleContent = compactResult.visibleContent;
      if (compactResult.compact) messageCompacts.push(compactResult.compact);

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
      if (err instanceof Error && err.name === "AbortError") {
        const partialSummary = extractGraphSummary(partialContent) ?? firstMeaningfulSentence(partialContent) ?? undefined;
        onEvent?.({ type: "role_stopped", roleId: role.id, roundId, partialContent, graphSummary: partialSummary });
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

  return { roleMessages, failedRoles, messageCompacts };
}
