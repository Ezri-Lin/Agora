/**
 * Rule-first input routing. Deterministic, no LLM.
 * Returns InputRoute for obvious cases, or { kind: "needs_llm_route" } for uncertain cases.
 */

import type { InputRoute, RouteInputContext } from "@agora/shared";

type RuleResult = InputRoute | { kind: "needs_llm_route" };

// === Chitchat patterns ===

const CHITCHAT_PATTERNS = [
  /^(hi|hello|hey|yo|sup|howdy|hola)$/i,
  /^(你好|您好|在吗|在不在|嗨|哈喽|嘿)$/,
  /^(test|测试|ping)$/,
  /^(嗯|哦|呃|额|啊|呢|吧|了|嘛|哈|嘿|emmm+|嗯嗯|ok|okay|好的|收到|明白|了解)$/,
  /^(yes|no|yep|nope|yeah|nah|对|是|不是|好|不好|行|不行)$/,
];

function isChitchat(text: string): boolean {
  const trimmed = text.trim();
  if (trimmed.length === 0) return true;
  if (trimmed.length <= 2) return true;
  return CHITCHAT_PATTERNS.some((p) => p.test(trimmed));
}

// === Command patterns (context-dependent) ===

const COMMAND_PATTERNS: Array<{
  pattern: RegExp;
  command: InputRoute & { kind: "command" };
  requiresPhase?: string[];
}> = [
  {
    pattern: /^(总结|总结一下|帮我总结|summarize|总结本轮)$/i,
    command: { kind: "command", command: "host_synthesize" },
    requiresPhase: ["awaiting_user_next_action"],
  },
  {
    pattern: /^(拍板|确认|就按这个定|就这样|finalize|拍板并沉淀)$/i,
    command: { kind: "command", command: "finalize_decision" },
    requiresPhase: ["awaiting_user_next_action"],
  },
  {
    pattern: /^(写入文档|写入|记录到文档|write.*doc)$/i,
    command: { kind: "command", command: "write_to_doc" },
    requiresPhase: ["awaiting_user_next_action"],
  },
  {
    pattern: /^(继续|继续讨论|接着说|go on|continue)$/i,
    command: { kind: "command", command: "continue_discussion" },
    requiresPhase: ["awaiting_user_next_action"],
  },
  {
    pattern: /^(放弃|算了|不讨论了|discard)$/i,
    command: { kind: "command", command: "discard_round" },
    requiresPhase: ["awaiting_user_next_action"],
  },
  {
    pattern: /^(取消|取消邀请|cancel)$/i,
    command: { kind: "command", command: "cancel_dispatch" },
    requiresPhase: ["awaiting_dispatch_confirmation"],
  },
];

function tryCommand(text: string, context: RouteInputContext): (InputRoute & { kind: "command" }) | null {
  const trimmed = text.trim();
  for (const { pattern, command, requiresPhase } of COMMAND_PATTERNS) {
    if (!pattern.test(trimmed)) continue;
    if (requiresPhase && !requiresPhase.includes(context.roomPhase)) continue;
    return command;
  }
  return null;
}

// === Light response patterns ===

const LIGHT_RESPONSE_PATTERNS = [
  /^(换个说法|用一句话|简单说|简短说|rephrase|summarize briefly)$/i,
  /^(这是什么|什么意思|解释一下|explain|define)$/i,
];

function isLightResponse(text: string): boolean {
  const trimmed = text.trim();
  if (LIGHT_RESPONSE_PATTERNS.some((p) => p.test(trimmed))) return true;
  // Short factual-looking questions (≤15 chars, ends with ?)
  if (trimmed.length <= 15 && /[？?]$/.test(trimmed)) return true;
  return false;
}

// === Main rule-first function ===

export function routeInputRuleFirst(text: string, context: RouteInputContext): RuleResult {
  const trimmed = text.trim();

  // 1. Empty — always chitchat
  if (trimmed.length === 0) {
    return { kind: "chitchat", replyIntent: "ack", fastReply: "嗯" };
  }

  // 2. Command — check first (commands can be short, must not be misclassified as chitchat)
  const command = tryCommand(text, context);
  if (command) return command;

  // 3. Chitchat — pattern match (greetings, social, confirmations)
  if (isChitchat(text)) {
    return {
      kind: "chitchat",
      replyIntent: "ack",
      fastReply: trimmed.length <= 3 ? "嗯" : "你好！有什么可以帮你的？",
    };
  }

  // 4. Too short to be a task (≤2 chars, not matched above) — treat as chitchat
  if (trimmed.length <= 2) {
    return { kind: "chitchat", replyIntent: "ack", fastReply: "嗯" };
  }

  // 5. Light response — short, simple requests
  if (isLightResponse(text)) {
    return { kind: "light_response", reason: "Simple request, no multi-role analysis needed." };
  }

  // 6. Uncertain — needs LLM
  return { kind: "needs_llm_route" };
}
