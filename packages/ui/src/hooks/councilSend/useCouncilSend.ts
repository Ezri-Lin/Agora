/**
 * useCouncilSend — orchestration-only hook for Adaptive Council Graph.
 *
 * This is the NEW flow. It replaces the old linear flow with:
 * routeInput → buildTaskFrame → decideEngagement → dispatchPreview → confirm → fan-out
 *
 * v1 skeleton: wires up the pipeline, delegates to helpers.
 * Does NOT yet replace the existing useCouncilSend.ts (will be swapped later).
 *
 * HARD CONSTRAINT: This file must stay ≤200 lines. All business logic goes in helpers.
 */

import { useCallback } from "react";
import type { CouncilMessage, CouncilRoom, SourceRef, RoleCard } from "@agora/shared";
import type { InputRoute, RouteInputContext, InviteGateState } from "@agora/shared";
import type { CouncilDispatchSettings } from "@agora/shared";
import { routeInputRuleFirst } from "@agora/kernel";
import { handleInputRoute } from "./handleInputRoute.js";
import { prepareCouncilDispatch } from "./prepareCouncilDispatch.js";
import { confirmCouncilDispatch } from "./confirmCouncilDispatch.js";

// === Types ===

interface UseNewCouncilSendParams {
  roomId: string;
  messages: CouncilMessage[];
  allRoles: RoleCard[];
  inviteGateState?: InviteGateState;
  settings: CouncilDispatchSettings;
  llm: {
    callModerator: (params: { roomId: string; task: string; context: string }) => Promise<{ content: string }>;
  };
}

interface SendResult {
  route: InputRoute;
  action: string;
  dispatchPreview?: unknown;
}

// === Hook ===

export function useNewCouncilSend(params: UseNewCouncilSendParams) {
  const { roomId, messages, allRoles, inviteGateState, settings, llm } = params;

  return useCallback(
    async (
      text: string,
      selectedDocs: SourceRef[],
      docContents?: Map<string, string>,
    ): Promise<SendResult> => {
      // 1. Build route context
      const context: RouteInputContext = {
        messageIndex: messages.length,
        hasDocuments: selectedDocs.length > 0,
        roomPhase: "idle", // TODO: get from actual state
        hasPendingDispatch: false,
        hasCompletedCouncilRound: messages.some((m) => m.senderType === "moderator" && m.content),
        inviteGateState,
      };

      // 2. Route input (rule-first, no LLM for obvious cases)
      const routeResult = routeInputRuleFirst(text, context);
      const route: InputRoute =
        routeResult.kind === "needs_llm_route"
          ? await llmRouteFallback(text, context, llm, roomId)
          : routeResult;

      // 3. Handle route
      const handled = handleInputRoute(route, messages);

      switch (handled.action) {
        case "fast_reply":
          // TODO: Add fast reply message to UI
          return { route, action: "fast_reply" };

        case "direct_reply":
          // TODO: Generate direct reply via moderator
          return { route, action: "direct_reply" };

        case "command":
          // TODO: Handle command
          return { route, action: `command:${handled.command}` };

        case "clarify":
          // TODO: Show clarification question
          return { route, action: "clarify" };

        case "proceed_to_task":
          // 4. Build task frame → decide engagement → dispatch preview
          const result = await prepareCouncilDispatch({
            userMessage: text,
            selectedDocs,
            providedDocContents: docContents,
            recentMessages: messages,
            allRoles,
            inviteGateState,
            userInviteTrigger: false,
            settings,
            roomId,
            llm,
          });

          if (result.engagementDecision.mode === "direct") {
            // TODO: Generate direct reply
            return { route, action: "direct_reply" };
          }

          if (result.engagementDecision.mode === "clarify") {
            return { route, action: "clarify" };
          }

          // mode=invite → return dispatch preview
          // TODO: Set dispatch gate in UI state
          return { route, action: "dispatch_preview", dispatchPreview: result.dispatchPreview };
      }
    },
    [roomId, messages, allRoles, inviteGateState, settings, llm],
  );
}

// === Helpers ===

async function llmRouteFallback(
  text: string,
  context: RouteInputContext,
  llm: { callModerator: (p: { roomId: string; task: string; context: string }) => Promise<{ content: string }> },
  roomId: string,
): Promise<InputRoute> {
  const response = await llm.callModerator({
    roomId,
    task: "route_input",
    context: `Classify: "${text}" | Room phase: ${context.roomPhase}`,
  });

  try {
    const json = JSON.parse(response.content.trim());
    if (json.kind === "task") return { kind: "task", taskSeed: text };
    if (json.kind === "chitchat") return { kind: "chitchat", replyIntent: "ack", fastReply: "你好！" };
    if (json.kind === "light_response") return { kind: "light_response", reason: json.reason || "simple" };
    if (json.kind === "ambiguous") return { kind: "ambiguous", clarificationQuestion: json.reason || "请说明一下" };
    return { kind: "task", taskSeed: text };
  } catch {
    return { kind: "task", taskSeed: text };
  }
}
