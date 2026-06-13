import React, { memo } from "react";
import type { TimelineStep, StepState } from "./types.js";
import { useToolComplete } from "./useToolComplete.js";
import { ToolRowBase } from "./ToolRowBase.js";
import { mapToolInvocationToStep, mapToolStateToStepState } from "./toolAdapters.js";
import { useTheme } from "../theme/ThemeContext.js";
import { createToolStyles } from "./toolStyles.js";

export type ThinkingToolProps = {
  part?: any;
  step?: Extract<TimelineStep, { type: "tool-call" }>;
  state?: StepState;
  onComplete?: () => void;
  defaultOpen?: boolean;
  expanded?: boolean;
  onToggleExpand?: () => void;
};

export const ThinkingTool = memo(function ThinkingTool({
  part,
  step: externalStep,
  state: externalState,
  onComplete: externalOnComplete,
  defaultOpen,
  expanded,
  onToggleExpand,
}: ThinkingToolProps) {
  const { colors } = useTheme();
  const styles = createToolStyles(colors);

  let step: Extract<TimelineStep, { type: "tool-call" }>;
  let stepState: StepState;
  let onComplete: () => void;

  if (externalStep && externalState && externalOnComplete) {
    step = externalStep;
    stepState = externalState;
    onComplete = externalOnComplete;
  } else if (part) {
    step = mapToolInvocationToStep(part.toolCallId ?? part.id ?? "thinking", {
      toolName: "Thinking",
      args: part.input ?? part.args ?? {},
      state: part.state === "output-available" ? "result" : part.state === "input-streaming" ? "partial-call" : "call",
      result: part.output ?? part.result,
    });
    stepState = mapToolStateToStepState(
      part.state === "output-available" ? "result" : part.state === "input-streaming" ? "partial-call" : "call",
    );
    onComplete = () => {};
  } else {
    return null;
  }

  useToolComplete(stepState === "animating", step.duration, onComplete);

  return (
    <ToolRowBase
      shimmerLabel="Thinking"
      completeLabel="Thought"
      isAnimating={stepState === "animating"}
      expandable={!!step.thoughtContent}
      defaultOpen={defaultOpen}
      expanded={expanded}
      onToggleExpand={onToggleExpand}
    >
      <div style={styles.expandableContent}>
        <p style={styles.thoughtContent}>
          {step.thoughtContent}
        </p>
      </div>
    </ToolRowBase>
  );
});
