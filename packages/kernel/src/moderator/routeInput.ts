/**
 * RouteInput — rule-first routing with LLM fallback.
 * Rules handle obvious cases (chitchat, commands, light responses).
 * LLM only called for uncertain inputs.
 */

import type { InputRoute, RouteInputContext } from "@agora/shared";
import { routeInputRuleFirst } from "./routeInputRules.js";

interface RouteInputDeps {
  callModerator: (params: {
    roomId: string;
    task: string;
    context: string;
  }) => Promise<{ content: string }>;
  roomId: string;
}

/**
 * Route user input. Rule-first, LLM fallback.
 * Business layer never sees "needs_llm_route" — only InputRoute.
 */
export async function routeInput(
  text: string,
  context: RouteInputContext,
  deps: RouteInputDeps,
): Promise<InputRoute> {
  // Rule-first: deterministic, 0 LLM calls
  const ruleResult = routeInputRuleFirst(text, context);
  if (ruleResult.kind !== "needs_llm_route") return ruleResult;

  // LLM fallback: only for uncertain inputs
  const prompt = buildRouteInputPrompt(text, context);
  const response = await deps.callModerator({
    roomId: deps.roomId,
    task: "route_input",
    context: prompt,
  });

  return parseRouteInputResponse(response.content, text);
}

function buildRouteInputPrompt(text: string, context: RouteInputContext): string {
  return `Classify this user message into one of: chitchat, light_response, task, command, ambiguous.

Room phase: ${context.roomPhase}
Has completed council round: ${context.hasCompletedCouncilRound}
Has pending dispatch: ${context.hasPendingDispatch}
Has documents: ${context.hasDocuments}

User message: "${text}"

Respond with JSON only:
{ "kind": "chitchat" | "light_response" | "task" | "command" | "ambiguous", "reason": "..." }

Rules:
- chitchat: greetings, social, no substance
- light_response: simple question, no multi-role analysis needed
- task: substantive request needing analysis or multi-perspective discussion
- command: explicit instruction to continue/summarize/finalize/write
- ambiguous: intent unclear, need clarification`;
}

function parseRouteInputResponse(content: string, originalText: string): InputRoute {
  try {
    const json = JSON.parse(content.trim());
    switch (json.kind) {
      case "chitchat":
        return { kind: "chitchat", replyIntent: "ack", fastReply: "你好！有什么可以帮你的？" };
      case "light_response":
        return { kind: "light_response", reason: json.reason || "Simple request" };
      case "task":
        return { kind: "task", taskSeed: originalText };
      case "ambiguous":
        return { kind: "ambiguous", clarificationQuestion: json.reason || "Could you clarify what you need?" };
      default:
        return { kind: "task", taskSeed: originalText };
    }
  } catch {
    // If LLM returns invalid JSON, treat as task
    return { kind: "task", taskSeed: originalText };
  }
}
