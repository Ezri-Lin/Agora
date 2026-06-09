import React, { useMemo } from "react";
import type { CouncilMessage, RoleCard } from "@agora/shared";
import { useTheme } from "../theme/ThemeContext.js";
import { useI18n } from "../i18n/I18nContext.js";
import { getRoleColor, USER_COLOR } from "../theme/palettes.js";
import { createRoleMessageStyles } from "./roleMessageStyles.js";
import { MessageBubble, RoleAvatar, RoleMessageHeader, ThinkingBlock, type RoleMeta } from "./RoleMessage.parts.js";

interface RoleMessageProps {
  message: CouncilMessage;
  roles?: RoleCard[];
  streaming?: boolean;
  expanded?: boolean;
  onToggle?: () => void;
}

function truncate(s: string, max: number): string {
  const clean = s.replace(/[#*_`>\-\n]+/g, " ").trim();
  return clean.length > max ? `${clean.slice(0, max)}...` : clean;
}

function formatTime(iso: string): string {
  try {
    const date = new Date(iso);
    const hours = date.getHours().toString().padStart(2, "0");
    const minutes = date.getMinutes().toString().padStart(2, "0");
    return `${hours}:${minutes}`;
  } catch {
    return "";
  }
}

export const RoleMessage: React.FC<RoleMessageProps> = ({
  message,
  roles,
  streaming,
  expanded = true,
  onToggle,
}) => {
  const { colors } = useTheme();
  const { t } = useI18n();
  const styles = createRoleMessageStyles(colors);

  const roleMetaMap = useMemo(() => {
    const map = new Map<string, RoleMeta>();
    map.set("user", { name: t.you, subtitle: "", color: USER_COLOR });
    map.set("moderator", { name: t.moderator, subtitle: "", color: getRoleColor("moderator") });
    for (const role of roles ?? []) {
      map.set(role.id, {
        name: role.name,
        subtitle: role.subtitle,
        color: getRoleColor(role.id),
      });
    }
    return map;
  }, [roles, t.you, t.moderator]);

  const isUser = message.senderType === "user";
  const isError = message.status === "error";

  if (isError) {
    const roleName = message.targetRoleId
      ? (roleMetaMap.get(message.targetRoleId)?.name ?? message.targetRoleId)
      : "Unknown";
    return (
      <div id={message.id} style={styles.errorRow}>
        <RoleAvatar meta={{ name: "!", subtitle: "", color: colors.danger }} colors={colors} />
        <div style={styles.errorContent}>
          <div style={styles.errorTitle}>{roleName} - {message.errorCode ?? "error"}</div>
          <div style={styles.errorBody}>{message.errorMessage ?? message.content}</div>
        </div>
      </div>
    );
  }

  const meta = roleMetaMap.get(message.senderId) ?? {
    name: message.senderId,
    subtitle: "",
    color: colors.textMuted,
  };
  const preview = message.graphSummary || truncate(message.content, 200);

  return (
    <div id={message.id} style={{ ...styles.row, flexDirection: isUser ? "row-reverse" : "row" }}>
      <RoleAvatar meta={meta} colors={colors} active={streaming} />
      <div style={styles.content}>
        <RoleMessageHeader
          meta={meta}
          timestamp={message.createdAt ? formatTime(message.createdAt) : undefined}
          cursor={onToggle ? "pointer" : "default"}
          styles={styles}
          onToggle={onToggle}
        />
        {!expanded && !isUser && (
          <div style={styles.preview} onClick={onToggle}>
            {message.graphSummary && <span style={styles.summaryBadge}>Summary</span>}
            {preview}
            {onToggle && <span style={styles.expandIndicator}>v</span>}
          </div>
        )}
        {expanded && (
          <div style={styles.bubbleWrapper} onClick={onToggle}>
            {message.thinking?.trim() && (
              <ThinkingBlock thinking={message.thinking} colors={colors} styles={styles} />
            )}
            <MessageBubble
              content={message.content}
              colors={colors}
              meta={meta}
              isUser={isUser}
              streaming={streaming}
              styles={styles}
            />
            {onToggle && <div style={styles.collapseHint}>^</div>}
          </div>
        )}
      </div>
    </div>
  );
};
