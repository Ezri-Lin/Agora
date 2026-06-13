import React, { memo } from "react";
import { TextShimmer } from "./TextShimmer.js";
import { SpiralLoader } from "./SpiralLoader.js";
import { ToolApprovalFooter, type ToolApproval } from "./ToolApprovalFooter.js";
import type { TimelineStep, StepState, DiffLine } from "./types.js";
import { useToolComplete } from "./useToolComplete.js";
import { mapToolInvocationToStep, mapToolStateToStepState } from "./toolAdapters.js";
import { useTheme } from "../theme/ThemeContext.js";
import { createToolStyles } from "./toolStyles.js";

function DiffView({ lines }: { lines: DiffLine[] }) {
  const { colors } = useTheme();
  const styles = createToolStyles(colors);

  return (
    <div style={styles.diffContainer}>
      {lines.map((line, i) => {
        const lineStyle =
          line.type === "add"
            ? styles.diffLineAdd
            : line.type === "remove"
              ? styles.diffLineRemove
              : styles.diffLine;
        const prefix = line.type === "add" ? "+" : line.type === "remove" ? "-" : " ";
        return (
          <div key={i} style={lineStyle}>
            <span style={{ userSelect: "none", opacity: 0.5, marginRight: 8 }}>{prefix}</span>
            {line.content}
          </div>
        );
      })}
    </div>
  );
}

export type EditToolCardProps = {
  step: Extract<TimelineStep, { type: "tool-call" }>;
  state: StepState;
  onComplete: () => void;
  approval?: ToolApproval;
};

export function EditToolCard({
  step,
  state,
  onComplete,
  approval,
}: EditToolCardProps) {
  const { colors } = useTheme();
  const styles = createToolStyles(colors);
  useToolComplete(state === "animating", step.duration, onComplete);

  const isPending = state === "animating";
  const fileName = step.filePath?.split("/").pop() ?? step.toolDetail;
  const isWrite = step.toolName === "Write";

  return (
    <div style={styles.toolCard}>
      <div style={{
        ...styles.toolHeader,
        borderBottom: isPending && !step.diffLines ? undefined : `1px solid ${colors.border}`,
      }}>
        <div style={styles.toolHeaderLeft}>
          {isPending && !step.diffLines ? (
            <TextShimmer as="span" duration={1.2} style={{ fontSize: 12 }}>
              Generating...
            </TextShimmer>
          ) : isPending ? (
            <TextShimmer as="span" duration={1.2} style={{ fontSize: 12 }}>
              {isWrite ? "Creating" : "Editing"} {fileName}
            </TextShimmer>
          ) : (
            <span style={styles.toolHeaderText}>
              {isWrite ? "Created" : "Edited"} {fileName}
            </span>
          )}
        </div>
        {step.diffStats && !isPending && (
          <span style={{ fontSize: 11, fontFamily: "monospace", color: colors.textMuted, display: "inline-flex", gap: 8 }}>
            {step.diffStats.split(" ").map((token) => (
              <span
                key={token}
                style={{
                  color: token.startsWith("+")
                    ? "#15803d"
                    : token.startsWith("-")
                      ? "#dc2626"
                      : undefined,
                }}
              >
                {token}
              </span>
            ))}
          </span>
        )}
      </div>
      {step.diffLines && step.diffLines.length > 0 && (
        <DiffView lines={step.diffLines} />
      )}
      {approval && <ToolApprovalFooter isPending={isPending} {...approval} />}
    </div>
  );
}

export type EditToolProps = {
  part: any;
};

export const EditTool = memo(function EditTool({ part }: EditToolProps) {
  const approval = (part.input?.approval ?? part.args?.approval) as ToolApproval | undefined;
  const step = mapToolInvocationToStep(part.toolCallId ?? part.id ?? "edit", {
    toolName: "Edit",
    args: part.input ?? part.args ?? {},
    state: part.state === "output-available" ? "result" : part.state === "input-streaming" ? "partial-call" : "call",
    result: part.output ?? part.result,
  });
  const stepState = mapToolStateToStepState(
    part.state === "output-available" ? "result" : part.state === "input-streaming" ? "partial-call" : "call",
  );

  return (
    <EditToolCard
      step={step}
      state={stepState}
      onComplete={() => {}}
      approval={approval}
    />
  );
});
