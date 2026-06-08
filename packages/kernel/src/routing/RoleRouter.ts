import type {
  RoleCard,
  CouncilRoleSettings,
  RoleSelectionResult,
  SelectedRole,
  SuggestedRole,
} from "@agora/shared";

interface ScoredRole {
  role: RoleCard;
  score: number;
  matchedTags: string[];
}

/**
 * Normalize a tag for matching: lowercase, trim, collapse whitespace.
 */
function normalizeTag(tag: string): string {
  return tag.toLowerCase().replace(/[_-]/g, " ").trim();
}

/**
 * Check if topic contains the tag as a word/phrase boundary match.
 * For short tags (≤3 chars), require exact word match.
 * For longer tags, allow substring match.
 */
function topicMatchesTag(topicLower: string, tag: string): boolean {
  const normalized = normalizeTag(tag);
  if (normalized.length <= 3) {
    // Short tags: require word boundary (split by whitespace/punctuation)
    const words = topicLower.split(/[\s,.;:!?。！？、，。；：]+/);
    return words.includes(normalized);
  }
  // Longer tags: substring match is acceptable
  return topicLower.includes(normalized);
}

/**
 * Count matching tags between role and topic, with deduplication.
 */
function countMatchedTags(role: RoleCard, topicLower: string): string[] {
  const seen = new Set<string>();
  const matched: string[] = [];
  for (const tag of role.tags) {
    const normalized = normalizeTag(tag);
    // Skip if a shorter version of this tag already matched
    if (seen.has(normalized)) continue;
    if (topicMatchesTag(topicLower, tag)) {
      matched.push(tag);
      // Mark all normalized forms as seen to prevent overlap
      seen.add(normalized);
    }
  }
  return matched;
}

export function scoreRole(role: RoleCard, topic: string): number {
  const topicLower = topic.toLowerCase();
  const matchedTags = countMatchedTags(role, topicLower);
  const relevance = matchedTags.length > 0 ? 0.8 : 0.4;
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

/**
 * Select base roles using the scoring algorithm.
 * Returns SelectedRole[] with source="base".
 */
function selectBaseRoles(
  available: RoleCard[],
  topic: string,
  count: number,
): SelectedRole[] {
  const topicLower = topic.toLowerCase();
  // MUST include at least 1 critic
  const critic = available.find((r) => r.type === "critic");
  const others = available.filter((r) => r.type !== "critic");

  const scored: ScoredRole[] = others.map((role) => ({
    role,
    score: scoreRole(role, topic),
    matchedTags: countMatchedTags(role, topicLower),
  }));

  scored.sort((a, b) => b.score - a.score);

  const selected: SelectedRole[] = scored.slice(0, count - 1).map((s) => ({
    roleId: s.role.id,
    name: s.role.name,
    subtitle: s.role.subtitle,
    type: s.role.type,
    tags: s.role.tags,
    source: "base" as const,
  }));

  if (critic) {
    selected.unshift({
      roleId: critic.id,
      name: critic.name,
      subtitle: critic.subtitle,
      type: critic.type,
      tags: critic.tags,
      source: "base" as const,
    });
  }

  return selected.slice(0, count);
}

/**
 * Auto-invite persona lenses whose tags strongly match the topic.
 * Respects CouncilRoleSettings limits.
 */
export function autoInviteLenses(
  selected: SelectedRole[],
  allRoles: RoleCard[],
  topic: string,
  settings: CouncilRoleSettings,
): { invited: SelectedRole[]; suggested: SuggestedRole[] } {
  if (!settings.allowAutoInviteLenses) {
    return { invited: [], suggested: [] };
  }

  const topicLower = topic.toLowerCase();
  const selectedIds = new Set(selected.map((r) => r.roleId));
  const remainingSlots = settings.maxActiveRolesPerRound - selected.length;
  const autoInviteBudget = Math.min(settings.maxAutoInviteLenses, remainingSlots);

  if (autoInviteBudget <= 0) {
    // No room for auto-invited lenses, but still compute suggestions
    return { invited: [], suggested: computeSuggestions(allRoles, selectedIds, topicLower, settings, "over_limit") };
  }

  const lenses = allRoles.filter((r) => r.type === "lens" && !selectedIds.has(r.id));

  const scored: Array<{ role: RoleCard; matchCount: number; matchedTags: string[] }> = [];
  for (const lens of lenses) {
    const matchedTags = countMatchedTags(lens, topicLower);
    scored.push({ role: lens, matchCount: matchedTags.length, matchedTags });
  }

  // Sort by match count descending
  scored.sort((a, b) => b.matchCount - a.matchCount);

  const invited: SelectedRole[] = [];
  const suggested: SuggestedRole[] = [];

  for (const item of scored) {
    if (item.matchCount >= settings.autoInviteLensThreshold && invited.length < autoInviteBudget) {
      invited.push({
        roleId: item.role.id,
        name: item.role.name,
        subtitle: item.role.subtitle,
        type: item.role.type,
        tags: item.role.tags,
        source: "auto_invited",
      });
    } else {
      // Goes to suggested roles
      const reason = item.matchCount < settings.autoInviteLensThreshold
        ? `${item.matchCount}/${settings.autoInviteLensThreshold} tags matched`
        : "Auto-invite budget exhausted";
      const blockedBy = item.matchCount < settings.autoInviteLensThreshold
        ? "below_auto_threshold" as const
        : "over_limit" as const;

      suggested.push({
        roleId: item.role.id,
        name: item.role.name,
        subtitle: item.role.subtitle,
        reason,
        score: item.matchCount,
        matchedTags: item.matchedTags,
        inviteMode: "next_round",
        blockedBy,
      });
    }
  }

  return { invited, suggested };
}

/**
 * Compute suggestions for lenses that weren't auto-invited.
 */
function computeSuggestions(
  allRoles: RoleCard[],
  selectedIds: Set<string>,
  topicLower: string,
  settings: CouncilRoleSettings,
  blockedBy: "over_limit" | "below_auto_threshold" | "manual_only" | "already_removed",
): SuggestedRole[] {
  const lenses = allRoles.filter((r) => r.type === "lens" && !selectedIds.has(r.id));
  const suggestions: SuggestedRole[] = [];

  for (const lens of lenses) {
    const matchedTags = countMatchedTags(lens, topicLower);
    if (matchedTags.length > 0) {
      suggestions.push({
        roleId: lens.id,
        name: lens.name,
        subtitle: lens.subtitle,
        reason: `${matchedTags.length} tags matched`,
        score: matchedTags.length,
        matchedTags,
        inviteMode: "next_round",
        blockedBy,
      });
    }
  }

  suggestions.sort((a, b) => b.score - a.score);
  return suggestions;
}

/**
 * Full role selection pipeline.
 * Returns RoleSelectionResult with active roles and suggestions.
 */
export function selectRoles(
  available: RoleCard[],
  topic: string,
  settings: CouncilRoleSettings,
  removedRoleIds: Set<string> = new Set(),
): RoleSelectionResult {
  // Filter out removed roles
  const effectiveAvailable = available.filter((r) => !removedRoleIds.has(r.id));

  // Clamp effective role count
  const effectiveRoleCount = Math.min(settings.roleCount, settings.maxActiveRolesPerRound);

  // Select base roles
  const baseRoles = selectBaseRoles(effectiveAvailable, topic, effectiveRoleCount);

  // Auto-invite lenses (respects remaining budget)
  const { invited, suggested } = autoInviteLenses(baseRoles, effectiveAvailable, topic, settings);

  // Add removed roles to suggestions if they match
  const removedSuggestions = computeSuggestions(
    available.filter((r) => removedRoleIds.has(r.id)),
    new Set(baseRoles.map((r) => r.roleId)),
    topic.toLowerCase(),
    settings,
    "already_removed",
  );

  return {
    activeRoles: [...baseRoles, ...invited],
    suggestedRoles: [...suggested, ...removedSuggestions],
  };
}
