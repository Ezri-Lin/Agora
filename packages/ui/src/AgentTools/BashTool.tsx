import React, { memo } from "react";
import { TextShimmer } from "./TextShimmer.js";
import { SpiralLoader } from "./SpiralLoader.js";
import { ToolApprovalFooter, type ToolApproval } from "./ToolApprovalFooter.js";
import type { TimelineStep, StepState } from "./types.js";
import { useToolComplete } from "./useToolComplete.js";
import { mapToolInvocationToStep, mapToolStateToStepState } from "./toolAdapters.js";
import { useTheme } from "../theme/ThemeContext.js";
import { createToolStyles } from "./toolStyles.js";

function extractCommandSummary(cmd: string): string {
  return cmd
    .split("|")
    .map((s) => s.trim().split(/\s+/)[0] ?? "")
    .filter(Boolean)
    .slice(0, 4)
    .join(", ");
}

export type BashToolCardProps = {
  step: Extract<TimelineStep, { type: "tool-call" }>;
  state: StepState;
  onComplete: () => void;
  approval?: ToolApproval;
};

export function BashToolCard({
  step,
  state,
  onComplete,
  approval,
}: BashToolCardProps) {
  const { colors } = useTheme();
  const styles = createToolStyles(colors);
  useToolComplete(state === "animating", step.duration, onComplete);

  const isPending = state === "animating";
  const command = step.bashCommand ?? step.toolDetail;
  const summary = extractCommandSummary(command);

  return (
    <div style={styles.toolCard}>
      <div style={styles.toolHeader}>
        <div style={styles.toolHeaderLeft}>
          {isPending ? (
            <TextShimmer
              as="span"
              duration={1.2}
              style={{ display: "inline-flex", alignItems: "center", fontSize: 12, lineHeight: 1, height: "100%", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
            >
              Running command: {summary}
            </TextShimmer>
          ) : (
            <span style={styles.toolHeaderText}>
              Ran command: {summary}
            </span>
          )}
        </div>
        {isPending && <SpiralLoader size={12} style={styles.spinner} />}
      </div>
      <div style={styles.toolBody}>
        <div style={{ wordBreak: "break-all" }}>
          <span style={styles.bashPrompt}>$ </span>
          <span style={styles.bashCommand}>{command}</span>
        </div>
        {!isPending && step.bashOutput && (
          <div style={styles.bashOutput}>
            {step.bashOutput}
          </div>
        )}
      </div>
      {approval && <ToolApprovalFooter isPending={isPending} {...approval} />}
    </div>
  );
}

export type BashToolProps = {
  part: any;
};

export const BashTool = memo(function BashTool({ part }: BashToolProps) {
  const approval = (part.input?.approval ?? part.args?.approval) as ToolApproval | undefined;
  const step = mapToolInvocationToStep(part.toolCallId ?? part.id ?? "bash", {
    toolName: "Bash",
    args: part.input ?? part.args ?? {},
    state: part.state === "output-available" ? "result" : part.state === "input-streaming" ? "partial-call" : "call",
    result: part.output ?? part.result,
  });
  const stepState = mapToolStateToStepState(
    part.state === "output-available" ? "result" : part.state === "input-streaming" ? "partial-call" : "call",
  );

  return (
    <BashToolCard
      step={step}
      state={stepState}
      onComplete={() => {}}
      approval={approval}
    />
  );
});
