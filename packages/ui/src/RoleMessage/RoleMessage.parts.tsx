import React, { useMemo, useState } from "react";
import { MessageContent } from "../ChatBubble/MessageContent.js";
import { CopyButton } from "../ChatBubble/CopyButton.js";
import type { ColorPalette } from "../theme/palettes.js";
import {
  avatarStyle,
  processDotStyle,
  processPanelStyle,
  processRowStyle,
  processTitleStyle,
  rawThinkingStyle,
} from "./roleMessageStyles.js";

export interface RoleMeta {
  name: string;
  subtitle: string;
  color: string;
}

export const RoleAvatar: React.FC<{
  meta: RoleMeta;
  colors: ColorPalette;
  active?: boolean;
}> = ({ meta, colors, active }) => (
  <div style={avatarStyle(colors, meta.color, active)}>
    {meta.name.charAt(0)}
  </div>
);

export const RoleMessageHeader: React.FC<{
  meta: RoleMeta;
  timestamp?: string;
  cursor: React.CSSProperties["cursor"];
  styles: ReturnType<typeof import("./roleMessageStyles.js").createRoleMessageStyles>;
  onToggle?: () => void;
}> = ({ meta, timestamp, cursor, styles, onToggle }) => (
  <div style={{ ...styles.header, cursor }} onClick={onToggle}>
    <span style={{ ...styles.name, color: meta.color }}>{meta.name}</span>
    {meta.subtitle && <span style={styles.subtitle}>{meta.subtitle}</span>}
    {timestamp && <span style={styles.timestamp}>{timestamp}</span>}
  </div>
);

export const MessageActions: React.FC<{
  text: string;
  colors: ColorPalette;
  styles: ReturnType<typeof import("./roleMessageStyles.js").createRoleMessageStyles>;
}> = ({ text, colors, styles }) => (
  <div style={styles.actionRow}>
    <CopyButton text={text} colors={colors} size="medium" />
  </div>
);

export const MessageBubble: React.FC<{
  content: string;
  colors: ColorPalette;
  meta: RoleMeta;
  isUser: boolean;
  streaming?: boolean;
  styles: ReturnType<typeof import("./roleMessageStyles.js").createRoleMessageStyles>;
}> = ({ content, colors, meta, isUser, streaming, styles }) => (
  <div style={{ ...styles.bubble, ...(isUser ? styles.userBubble : {}), borderLeftColor: meta.color }}>
    <MessageContent content={content} colors={colors} />
    {streaming && content.length < 10 && <PulsingDots color={meta.color} />}
    {!streaming && content.length > 0 && (
      <MessageActions text={content} colors={colors} styles={styles} />
    )}
  </div>
);

export const ThinkingBlock: React.FC<{
  thinking: string;
  colors: ColorPalette;
  styles: ReturnType<typeof import("./roleMessageStyles.js").createRoleMessageStyles>;
}> = ({ thinking, colors, styles }) => {
  const [showRaw, setShowRaw] = useState(false);
  const steps = useMemo(() => parseThinkingSteps(thinking), [thinking]);

  return (
    <div style={processPanelStyle(colors)} onClick={(event) => event.stopPropagation()}>
      <div style={processTitleStyle(colors)}>Thinking process</div>
      {steps.map((step) => (
        <div key={step} style={processRowStyle(colors)}>
          <span style={processDotStyle(colors)} />
          <span>{step}</span>
        </div>
      ))}
      <button
        type="button"
        aria-label={showRaw ? "Hide thinking detail" : "Show thinking detail"}
        style={styles.detailButton}
        onClick={() => setShowRaw((value) => !value)}
      >
        {showRaw ? "Hide detail" : "Show detail"}
      </button>
      {showRaw && (
        <div style={rawThinkingStyle(colors)}>
          <div style={processTitleStyle(colors)}>Raw thinking detail</div>
          <MessageContent content={thinking} colors={colors} />
        </div>
      )}
    </div>
  );
};

function parseThinkingSteps(thinking: string): string[] {
  const lines = thinking
    .split(/\n+/)
    .map((line) => line.replace(/^\s*[-*+]\s+/, "").replace(/^\s*\d+[.)]\s+/, "").trim())
    .filter(Boolean);

  if (lines.length > 0) return lines.slice(0, 5);

  const fallback = thinking.trim();
  return fallback ? [fallback] : ["Preparing response"];
}

const PulsingDots: React.FC<{ color: string }> = ({ color }) => {
  const [tick, setTick] = useState(0);
  React.useEffect(() => {
    const id = setInterval(() => setTick((value) => (value + 1) % 3), 400);
    return () => clearInterval(id);
  }, []);
  return (
    <span style={{ display: "inline-flex", gap: 3, marginLeft: 4, verticalAlign: "middle" }}>
      {[0, 1, 2].map((index) => (
        <span
          key={index}
          style={{
            width: 5,
            height: 5,
            borderRadius: "50%",
            background: color,
            opacity: tick === index ? 1 : 0.3,
            transition: "opacity 120ms ease",
          }}
        />
      ))}
    </span>
  );
};
