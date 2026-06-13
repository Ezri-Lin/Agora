import React from "react";
import type { RoleCard } from "@agora/shared";
import type { RoleStreamState } from "../CouncilMonitor/CouncilMonitor.js";
import type { ColorPalette } from "../theme/palettes.js";
import { getRoleColor } from "../theme/palettes.js";
import { spacing, typography, radius } from "../theme/tokens.js";
import { Section } from "./Section.js";
import { TextShimmer } from "../AgentTools/TextShimmer.js";
import { mutedTextStyle } from "./runInspectorStyles.js";

interface ProgressSectionProps {
  roles: RoleCard[];
  roleStates: Map<string, RoleStreamState>;
  colors: ColorPalette;
}

export const ProgressSection: React.FC<ProgressSectionProps> = ({ roles, roleStates, colors }) => {
  const activeRoles = roles.filter((role) => roleStates.has(role.id));

  return (
    <Section title="Current run" colors={colors}>
      {activeRoles.length === 0 ? (
        <div style={mutedTextStyle(colors)}>Waiting for role activity.</div>
      ) : activeRoles.map((role) => {
        const state = roleStates.get(role.id)!;
        const accent = getRoleColor(role.id);
        return (
          <div key={role.id} style={rowStyle(colors)}>
            <span style={dotStyle(accent, state.status === "thinking" || state.status === "streaming")} />
            <div style={bodyStyle}>
              <div style={metaRowStyle}>
                <span style={nameStyle(colors)}>{role.name}</span>
                <span style={statusStyle(colors)}>{state.status}</span>
              </div>
              {state.microSummary && (
                state.status === "thinking" || state.status === "streaming" ? (
                  <TextShimmer style={{ ...mutedTextStyle(colors), margin: 0 }} duration={2.5}>
                    {state.microSummary}
                  </TextShimmer>
                ) : (
                  <div style={mutedTextStyle(colors)}>{state.microSummary}</div>
                )
              )}
            </div>
          </div>
        );
      })}
    </Section>
  );
};

const rowStyle = (colors: ColorPalette): React.CSSProperties => ({
  display: "flex",
  alignItems: "flex-start",
  gap: spacing.sm,
  padding: `${spacing.xs}px 0`,
  borderBottom: `1px solid ${colors.border}`,
});

const dotStyle = (accent: string, active: boolean): React.CSSProperties => ({
  width: 9,
  height: 9,
  borderRadius: radius.pill,
  background: accent,
  boxShadow: active ? `0 0 0 4px ${accent}20` : "none",
  flexShrink: 0,
  marginTop: 4,
});

const bodyStyle: React.CSSProperties = {
  flex: 1,
  minWidth: 0,
};

const metaRowStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: spacing.sm,
};

const nameStyle = (colors: ColorPalette): React.CSSProperties => ({
  color: colors.text,
  fontSize: typography.meta.size,
  fontWeight: 700,
});

const statusStyle = (colors: ColorPalette): React.CSSProperties => ({
  color: colors.textMuted,
  fontSize: typography.badge.size,
  fontWeight: 700,
  textTransform: "uppercase",
});
