import React from "react";
import type { ColorPalette } from "../theme/palettes.js";
import type { SourceRef } from "./types.js";
import { Section } from "./Section.js";
import { itemRowStyle, mutedTextStyle } from "./runInspectorStyles.js";

interface ReferencesSectionProps {
  references: SourceRef[];
  colors: ColorPalette;
}

export const ReferencesSection: React.FC<ReferencesSectionProps> = ({ references, colors }) => (
  <Section title={`Sources (${references.length})`} colors={colors}>
    {references.length === 0 ? (
      <div style={mutedTextStyle(colors)}>No references selected.</div>
    ) : references.map((ref) => (
      <div key={ref.path} style={itemRowStyle(colors)}>
        <span>#</span>
        <span>{ref.label}</span>
      </div>
    ))}
  </Section>
);
