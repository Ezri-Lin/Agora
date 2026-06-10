import React from "react";
import { useTheme } from "../theme/ThemeContext.js";
import { getRoleAvatarToken } from "./roleAvatar.js";
import { buildRoleBioView, type RoleBioView } from "./roleBio.js";
import type { RoleViewModel } from "./CouncilDispatchGate.js";
import {
  bioPanelStyle,
  bioHeaderStyle,
  bioAvatarLgStyle,
  bioNameStyle,
  bioSubtitleStyle,
  bioMetaRowStyle,
  bioSectionLabelStyle,
  bioSectionListStyle,
  bioReasonStyle,
  bioCloseBtnStyle,
  bioBodyTextStyle,
  bioSectionStyle,
  bioEmptyStyle,
} from "./styles.js";

export interface RoleBioPopoverProps {
  role: RoleViewModel;
  onClose: () => void;
}

export const RoleBioPopover: React.FC<RoleBioPopoverProps> = ({
  role,
  onClose,
}) => {
  const { colors } = useTheme();
  const avatar = getRoleAvatarToken({ roleId: role.id, domainId: role.domainId });
  const view: RoleBioView = buildRoleBioView(role);

  return (
    <div style={bioPanelStyle(colors)}>
      {/* Header */}
      <div style={bioHeaderStyle}>
        <div style={bioAvatarLgStyle(avatar.gradient)} aria-hidden="true">
          {avatar.symbol}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={bioNameStyle(colors)}>{role.name}</div>
          {role.subtitle && <div style={bioSubtitleStyle(colors)}>{role.subtitle}</div>}
          <div style={bioMetaRowStyle(colors)}>
            {role.domainLabel && <span>{role.domainLabel}</span>}
            {role.familyLabel && <span>{role.familyLabel}</span>}
          </div>
        </div>
        <button
          type="button"
          style={bioCloseBtnStyle(colors)}
          onClick={onClose}
          aria-label="关闭"
        >
          ✕
        </button>
      </div>

      {/* Reason */}
      {view.reason && (
        <div style={bioReasonStyle(colors)}>
          <span style={{ fontWeight: 600 }}>为什么推荐：</span>
          {view.reason}
        </div>
      )}

      {/* Bio */}
      {view.bio && (
        <div style={bioBodyTextStyle(colors)}>
          {view.bio}
        </div>
      )}

      {/* Sections */}
      {view.sections.map((section) => (
        <div key={section.label} style={bioSectionStyle}>
          <div style={bioSectionLabelStyle(colors)}>{section.label}</div>
          <ul style={bioSectionListStyle(colors)}>
            {section.items.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
        </div>
      ))}

      {/* Fallback */}
      {!view.hasContent && (
        <div style={bioEmptyStyle(colors)}>
          暂无详细信息
        </div>
      )}
    </div>
  );
};
