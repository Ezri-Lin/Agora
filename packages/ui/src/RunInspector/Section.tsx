import React from "react";
import type { ColorPalette } from "../theme/palettes.js";

interface SectionProps {
  title: string;
  colors?: ColorPalette;
  children: React.ReactNode;
}

export const Section: React.FC<SectionProps> = ({ title, children }) => (
  <div className="ins-section">
    <div className="ins-title">{title}</div>
    {children}
  </div>
);

