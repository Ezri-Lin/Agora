import React from "react";
import type { ColorPalette } from "../theme/palettes.js";
import { Section } from "./Section.js";
import { actionButtonStyle, itemRowStyle, mutedTextStyle } from "./runInspectorStyles.js";

interface OutputsSectionProps {
  outputs: string[];
  colors: ColorPalette;
  onOpenWriteProposals?: () => void;
  onOpenSessionSummary?: () => void;
}

export const OutputsSection: React.FC<OutputsSectionProps> = ({
  outputs,
  colors,
  onOpenWriteProposals,
  onOpenSessionSummary,
}) => (
  <Section title={`Outputs (${outputs.length})`} colors={colors}>
    {outputs.length === 0 ? (
      <div style={mutedTextStyle(colors)}>No outputs generated.</div>
    ) : outputs.map((output) => (
      <div key={output} style={itemRowStyle(colors)}>
        <span>doc</span>
        <span>{output}</span>
      </div>
    ))}
    {onOpenWriteProposals && (
      <button type="button" style={actionButtonStyle(colors)} onClick={onOpenWriteProposals}>
        Open write proposals
      </button>
    )}
    {onOpenSessionSummary && (
      <button type="button" style={actionButtonStyle(colors, "accent")} onClick={onOpenSessionSummary}>
        Open session summary
      </button>
    )}
  </Section>
);
