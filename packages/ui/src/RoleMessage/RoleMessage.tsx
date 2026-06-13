import React, { useMemo } from "react";
import type { CouncilMessage, RoleCard } from "@agora/shared";
import { useTheme } from "../theme/ThemeContext.js";
import { useI18n } from "../i18n/I18nContext.js";
import { getRoleColor, USER_COLOR } from "../theme/palettes.js";
import { createRoleMessageStyles } from "./roleMessageStyles.js";
import { MessageContent } from "../ChatBubble/MessageContent.js";
import { ThinkingBlock, type RoleMeta } from "./RoleMessage.parts.js";

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
      <div className={`message ${isUser ? "user-message" : ""}`} id={message.id}>
        <div className="avatar" style={{ borderColor: colors.danger }}>!</div>
        <div className="bubble">
          <div className="meta"><b>{roleName} - {message.errorCode ?? "error"}</b></div>
          <p>{message.errorMessage ?? message.content}</p>
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

  if (isUser) {
    return (
      <div className="message user-message" id={message.id}>
        <div className="avatar" style={{ borderColor: meta.color }}>
          {meta.name.charAt(0)}
        </div>
        <div className="bubble" style={{ background: "var(--accent)", color: "#fff", borderColor: "var(--accent)", borderBottomRightRadius: "4px" }}>
          {expanded && (
            <div onClick={onToggle} style={{ cursor: onToggle ? "pointer" : "default" }}>
              <MessageContent content={message.content} colors={colors} />
            </div>
          )}
          {!expanded && (
            <div style={{ cursor: "pointer", fontSize: 13 }} onClick={onToggle}>
              {preview}
              {onToggle && <span style={{ marginLeft: 8 }}>v</span>}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="message" id={message.id}>
      <div className={`avatar ${streaming ? "speaking" : ""}`} style={{ borderColor: meta.color }}>
        {meta.name.charAt(0)}
      </div>
      <div className="bubble">
        <div className="meta">
          <b>{meta.name}</b>
          <span>{message.createdAt ? formatTime(message.createdAt) : ""}</span>
          {streaming && <span>speaking</span>}
        </div>
        
        {!expanded && (
          <div style={{ cursor: "pointer", color: colors.textMuted, fontSize: 13 }} onClick={onToggle}>
            {message.graphSummary && <span style={{ marginRight: 8, background: "#333", padding: "2px 6px", borderRadius: 4 }}>Summary</span>}
            {preview}
            {onToggle && <span style={{ marginLeft: 8 }}>v</span>}
          </div>
        )}
        
        {expanded && (
          <div onClick={onToggle} style={{ cursor: onToggle ? "pointer" : "default" }}>
            {message.thinking?.trim() && (
              <ThinkingBlock thinking={message.thinking} colors={colors} styles={styles} />
            )}
            <MessageContent content={message.content} colors={colors} />
          </div>
        )}
      </div>
    </div>
  );
};
