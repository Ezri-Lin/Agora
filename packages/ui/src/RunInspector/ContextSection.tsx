import React from "react";
import type { ColorPalette } from "../theme/palettes.js";
import type { ContextDebug } from "./types.js";
import { Section } from "./Section.js";
import { mutedTextStyle, statGridStyle } from "./runInspectorStyles.js";

interface ContextSectionProps {
  contextDebug?: ContextDebug;
  colors: ColorPalette;
}

export const ContextSection: React.FC<ContextSectionProps> = ({ contextDebug, colors }) => (
  <Section title="Context" colors={colors}>
    {!contextDebug ? (
      <div style={mutedTextStyle(colors)}>No context data yet.</div>
    ) : (
      <div style={statGridStyle(colors)}>
        <span>Moderator docs</span>
        <strong>{contextDebug.moderatorIncludedDocCount}</strong>
        <span>Moderator chars</span>
        <strong>{contextDebug.moderatorTotalChars.toLocaleString()}</strong>
        <span>Role scope</span>
        <strong>{contextDebug.roleContextMode}</strong>
        <span>Role docs</span>
        <strong>{contextDebug.roleDocCount}</strong>
      </div>
    )}
  </Section>
);
