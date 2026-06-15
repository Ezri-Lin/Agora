import React, { useMemo } from "react";
import type { RoleCard, SuggestedPerspective } from "@agora/shared";
import { useI18n } from "../i18n/I18nContext.js";
import { useRoleDisplay } from "../hooks/useRoleDisplay.js";
import { useTheme } from "../theme/ThemeContext.js";
import type { ColorPalette } from "../theme/palettes.js";
import { radius, spacing, typography } from "../theme/tokens.js";
import { Section } from "./Section.js";
import { actionButtonStyle, mutedTextStyle } from "./runInspectorStyles.js";

interface SuggestedRolesSectionProps {
  allRoles: RoleCard[];
  activeRoleIds: Set<string>;
  userMessage?: string;
  suggestedPerspectives?: SuggestedPerspective[];
  onInvite?: (roleId: string) => void;
  onAddPerspective?: (roleId: string, roleName: string) => void;
}

const MAX_SUGGESTIONS = 4;

const SuggestionCard: React.FC<{
  role: RoleCard;
  reason?: string;
  colors: ColorPalette;
  onAddPerspective?: (roleId: string, roleName: string) => void;
  onInvite?: (roleId: string) => void;
}> = ({ role, reason, colors, onAddPerspective, onInvite }) => {
  const { t } = useI18n();
  const { displayName, displaySubtitle } = useRoleDisplay(role);
  return (
    <div style={suggestionCardStyle(colors)}>
      <div style={suggestionHeaderStyle}>
        <div style={{ minWidth: 0 }}>
          <div style={roleNameStyle(colors)}>{displayName}</div>
          <div style={roleTypeStyle(colors)}>{role.type}</div>
        </div>
        {(onAddPerspective || onInvite) && (
          <button
            type="button"
            aria-label={`Add ${displayName}`}
            style={actionButtonStyle(colors)}
            onClick={() => onAddPerspective?.(role.id, displayName) ?? onInvite?.(role.id)}
          >
            {t.addPerspective ?? "Add"}
          </button>
        )}
      </div>
      <div style={mutedTextStyle(colors)}>{reason || displaySubtitle}</div>
    </div>
  );
};

export const SuggestedRolesSection: React.FC<SuggestedRolesSectionProps> = ({
  allRoles,
  activeRoleIds,
  userMessage,
  suggestedPerspectives,
  onInvite,
  onAddPerspective,
}) => {
  const { colors } = useTheme();
  const { t } = useI18n();
  const suggestions = useMemo(
    () => buildSuggestions(allRoles, activeRoleIds, userMessage, suggestedPerspectives),
    [activeRoleIds, allRoles, suggestedPerspectives, userMessage],
  );

  if (suggestions.length === 0) return null;

  return (
    <Section title={t.suggestedPerspectives ?? "Suggested perspectives"} colors={colors}>
      <div style={suggestionListStyle}>
        {suggestions.map(({ role, reason }) => (
          <SuggestionCard key={role.id} role={role} reason={reason} colors={colors} onAddPerspective={onAddPerspective} onInvite={onInvite} />
        ))}
      </div>
    </Section>
  );
};

function buildSuggestions(
  allRoles: RoleCard[],
  activeRoleIds: Set<string>,
  userMessage?: string,
  suggestedPerspectives?: SuggestedPerspective[],
): Array<{ role: RoleCard; score: number; reason?: string }> {
  if (suggestedPerspectives && suggestedPerspectives.length > 0) {
    return suggestedPerspectives
      .flatMap((suggestion) => {
        const role = allRoles.find(
          (candidate) => !activeRoleIds.has(candidate.id) && (
            (suggestion.personaId && candidate.id === suggestion.personaId) ||
            candidate.id === suggestion.familyId
          ),
        );
        return role ? [{ role, score: suggestion.score, reason: suggestion.reason }] : [];
      })
      .slice(0, MAX_SUGGESTIONS);
  }

  if (!userMessage) return [];
  const keywords = extractKeywords(userMessage);
  if (keywords.size === 0) return [];

  const activeTypes = new Set(allRoles.filter((role) => activeRoleIds.has(role.id)).map((role) => role.type));
  return allRoles
    .filter((role) => !activeRoleIds.has(role.id))
    .map((role) => ({ role, score: scoreRole(role, keywords, activeTypes) }))
    .filter((candidate) => candidate.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_SUGGESTIONS);
}

function extractKeywords(text: string): Set<string> {
  const words = text
    .toLowerCase()
    .replace(/[^\w\u4e00-\u9fff]+/g, " ")
    .split(/\s+/)
    .filter((word) => word.length >= 2);
  return new Set(words);
}

function scoreRole(role: RoleCard, keywords: Set<string>, activeTypes: Set<string>): number {
  let score = activeTypes.has(role.type) ? 0 : 2;
  for (const tag of role.tags) {
    if (keywords.has(tag.toLowerCase())) score += 3;
  }
  const searchable = `${role.name} ${role.subtitle}`.toLowerCase();
  for (const keyword of keywords) {
    if (searchable.includes(keyword)) score += 1;
  }
  return score;
}

const suggestionListStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: spacing.sm,
};

const suggestionHeaderStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: spacing.sm,
};

function suggestionCardStyle(colors: ColorPalette): React.CSSProperties {
  return {
    display: "flex",
    flexDirection: "column",
    gap: spacing.xs,
    padding: `${spacing.sm}px ${spacing.md}px`,
    borderRadius: radius.sm,
    border: `1px solid ${colors.border}`,
    background: colors.bg,
  };
}

function roleNameStyle(colors: ColorPalette): React.CSSProperties {
  return {
    color: colors.text,
    fontSize: typography.meta.size,
    fontWeight: 700,
    lineHeight: typography.meta.lineHeight,
  };
}

function roleTypeStyle(colors: ColorPalette): React.CSSProperties {
  return {
    color: colors.textMuted,
    fontSize: typography.badge.size,
    fontWeight: typography.badge.weight,
    letterSpacing: typography.badge.tracking,
    lineHeight: typography.badge.lineHeight,
    textTransform: "uppercase",
  };
}
