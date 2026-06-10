import React from "react";
import type { RoleCard, RoleRoundHistory } from "@agora/shared";
import type { RoleStreamState } from "../CouncilMonitor/CouncilMonitor.js";
import type { ColorPalette } from "../theme/palettes.js";
import { RoleCardItem } from "../FloatingPanel/RoleCardItem.js";
import { Section } from "./Section.js";
import { mutedTextStyle } from "./runInspectorStyles.js";

interface ActiveRolesSectionProps {
  roles: RoleCard[];
  roleStates: Map<string, RoleStreamState>;
  roleHistories?: Map<string, RoleRoundHistory[]>;
  colors: ColorPalette;
  panelRef: React.RefObject<HTMLDivElement | null>;
  onStopRole?: (roleId: string) => void;
  onRemoveRole?: (roleId: string) => void;
  onJumpToMessage?: (messageId: string) => void;
}

export const ActiveRolesSection: React.FC<ActiveRolesSectionProps> = ({
  roles,
  roleStates,
  roleHistories,
  colors,
  panelRef,
  onStopRole,
  onRemoveRole,
  onJumpToMessage,
}) => (
  <Section title={`Active roles (${roles.length})`} colors={colors}>
    {roles.length === 0 ? (
      <div style={mutedTextStyle(colors)}>No roles active.</div>
    ) : roles.map((role) => {
      const state = roleStates.get(role.id);
      return (
        <RoleCardItem
          key={role.id}
          roleId={role.id}
          roleName={role.name}
          description={role.subtitle}
          state={state}
          history={roleHistories?.get(role.id) ?? []}
          onStopTurn={state?.status !== "done" ? () => onStopRole?.(role.id) : undefined}
          onRemove={() => onRemoveRole?.(role.id)}
          onJumpToMessage={onJumpToMessage}
          colors={colors}
          panelRef={panelRef}
        />
      );
    })}
  </Section>
);
