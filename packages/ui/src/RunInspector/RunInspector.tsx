import React, { useMemo } from "react";
import { useTheme } from "../theme/ThemeContext.js";
import { ActiveRolesSection } from "./ActiveRolesSection.js";
import type { RunInspectorProps } from "./types.js";

export const RunInspector: React.FC<RunInspectorProps> = ({
  visible,
  roleStreamStates,
  roles,
  messages,
  onToggle,
  onStopRole,
  onRemoveRole,
  onJumpToMessage,
}) => {
  const { colors } = useTheme();

  const activeRoleIds = useMemo(() => {
    const ids = new Set(roleStreamStates.keys());
    for (const msg of messages) {
      if (msg.senderType === "role" && msg.status !== "error") {
        ids.add(msg.senderId);
      }
    }
    return ids;
  }, [messages, roleStreamStates]);

  const activeRoleCards = useMemo(
    () => roles.filter((role) => activeRoleIds.has(role.id)),
    [activeRoleIds, roles],
  );

  if (!visible) return null;

  return (
    <aside className="inspector" style={{ display: visible ? "block" : "none" }}>
      <div className="inspector-head">
        <b>Roles</b>
        <label className="close" onClick={onToggle} style={{ cursor: "pointer" }}>×</label>
      </div>

      <div className="ins-scroll">
        <ActiveRolesSection
          roles={activeRoleCards}
          roleStates={roleStreamStates}
          colors={colors}
          onStopRole={onStopRole}
          onRemoveRole={onRemoveRole}
          onJumpToMessage={onJumpToMessage}
        />
      </div>
    </aside>
  );
};

export type { ContextDebug, RunInspectorProps } from "./types.js";
