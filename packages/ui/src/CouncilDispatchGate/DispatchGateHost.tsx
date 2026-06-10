import React, { useMemo } from "react";
import { getPersonaContract } from "@agora/roles";
import type { DispatchGateContext } from "../hooks/councilStateTypes.js";
import { useTheme } from "../theme/ThemeContext.js";
import { CouncilDispatchGate, type RoleViewModel } from "./CouncilDispatchGate.js";
import { getDomainLabel } from "./roleAvatar.js";
import { overlayStyle, panelStyle } from "./styles.js";

interface DispatchGateHostProps {
  context: DispatchGateContext;
  selectedRoleIds: string[];
  onSelectionChange: (roleIds: string[]) => void;
  onCancel: () => void;
  onContinue: (selectedRoleIds: string[]) => void;
}

export const DispatchGateHost: React.FC<DispatchGateHostProps> = ({
  context,
  selectedRoleIds,
  onSelectionChange,
  onCancel,
  onContinue,
}) => {
  const { colors } = useTheme();
  const roles = useMemo(() => buildRoleViewModels(context), [context]);

  return (
    <div style={overlayStyle(colors)} onClick={onCancel}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="选择参与者"
        style={panelStyle(colors)}
        onClick={(event) => event.stopPropagation()}
      >
        <CouncilDispatchGate
          preview={{
            moderatorSummary: context.preview.moderatorSummary,
            defaultSelectedRoleIds: context.preview.defaultSelectedRoleIds,
            alternativeRoleIds: context.preview.alternativeRoleIds,
          }}
          roles={roles}
          selectedRoleIds={selectedRoleIds}
          onSelectionChange={onSelectionChange}
          onCancel={onCancel}
          onContinue={onContinue}
        />
      </div>
    </div>
  );
};

function buildRoleViewModels(context: DispatchGateContext): RoleViewModel[] {
  const reasonMap = new Map<string, string>();
  for (const score of context.preview.routingDecision.scores) {
    if (score.reason) reasonMap.set(score.personaId, score.reason);
  }
  for (const entrant of context.preview.routingDecision.activeEntrants) {
    if (entrant.reason) reasonMap.set(entrant.roleId, entrant.reason);
  }

  return context.allRoles.map((role): RoleViewModel => {
    const contract = getPersonaContract(role.id);
    return {
      id: role.id,
      name: role.name,
      subtitle: role.subtitle,
      domainId: role.domainId,
      domainLabel: role.domainId ? getDomainLabel(role.domainId) : undefined,
      familyId: role.familyId,
      tags: role.tags,
      reason: reasonMap.get(role.id),
      source: context.preview.defaultSelectedRoleIds.includes(role.id)
        ? "recommended"
        : context.preview.alternativeRoleIds.includes(role.id)
          ? "alternative"
          : undefined,
      bio: contract?.mission,
      responsibilities: contract
        ? [...contract.responsibilities.must, ...contract.responsibilities.should]
        : undefined,
      strengths: contract?.responsibilities.must,
      boundaries: contract
        ? [...contract.responsibilities.mustNot, ...contract.boundaries]
        : undefined,
      decisionRights: contract?.decisionRights.may,
    };
  });
}
