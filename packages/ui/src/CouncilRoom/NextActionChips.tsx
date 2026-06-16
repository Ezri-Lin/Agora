/**
 * NextActionChips — post-round action buttons.
 *
 * Shown after council fan-out completes.
 * Host does NOT auto-summarize; user chooses next action.
 * Uses handleCouncilNextAction to process each action.
 */

import React, { useCallback } from "react";
import { useTheme } from "../theme/ThemeContext.js";
import { spacing, typography } from "../theme/tokens.js";
import type { ColorPalette } from "../theme/palettes.js";
import { handleCouncilNextAction, type NextActionResult } from "../hooks/councilSend/useCouncilNextAction.js";
import type { UserNextAction } from "@agora/shared";

export interface NextActionChipsProps {
  onResult: (result: NextActionResult) => void;
}

const ACTIONS: Array<{ action: UserNextAction; label: string; desc: string }> = [
  { action: { kind: "host_synthesize" }, label: "让主持人总结", desc: "生成讨论总结" },
  { action: { kind: "continue_discussion" }, label: "继续追问", desc: "基于当前讨论继续" },
  { action: { kind: "finalize_decision" }, label: "拍板并沉淀", desc: "确认决策并生成记忆" },
  { action: { kind: "write_doc_candidate" }, label: "写入文档", desc: "生成文档变更计划" },
  { action: { kind: "discard" }, label: "放弃本轮", desc: "关闭讨论" },
];

export const NextActionChips: React.FC<NextActionChipsProps> = ({ onResult }) => {
  const { colors } = useTheme();

  const handleClick = useCallback((action: UserNextAction) => {
    const result = handleCouncilNextAction(action);
    onResult(result);
  }, [onResult]);

  return (
    <div style={containerStyle(colors)}>
      <div style={labelStyle(colors)}>下一步：</div>
      <div style={chipsRowStyle}>
        {ACTIONS.map(({ action, label, desc }) => (
          <button
            key={action.kind}
            style={chipStyle(colors)}
            onClick={() => handleClick(action)}
            title={desc}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
};

const containerStyle = (colors: ColorPalette): React.CSSProperties => ({
  display: "flex",
  flexDirection: "column",
  gap: spacing.xs,
  padding: `${spacing.sm}px ${spacing.md}px`,
  borderTop: `1px solid ${colors.border}`,
});

const labelStyle = (colors: ColorPalette): React.CSSProperties => ({
  fontSize: typography.meta.size,
  color: colors.textMuted,
});

const chipsRowStyle: React.CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: spacing.xs,
};

const chipStyle = (colors: ColorPalette): React.CSSProperties => ({
  background: colors.surface,
  border: `1px solid ${colors.border}`,
  borderRadius: 16,
  padding: `${spacing.xxs}px ${spacing.md}px`,
  fontSize: typography.chatBody.size,
  color: colors.text,
  cursor: "pointer",
  transition: "background 0.15s",
});
