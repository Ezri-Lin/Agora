import type { RoleCard } from "@agora/shared";

interface ScoredRole {
  role: RoleCard;
  score: number;
}

export function scoreRole(role: RoleCard, topic: string): number {
  const relevance = role.tags.some((t) => topic.includes(t)) ? 0.8 : 0.4;
  const diversity = role.type === "critic" ? 0.9 : 0.6;
  const conflictValue = role.type === "critic" ? 0.9 : 0.3;
  const preferenceFit = 0.7;
  const grounding = 0.8;

  return (
    relevance * 0.35 +
    diversity * 0.20 +
    conflictValue * 0.20 +
    preferenceFit * 0.15 +
    grounding * 0.10
  );
}

export function routeRoles(
  available: RoleCard[],
  topic: string,
  count: number,
): RoleCard[] {
  // MUST include at least 1 critic
  const critic = available.find((r) => r.type === "critic");
  const others = available.filter((r) => r.type !== "critic");

  const scored: ScoredRole[] = others.map((role) => ({
    role,
    score: scoreRole(role, topic),
  }));

  scored.sort((a, b) => b.score - a.score);

  const selected = scored.slice(0, count - 1).map((s) => s.role);
  if (critic) selected.unshift(critic);

  return selected.slice(0, count);
}

/**
 * Auto-invite persona lenses whose tags strongly match the topic.
 * A lens with ≥2 tag matches is guaranteed inclusion.
 */
export function autoInviteLenses(
  selected: RoleCard[],
  allRoles: RoleCard[],
  topic: string,
): RoleCard[] {
  const topicLower = topic.toLowerCase();
  const selectedIds = new Set(selected.map((r) => r.id));

  const lenses = allRoles.filter((r) => r.type === "lens" && !selectedIds.has(r.id));

  for (const lens of lenses) {
    const matchCount = lens.tags.filter((t) => topicLower.includes(t.toLowerCase())).length;
    if (matchCount >= 2) {
      selected.push(lens);
      selectedIds.add(lens.id);
    }
  }

  return selected;
}
