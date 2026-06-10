import React from "react";
import { useTheme } from "../theme/ThemeContext.js";
import { getRoleColor } from "../theme/palettes.js";
import { getRoleAvatarToken } from "./roleAvatar.js";
import {
  capsuleCardStyle,
  avatarStyle,
  nameStyle,
  subtitleStyle,
  domainBadgeStyle,
  checkStyle,
  tagsRowStyle,
  tagStyle,
  reasonStyle,
  infoBtnStyle,
  titleRowStyle,
} from "./styles.js";

export interface RoleCapsuleCardProps {
  roleId: string;
  name: string;
  subtitle?: string;
  domainId?: string;
  domainLabel?: string;
  tags?: string[];
  reason?: string;
  hasBio: boolean;
  selected: boolean;
  onToggle: (roleId: string) => void;
  onInfo: (roleId: string) => void;
}

export const RoleCapsuleCard: React.FC<RoleCapsuleCardProps> = ({
  roleId,
  name,
  subtitle,
  domainId,
  domainLabel,
  tags,
  reason,
  hasBio,
  selected,
  onToggle,
  onInfo,
}) => {
  const { colors } = useTheme();
  const avatar = getRoleAvatarToken({ roleId, domainId });
  const roleColor = getRoleColor(roleId);

  return (
    <button
      type="button"
      style={capsuleCardStyle(colors, roleId, selected)}
      onClick={() => onToggle(roleId)}
      aria-pressed={selected}
      title={subtitle ?? name}
    >
      <div style={avatarStyle(avatar.gradient)} aria-hidden="true">
        {avatar.symbol}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={titleRowStyle}>
          <div style={nameStyle(colors)}>{name}</div>
          {domainLabel && (
            <span style={domainBadgeStyle(colors)}>{domainLabel}</span>
          )}
        </div>
        {subtitle && <div style={subtitleStyle(colors)}>{subtitle}</div>}
        {tags && tags.length > 0 && (
          <div style={tagsRowStyle}>
            {tags.slice(0, 3).map((tag) => (
              <span key={tag} style={tagStyle(colors)}>
                {tag}
              </span>
            ))}
          </div>
        )}
        {reason && <div style={reasonStyle(colors)}>{reason}</div>}
      </div>
      {hasBio && (
        <span
          role="button"
          tabIndex={0}
          style={infoBtnStyle(colors)}
          onClick={(e) => {
            e.stopPropagation();
            onInfo(roleId);
          }}
          onKeyDown={(e) => {
            if (e.key !== "Enter" && e.key !== " ") return;
            e.preventDefault();
            e.stopPropagation();
            onInfo(roleId);
          }}
          aria-label={`查看 ${name} 详情`}
        >
          i
        </span>
      )}
      {selected && (
        <div style={checkStyle(roleColor)} aria-hidden="true">
          ✓
        </div>
      )}
    </button>
  );
};
