import React, { useMemo } from "react";
import type { RoleCard, SuggestedPerspective } from "@agora/shared";
import { useTheme } from "../theme/ThemeContext.js";
import { useI18n } from "../i18n/I18nContext.js";
import type { ColorPalette } from "../theme/palettes.js";

interface SuggestedRolesSectionProps {
  allRoles: RoleCard[];
  activeRoleIds: Set<string>;
  userMessage?: string;
  suggestedPerspectives?: SuggestedPerspective[];
  onInvite?: (roleId: string) => void;
  onAddPerspective?: (roleId: string, roleName: string) => void;
}

function extractKeywords(text: string): Set<string> {
  const words = text
    .toLowerCase()
    .replace(/[^\w\u4e00-\u9fff]+/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 2);
  return new Set(words);
}

function scoreRole(role: RoleCard, keywords: Set<string>, activeTypes: Set<string>): number {
  let score = 0;
  // Tag overlap with keywords
  for (const tag of role.tags) {
    if (keywords.has(tag.toLowerCase())) score += 3;
  }
  // Type diversity bonus — prefer types not yet active
  if (!activeTypes.has(role.type)) score += 2;
  // Name/subtitle contains keyword
  const nameLower = (role.name + " " + role.subtitle).toLowerCase();
  for (const kw of keywords) {
    if (nameLower.includes(kw)) score += 1;
  }
  return score;
}

const MAX_SUGGESTIONS = 4;

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

  const suggestions = useMemo(() => {
    // Primary path: use kernel routing suggestions when available
    if (suggestedPerspectives && suggestedPerspectives.length > 0) {
      const results: { role: RoleCard; score: number; reason?: string }[] = [];
      for (const sp of suggestedPerspectives) {
        // Match by personaId first, then familyId
        const match = allRoles.find(
          (r) => !activeRoleIds.has(r.id) && (
            (sp.personaId && r.id === sp.personaId) ||
            r.id === sp.familyId
          ),
        );
        if (match) {
          results.push({ role: match, score: sp.score, reason: sp.reason });
        }
      }
      return results.slice(0, MAX_SUGGESTIONS);
    }

    // Fallback: client-side tag-count scoring (local/demo mode, no routing decision)
    if (!userMessage) return [];
    const keywords = extractKeywords(userMessage);
    if (keywords.size === 0) return [];

    const activeTypes = new Set<string>();
    for (const role of allRoles) {
      if (activeRoleIds.has(role.id)) activeTypes.add(role.type);
    }

    const candidates: { role: RoleCard; score: number; reason?: string }[] = allRoles
      .filter((r) => !activeRoleIds.has(r.id))
      .map((r) => ({ role: r, score: scoreRole(r, keywords, activeTypes) }))
      .filter((c) => c.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, MAX_SUGGESTIONS);

    return candidates;
  }, [allRoles, activeRoleIds, userMessage, suggestedPerspectives]);

  if (suggestions.length === 0) return null;

  return (
    <div style={wrapStyle}>
      <div style={sectionLabelStyle(colors)}>
        {t.suggestedPerspectives ?? "Suggested perspectives"}
      </div>
      {suggestions.map(({ role, reason }) => (
        <div key={role.id} style={cardStyle(colors)}>
          <div style={cardInfoStyle}>
            <span style={roleNameStyle(colors)}>{role.name}</span>
            <span style={roleTypeStyle(colors)}>{role.type}</span>
          </div>
          {reason
            ? <div style={subtitleStyle(colors)}>{reason}</div>
            : role.subtitle && <div style={subtitleStyle(colors)}>{role.subtitle}</div>
          }
          {(onAddPerspective || onInvite) && (
            <button
              style={inviteBtnStyle(colors)}
              onClick={() => onAddPerspective?.(role.id, role.name) ?? onInvite?.(role.id)}
            >
              {t.addPerspective ?? "Add"}
            </button>
          )}
        </div>
      ))}
    </div>
  );
};

// --- Styles ---

const wrapStyle: React.CSSProperties = {
  padding: "6px 12px 10px",
  display: "flex",
  flexDirection: "column",
  gap: 6,
};

const sectionLabelStyle = (colors: ColorPalette): React.CSSProperties => ({
  fontSize: 10,
  fontWeight: 600,
  color: colors.textMuted,
  textTransform: "uppercase",
  letterSpacing: 0.5,
  marginBottom: 2,
});

const cardStyle = (colors: ColorPalette): React.CSSProperties => ({
  display: "flex",
  flexDirection: "column",
  gap: 3,
  padding: "6px 8px",
  background: colors.surface,
  border: `1px solid ${colors.border}`,
  borderRadius: 6,
});

const cardInfoStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "baseline",
  gap: 6,
};

const roleNameStyle = (colors: ColorPalette): React.CSSProperties => ({
  fontSize: 11,
  fontWeight: 600,
  color: colors.text,
});

const roleTypeStyle = (colors: ColorPalette): React.CSSProperties => ({
  fontSize: 9,
  color: colors.accent,
  textTransform: "uppercase",
  letterSpacing: 0.3,
});

const subtitleStyle = (colors: ColorPalette): React.CSSProperties => ({
  fontSize: 10,
  color: colors.textMuted,
  lineHeight: 1.3,
});

const inviteBtnStyle = (colors: ColorPalette): React.CSSProperties => ({
  alignSelf: "flex-start",
  marginTop: 2,
  padding: "3px 10px",
  fontSize: 10,
  fontWeight: 600,
  background: "none",
  border: `1px solid ${colors.accent}`,
  borderRadius: 4,
  color: colors.accent,
  cursor: "pointer",
});
