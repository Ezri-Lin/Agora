/**
 * Pure adapter: RoleViewModel → bio display sections.
 * Consumed by RoleBioPopover. No kernel/runtime dependencies.
 */

import type { RoleViewModel } from "./CouncilDispatchGate.js";

export interface BioSection {
  label: string;
  items: string[];
}

export interface RoleBioView {
  /** Short biography / mission statement */
  bio?: string;
  /** Why this role was recommended */
  reason?: string;
  /** Ordered sections to display */
  sections: BioSection[];
  /** Whether any meaningful bio data exists */
  hasContent: boolean;
}

/**
 * Build a RoleBioView from a RoleViewModel.
 * Returns sections only when the role has data to show.
 */
export function buildRoleBioView(role: RoleViewModel): RoleBioView {
  const sections: BioSection[] = [];

  if (role.responsibilities && role.responsibilities.length > 0) {
    sections.push({ label: "职责", items: role.responsibilities });
  }

  if (role.strengths && role.strengths.length > 0) {
    sections.push({ label: "擅长", items: role.strengths });
  }

  if (role.decisionRights && role.decisionRights.length > 0) {
    sections.push({ label: "决策权", items: role.decisionRights });
  }

  if (role.boundaries && role.boundaries.length > 0) {
    sections.push({ label: "边界", items: role.boundaries });
  }

  const hasContent = Boolean(
    role.bio ||
    role.reason ||
    sections.length > 0,
  );

  return {
    bio: role.bio,
    reason: role.reason,
    sections,
    hasContent,
  };
}
