import React, { memo } from "react";
import { TextShimmer } from "./TextShimmer.js";
import { ToolRowBase } from "./ToolRowBase.js";
import type { TimelineStep, StepState } from "./types.js";
import { useToolComplete } from "./useToolComplete.js";
import { mapToolInvocationToStep, mapToolStateToStepState } from "./toolAdapters.js";
import { useTheme } from "../theme/ThemeContext.js";
import { createToolStyles } from "./toolStyles.js";

export type SearchResult = {
  title: string;
  source?: string;
  date?: string;
};

export type SearchToolProps = {
  part: any;
  results?: SearchResult[];
  defaultOpen?: boolean;
};

export const SearchTool = memo(function SearchTool({
  part,
  results,
  defaultOpen,
}: SearchToolProps) {
  const { colors } = useTheme();
  const styles = createToolStyles(colors);

  const step = mapToolInvocationToStep(part.toolCallId ?? part.id ?? "search", {
    toolName: "Search",
    args: part.input ?? part.args ?? {},
    state: part.state === "output-available" ? "result" : part.state === "input-streaming" ? "partial-call" : "call",
    result: part.output ?? part.result,
  });
  const stepState = mapToolStateToStepState(
    part.state === "output-available" ? "result" : part.state === "input-streaming" ? "partial-call" : "call",
  );

  useToolComplete(stepState === "animating", step.duration, () => {});

  const searchQuery = step.searchQuery ?? "searching...";
  const searchResults = results ?? (part.output?.results as SearchResult[]) ?? [];
  const isPending = stepState === "animating";

  return (
    <ToolRowBase
      shimmerLabel="Searching..."
      completeLabel={`Found ${searchResults.length} results`}
      isAnimating={isPending}
      expandable={searchResults.length > 0}
      defaultOpen={defaultOpen}
    >
      <div style={styles.toolCard}>
        <div style={{
          ...styles.toolHeader,
          borderBottom: `1px solid ${colors.border}`,
        }}>
          <span style={{ fontSize: 12, color: colors.text }}>
            Searched for
          </span>{" "}
          <span style={{ fontSize: 12, color: colors.textMuted, overflow: "hidden", textOverflow: "ellipsis" }}>
            &ldquo;{searchQuery}&rdquo;
          </span>
        </div>
        <div style={{ maxHeight: 200, overflowY: "auto", background: colors.bg, padding: 4 }}>
          {searchResults.map((result, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "4px 8px",
                borderRadius: 6,
                cursor: "default",
              }}
            >
              <span style={{ fontSize: 13, color: colors.text, overflow: "hidden", textOverflow: "ellipsis", flex: 1, minWidth: 0 }}>
                {result.title}
              </span>
              <span style={{ fontSize: 11, color: colors.textMuted, flexShrink: 0, whiteSpace: "nowrap" }}>
                {result.date || result.source}
              </span>
            </div>
          ))}
        </div>
      </div>
    </ToolRowBase>
  );
});
