import React from "react";
import type { ColorPalette } from "../theme/palettes.js";
import { Section } from "./Section.js";
import { actionButtonStyle, mutedTextStyle } from "./runInspectorStyles.js";

interface MemorySectionProps {
  memoryCount: number;
  colors: ColorPalette;
  onOpenMemoryReview?: () => void;
}

export const MemorySection: React.FC<MemorySectionProps> = ({ memoryCount, colors, onOpenMemoryReview }) => (
  <Section title={`Memory (${memoryCount})`} colors={colors}>
    <div style={mutedTextStyle(colors)}>
      {memoryCount === 0 ? "No memories accepted yet." : `${memoryCount} accepted memories`}
    </div>
    {onOpenMemoryReview && (
      <button type="button" style={actionButtonStyle(colors)} onClick={onOpenMemoryReview}>
        Review memories
      </button>
    )}
  </Section>
);
