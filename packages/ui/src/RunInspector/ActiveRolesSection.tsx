import React from "react";
import type { RoleCard, RoleRoundHistory } from "@agora/shared";
import type { RoleStreamState } from "../CouncilMonitor/CouncilMonitor.js";
import { useRoleDisplay } from "../hooks/useRoleDisplay.js";
import type { ColorPalette } from "../theme/palettes.js";
import { RoleCardItem } from "../FloatingPanel/RoleCardItem.js";
import { Section } from "./Section.js";
import { mutedTextStyle } from "./runInspectorStyles.js";

interface ActiveRolesSectionProps {
  roles: RoleCard[];
  roleStates: Map<string, RoleStreamState>;
  colors: ColorPalette;
  onStopRole?: (roleId: string) => void;
  onRemoveRole?: (roleId: string) => void;
  onJumpToMessage?: (messageId: string) => void;
  roleHistories?: Map<string, RoleRoundHistory[]>;
  panelRef?: React.RefObject<HTMLDivElement | null>;
}

const ActiveRoleRow: React.FC<{
  role: RoleCard;
  state?: RoleStreamState;
  onStopRole?: (roleId: string) => void;
  onRemoveRole?: (roleId: string) => void;
  onJumpToMessage?: (messageId: string) => void;
  colors: ColorPalette;
  history?: RoleRoundHistory[];
  panelRef?: React.RefObject<HTMLDivElement | null>;
}> = ({ role, state, onStopRole, onRemoveRole, onJumpToMessage, colors, history, panelRef }) => {
  const { displayName, displaySubtitle } = useRoleDisplay(role);
  return (
    <RoleCardItem
      roleId={role.id}
      roleName={displayName}
      description={displaySubtitle}
      state={state}
      onStopTurn={state?.status !== "done" ? () => onStopRole?.(role.id) : undefined}
      onRemove={() => onRemoveRole?.(role.id)}
      onJumpToMessage={onJumpToMessage}
      colors={colors}
      history={history}
      panelRef={panelRef}
    />
  );
};

export const ActiveRolesSection: React.FC<ActiveRolesSectionProps> = ({
  roles,
  roleStates,
  colors,
  onStopRole,
  onRemoveRole,
  onJumpToMessage,
  roleHistories,
  panelRef,
}) => (
  <Section title={`Active roles (${roles.length})`} colors={colors}>
    {roles.length === 0 ? (
      <div style={mutedTextStyle(colors)}>No roles active.</div>
    ) : roles.map((role) => {
      const state = roleStates.get(role.id);
      return (
        <ActiveRoleRow
          key={role.id}
          role={role}
          state={state}
          onStopRole={onStopRole}
          onRemoveRole={onRemoveRole}
          onJumpToMessage={onJumpToMessage}
          colors={colors}
          history={roleHistories?.get(role.id)}
          panelRef={panelRef}
        />
      );
    })}
  </Section>
);
