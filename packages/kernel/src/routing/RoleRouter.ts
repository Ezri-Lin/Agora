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
