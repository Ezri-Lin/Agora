import React, { useMemo } from "react";
import type { RoleCard } from "@agora/shared";
import { useTheme } from "../theme/ThemeContext.js";
import { useI18n } from "../i18n/I18nContext.js";
import type { ColorPalette } from "../theme/palettes.js";

interface SuggestedRolesSectionProps {
  allRoles: RoleCard[];
  activeRoleIds: Set<string>;
  userMessage?: string;
  onInvite?: (roleId: string) => void;
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
  onInvite,
}) => {
  const { colors } = useTheme();
  const { t } = useI18n();

  const suggestions = useMemo(() => {
    if (!userMessage) return [];
    const keywords = extractKeywords(userMessage);
    if (keywords.size === 0) return [];

    // Collect active types for diversity scoring
    const activeTypes = new Set<string>();
    for (const role of allRoles) {
      if (activeRoleIds.has(role.id)) activeTypes.add(role.type);
    }

    // Score and filter candidates
    const candidates = allRoles
      .filter((r) => !activeRoleIds.has(r.id))
      .map((r) => ({ role: r, score: scoreRole(r, keywords, activeTypes) }))
      .filter((c) => c.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, MAX_SUGGESTIONS);

    return candidates;
  }, [allRoles, activeRoleIds, userMessage]);

  if (suggestions.length === 0) return null;

  return (
    <div style={wrapStyle}>
      {suggestions.map(({ role }) => (
        <div key={role.id} style={cardStyle(colors)}>
          <div style={cardInfoStyle}>
            <span style={roleNameStyle(colors)}>{role.name}</span>
            <span style={roleTypeStyle(colors)}>{role.type}</span>
          </div>
          {role.subtitle && <div style={subtitleStyle(colors)}>{role.subtitle}</div>}
          {onInvite && (
            <button style={inviteBtnStyle(colors)} onClick={() => onInvite(role.id)}>
              {t.inviteNextRound ?? "Invite"}
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
