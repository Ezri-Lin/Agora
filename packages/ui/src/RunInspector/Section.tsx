import React from "react";
import type { ColorPalette } from "../theme/palettes.js";
import { sectionBodyStyle, sectionHeaderStyle, sectionStyle } from "./runInspectorStyles.js";

interface SectionProps {
  title: string;
  colors: ColorPalette;
  children: React.ReactNode;
}

export const Section: React.FC<SectionProps> = ({ title, colors, children }) => (
  <section style={sectionStyle(colors)}>
    <div style={sectionHeaderStyle(colors)}>{title}</div>
    <div style={sectionBodyStyle}>{children}</div>
  </section>
);
