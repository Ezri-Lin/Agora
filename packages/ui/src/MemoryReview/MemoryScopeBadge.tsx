import React from "react";
import type { MemoryCandidateScope } from "./types.js";
import { scopeBadgeStyle, getScopeLabel } from "./styles.js";

interface MemoryScopeBadgeProps {
  scope: MemoryCandidateScope;
}

export const MemoryScopeBadge: React.FC<MemoryScopeBadgeProps> = ({ scope }) => (
  <span style={scopeBadgeStyle(scope)}>{getScopeLabel(scope)}</span>
);
