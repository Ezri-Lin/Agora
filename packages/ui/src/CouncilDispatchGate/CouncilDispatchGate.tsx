import React, { useMemo, useState } from "react";
import { useTheme } from "../theme/ThemeContext.js";
import { ModeratorDispatchSummary } from "./ModeratorDispatchSummary.js";
import { RoleSearchBox } from "./RoleSearchBox.js";
import { RoleCapsuleCard } from "./RoleCapsuleCard.js";
import { RoleBioPopover } from "./RoleBioPopover.js";
import { DispatchGateFooter } from "./DispatchGateFooter.js";
import { searchRoles } from "./searchRoles.js";
import {
  scrollBodyStyle,
  sectionTitleStyle,
  gridStyle,
  emptySearchStyle,
} from "./styles.js";
import type { ColorPalette } from "../theme/palettes.js";
import { spacing, typography } from "../theme/tokens.js";

const councilValueStyle = (colors: ColorPalette): React.CSSProperties => ({
  padding: `${spacing.sm}px ${spacing.md}px`,
  marginBottom: spacing.md,
  borderRadius: 6,
  background: colors.surface,
  border: `1px solid ${colors.border}`,
  fontSize: typography.chatBody.size,
  color: colors.textMuted,
  lineHeight: 1.5,
});

const softWarningStyle = (colors: ColorPalette): React.CSSProperties => ({
  padding: `${spacing.xs}px ${spacing.md}px`,
  fontSize: typography.meta.size,
  color: "#f59e0b",
  textAlign: "center" as const,
});

export interface CouncilDispatchPreviewViewModel {
  moderatorSummary: string;
  councilValueReason?: string[];
  defaultSelectedRoleIds: string[];
  alternativeRoleIds: string[];
  softSelectionWarningThreshold?: number;
}

export interface RoleViewModel {
  id: string;
  name: string;
  subtitle?: string;
  domainId?: string;
  domainLabel?: string;
  familyId?: string;
  familyLabel?: string;
  tags?: string[];
  aliases?: string[];
  reason?: string;
  source?: "recommended" | "alternative";
  bio?: string;
  responsibilities?: string[];
  strengths?: string[];
  boundaries?: string[];
  decisionRights?: string[];
}

export interface CouncilDispatchGateProps {
  preview: CouncilDispatchPreviewViewModel;
  roles: RoleViewModel[];
  selectedRoleIds: string[];
  onSelectionChange: (roleIds: string[]) => void;
  onCancel: () => void;
  onContinue: (selectedRoleIds: string[]) => void;
}

function hasBioContent(role: RoleViewModel): boolean {
  return Boolean(
    role.bio ||
    role.reason ||
    (role.responsibilities && role.responsibilities.length > 0) ||
    (role.strengths && role.strengths.length > 0) ||
    (role.boundaries && role.boundaries.length > 0) ||
    (role.decisionRights && role.decisionRights.length > 0),
  );
}

export const CouncilDispatchGate: React.FC<CouncilDispatchGateProps> = ({
  preview,
  roles,
  selectedRoleIds,
  onSelectionChange,
  onCancel,
  onContinue,
}) => {
  const { colors } = useTheme();
  const [query, setQuery] = useState("");
  const [bioRoleId, setBioRoleId] = useState<string | null>(null);

  const roleMap = useMemo(() => {
    const map = new Map<string, RoleViewModel>();
    for (const r of roles) map.set(r.id, r);
    return map;
  }, [roles]);

  const allRecommended = preview.defaultSelectedRoleIds
    .map((id) => roleMap.get(id))
    .filter(Boolean) as RoleViewModel[];

  const allAlternative = preview.alternativeRoleIds
    .map((id) => roleMap.get(id))
    .filter(Boolean) as RoleViewModel[];

  const recommendedRoles = searchRoles(allRecommended, query);
  const alternativeRoles = searchRoles(allAlternative, query);

  const hasResults = recommendedRoles.length > 0 || alternativeRoles.length > 0;
  const selectedSet = useMemo(() => new Set(selectedRoleIds), [selectedRoleIds]);

  const bioRole = bioRoleId ? roleMap.get(bioRoleId) : null;

  const toggle = (roleId: string) => {
    if (selectedSet.has(roleId)) {
      onSelectionChange(selectedRoleIds.filter((id) => id !== roleId));
    } else {
      onSelectionChange([...selectedRoleIds, roleId]);
    }
  };

  const renderCard = (role: RoleViewModel) => (
    <RoleCapsuleCard
      key={role.id}
      roleId={role.id}
      name={role.name}
      subtitle={role.subtitle}
      domainId={role.domainId}
      domainLabel={role.domainLabel}
      tags={role.tags}
      reason={role.reason}
      hasBio={hasBioContent(role)}
      selected={selectedSet.has(role.id)}
      onToggle={toggle}
      onInfo={setBioRoleId}
    />
  );

  const threshold = preview.softSelectionWarningThreshold ?? 6;
  const showSoftWarning = selectedRoleIds.length > threshold;

  return (
    <>
      <div style={scrollBodyStyle}>
        <ModeratorDispatchSummary summary={preview.moderatorSummary} />

        {preview.councilValueReason && preview.councilValueReason.length > 0 && (
          <div style={councilValueStyle(colors)}>
            {preview.councilValueReason.map((r, i) => (
              <div key={i}>{r}</div>
            ))}
          </div>
        )}

        <RoleSearchBox value={query} onChange={setQuery} />

        {bioRole && (
          <RoleBioPopover
            role={bioRole}
            onClose={() => setBioRoleId(null)}
          />
        )}

        {recommendedRoles.length > 0 && (
          <div>
            <div style={sectionTitleStyle(colors)}>建议参与者</div>
            <div style={gridStyle}>
              {recommendedRoles.map(renderCard)}
            </div>
          </div>
        )}

        {alternativeRoles.length > 0 && (
          <div>
            <div style={sectionTitleStyle(colors)}>可选参与者</div>
            <div style={gridStyle}>
              {alternativeRoles.map(renderCard)}
            </div>
          </div>
        )}

        {!hasResults && query.trim() && (
          <div style={emptySearchStyle(colors)}>没有找到匹配角色</div>
        )}
      </div>

      {showSoftWarning && (
        <div style={softWarningStyle(colors)}>
          已选择 {selectedRoleIds.length} 个角色。角色越多讨论越全面，但也会更慢、更容易发散。
        </div>
      )}

      <DispatchGateFooter
        selectedCount={selectedRoleIds.length}
        onCancel={onCancel}
        onContinue={() => onContinue(selectedRoleIds)}
      />
    </>
  );
};
