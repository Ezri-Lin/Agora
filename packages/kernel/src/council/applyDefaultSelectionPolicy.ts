/**
 * Apply default selection policy — selects which roles are checked by default.
 *
 * CRITICAL: This MUST NOT limit the user's final selection.
 * defaultSelectedRoleLimit controls default checked roles only.
 * rankedCandidates is always the full pool.
 * finalSelectedRoleIds is determined by the user, not this function.
 */

import type {
  RoleCandidate,
  DefaultSelectionResult,
  CouncilDispatchSettings,
} from "@agora/shared";

/**
 * Select default checked roles from ranked candidates.
 *
 * Strategy:
 * 1. Ensure at least one critic/skeptic if requireCriticByDefault
 * 2. Pick top-scoring candidates up to defaultSelectedRoleLimit
 * 3. Maximize diversity (avoid near-duplicate roles from same family)
 * 4. Rest goes to recommended alternatives
 */
export function applyDefaultSelectionPolicy(
  rankedCandidates: RoleCandidate[],
  settings: CouncilDispatchSettings,
): DefaultSelectionResult {
  const { defaultSelectedRoleLimit, requireCriticByDefault } = settings;
  const selected: string[] = [];
  const usedFamilies = new Set<string>();

  // Phase 1: If requireCriticByDefault, ensure a critic is included
  if (requireCriticByDefault) {
    const critic = rankedCandidates.find(
      (c) => c.tags.some((t) => ["criticism", "skepticism", "counterargument", "risk"].includes(t)),
    );
    if (critic && selected.length < defaultSelectedRoleLimit) {
      selected.push(critic.roleId);
      usedFamilies.add(critic.familyId);
    }
  }

  // Phase 2: Fill remaining slots by score, respecting family diversity
  for (const candidate of rankedCandidates) {
    if (selected.length >= defaultSelectedRoleLimit) break;
    if (selected.includes(candidate.roleId)) continue;

    // Prefer diversity: skip if same family already selected and alternatives exist
    if (usedFamilies.has(candidate.familyId)) {
      const hasAlternativeFromOtherFamily = rankedCandidates.some(
        (c) => !selected.includes(c.roleId) && !usedFamilies.has(c.familyId) && c.score >= candidate.score * 0.8,
      );
      if (hasAlternativeFromOtherFamily) continue;
    }

    selected.push(candidate.roleId);
    usedFamilies.add(candidate.familyId);
  }

  // Phase 3: Build result
  const defaultSelectedSet = new Set(selected);
  const recommendedAlternativeRoleIds = rankedCandidates
    .filter((c) => !defaultSelectedSet.has(c.roleId))
    .map((c) => c.roleId);

  // Mark candidates
  const markedCandidates = rankedCandidates.map((c) => ({
    ...c,
    defaultSelected: defaultSelectedSet.has(c.roleId),
  }));

  return {
    rankedCandidates: markedCandidates,
    defaultSelectedRoleIds: selected,
    recommendedAlternativeRoleIds,
  };
}
