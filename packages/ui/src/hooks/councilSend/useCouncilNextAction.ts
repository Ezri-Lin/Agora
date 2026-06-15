/**
 * UseCouncilNextAction — handle post-round user actions.
 *
 * After council round completes, shows action chips:
 * - host_synthesize → summary only (no memory)
 * - finalize_decision → summary + memory candidates
 * - write_doc_candidate → DocumentChangePlan/DiffPreview candidate
 * - continue_discussion → new round with instruction
 * - ask_specific_role → targeted follow-up
 * - discard → close without memory
 *
 * v1: Returns action descriptors. Actual LLM calls are done by the orchestration layer.
 */

import type { UserNextAction } from "@agora/shared";

export interface NextActionResult {
  kind: UserNextAction["kind"];
  label: string;
  description: string;
  /** What the orchestration layer should do */
  execute: "summarize" | "finalize" | "write_doc" | "continue" | "ask_role" | "discard";
}

/**
 * Get available next actions for the UI to display as chips.
 */
export function getAvailableNextActions(): NextActionResult[] {
  return [
    {
      kind: "host_synthesize",
      label: "让主持人总结",
      description: "生成讨论总结，不写入记忆",
      execute: "summarize",
    },
    {
      kind: "continue_discussion",
      label: "继续追问",
      description: "基于当前讨论继续深入",
      execute: "continue",
    },
    {
      kind: "ask_specific_role",
      label: "只问某个角色",
      description: "向特定角色提问",
      execute: "ask_role",
    },
    {
      kind: "finalize_decision",
      label: "拍板并沉淀",
      description: "确认决策并生成记忆候选",
      execute: "finalize",
    },
    {
      kind: "write_doc_candidate",
      label: "写入文档候选",
      description: "生成文档变更计划（需确认后执行）",
      execute: "write_doc",
    },
    {
      kind: "discard",
      label: "放弃本轮",
      description: "关闭讨论，不保存",
      execute: "discard",
    },
  ];
}

/**
 * Process a user's next action after council round.
 * Returns what the orchestration layer should do.
 */
export function handleCouncilNextAction(action: UserNextAction): NextActionResult {
  const actions = getAvailableNextActions();
  const found = actions.find((a) => a.kind === action.kind);
  return found ?? actions[actions.length - 1]; // fallback to discard
}
