import type { TimelineStep, StepState, ToolVariant } from "./types.js";

type ToolInvocationState =
  | "call"
  | "partial-call"
  | "result"
  | "input-streaming"
  | "output-available";

export function mapToolInvocationToStep(
  id: string,
  invocation: {
    toolName: string;
    args?: Record<string, any>;
    state: ToolInvocationState;
    result?: any;
  },
): Extract<TimelineStep, { type: "tool-call" }> {
  const args = invocation.args ?? {};
  const toolName = invocation.toolName.toLowerCase();

  const variant: ToolVariant =
    toolName === "thinking" || toolName === "think"
      ? "thinking"
      : toolName === "bash" || toolName === "terminal"
        ? "action"
        : toolName === "search" || toolName === "grep"
          ? "search"
          : toolName === "edit" || toolName === "write"
            ? "edit"
            : toolName === "plan"
              ? "plan"
              : toolName === "todo"
                ? "todo"
                : "action";

  return {
    id,
    type: "tool-call",
    toolName: invocation.toolName,
    toolDetail: args.command ?? args.query ?? args.path ?? JSON.stringify(args).slice(0, 200),
    duration: variant === "thinking" ? 1500 : 800,
    toolVariant: variant,
    thoughtContent: variant === "thinking" ? (args.thought ?? args.content ?? "") : undefined,
    searchQuery: variant === "search" ? (args.query ?? "") : undefined,
    searchSource: variant === "search" ? (args.source ?? "") : undefined,
    filePath: variant === "edit" ? (args.path ?? args.filePath ?? "") : undefined,
    diffLines: variant === "edit" ? args.diffLines : undefined,
    diffStats: variant === "edit" ? args.diffStats : undefined,
    bashCommand: variant === "action" ? (args.command ?? "") : undefined,
    bashOutput: invocation.result?.output ?? invocation.result?.stdout,
    bashSuccess: invocation.result?.success,
  };
}

export function mapToolStateToStepState(state: ToolInvocationState): StepState {
  switch (state) {
    case "call":
    case "partial-call":
    case "input-streaming":
      return "animating";
    case "result":
    case "output-available":
      return "complete";
    default:
      return "pending";
  }
}
