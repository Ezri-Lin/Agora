import React, { useMemo } from "react";
import type { CouncilMessage, RoleCard } from "@agora/shared";
import { useTheme } from "../theme/ThemeContext.js";
import { useI18n } from "../i18n/I18nContext.js";
import { getRoleColor, USER_COLOR } from "../theme/palettes.js";
import { MessageContent } from "../ChatBubble/MessageContent.js";
import { ThinkingTool } from "../AgentTools/ThinkingTool.js";
import { EditToolCard } from "../AgentTools/EditTool.js";
import { BashToolCard } from "../AgentTools/BashTool.js";
import { TextShimmer } from "../AgentTools/TextShimmer.js";
import { mapToolInvocationToStep } from "../AgentTools/toolAdapters.js";
import { parseToolCalls } from "../utils/parseToolCalls.js";
import type { RoleMeta } from "./RoleMessage.parts.js";

interface RoleMessageProps {
  message: CouncilMessage;
  roles?: RoleCard[];
  streaming?: boolean;
  expanded?: boolean;
  onToggle?: () => void;
  focused?: boolean;
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

function renderToolCalls(message: CouncilMessage, streaming?: boolean): React.ReactNode {
  // Use structured toolCalls if available, otherwise parse from content
  const toolCalls = message.toolCalls?.length
    ? message.toolCalls
    : parseToolCalls(message.content, message.thinking);

  if (toolCalls.length === 0) return null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 8 }}>
      {toolCalls.map((tc) => {
        const step = mapToolInvocationToStep(tc.id, {
          toolName: tc.name,
          args: tc.args,
          state: "result",
          result: tc.result,
        });

        switch (tc.name) {
          case "Edit":
          case "Write":
            return (
              <EditToolCard
                key={tc.id}
                step={step}
                state={streaming ? "animating" : "complete"}
                onComplete={() => {}}
              />
            );
          case "Bash":
            return (
              <BashToolCard
                key={tc.id}
                step={step}
                state={streaming ? "animating" : "complete"}
                onComplete={() => {}}
              />
            );
          default:
            return null;
        }
      })}
    </div>
  );
}

export const RoleMessage: React.FC<RoleMessageProps> = ({
  message,
  roles,
  streaming,
  expanded = true,
  onToggle,
  focused,
}) => {
  const { colors } = useTheme();
  const { t, locale } = useI18n();

  const roleMetaMap = useMemo(() => {
    const map = new Map<string, RoleMeta>();
    map.set("user", { name: t.you, subtitle: "", color: USER_COLOR });
    map.set("moderator", { name: t.moderator, subtitle: "", color: getRoleColor("moderator") });
    for (const role of roles ?? []) {
      map.set(role.id, {
        name: locale === "zh" && role.nameCN ? role.nameCN : role.name,
        subtitle: locale === "zh" && role.subtitleCN ? role.subtitleCN : role.subtitle,
        color: getRoleColor(role.id),
      });
    }
    return map;
  }, [roles, t.you, t.moderator, locale]);

  const isUser = message.senderType === "user";
  const isError = message.status === "error";
  const bubbleFocusStyle: React.CSSProperties | undefined = focused
    ? { border: "2px solid #111", transition: "border .2s" }
    : undefined;

  if (isError) {
    const roleName = message.targetRoleId
      ? (roleMetaMap.get(message.targetRoleId)?.name ?? message.targetRoleId)
      : "Unknown";
    return (
      <div className={`message ${isUser ? "user-message" : ""}`} id={message.id}>
        <div className="avatar" style={{ borderColor: colors.danger }}>!</div>
        <div className="bubble" style={bubbleFocusStyle}>
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
        <div className="bubble" style={{ background: "var(--accent)", color: "#fff", borderColor: "var(--accent)", borderBottomRightRadius: "4px", ...bubbleFocusStyle }}>
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
      <div className="bubble" style={bubbleFocusStyle}>
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
              <ThinkingTool
                step={{
                  id: `${message.id}-thinking`,
                  type: "tool-call",
                  toolName: "Thinking",
                  toolDetail: "",
                  duration: 1500,
                  thoughtContent: message.thinking,
                }}
                state={streaming ? "animating" : "complete"}
                onComplete={() => {}}
              />
            )}
            {/* Tool calls: from structured data or parsed from content */}
            {renderToolCalls(message, streaming)}
            {streaming && !message.content ? (
              <TextShimmer style={{ color: colors.textMuted, fontSize: 13, padding: "4px 0" }}>
                {meta.name} is thinking...
              </TextShimmer>
            ) : (
              <MessageContent content={message.content} colors={colors} />
            )}
          </div>
        )}
      </div>
    </div>
  );
};
