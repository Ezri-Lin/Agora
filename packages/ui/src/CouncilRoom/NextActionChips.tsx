/**
 * NextActionChips — post-round action buttons.
 *
 * Shown after council fan-out completes.
 * Host does NOT auto-summarize; user chooses next action.
 * Uses handleCouncilNextAction to process each action.
 */

import React, { useCallback, useMemo } from "react";
import { useTheme } from "../theme/ThemeContext.js";
import { useI18n } from "../i18n/I18nContext.js";
import { spacing, typography } from "../theme/tokens.js";
import type { ColorPalette } from "../theme/palettes.js";
import { handleCouncilNextAction, type NextActionResult } from "../hooks/councilSend/useCouncilNextAction.js";
import type { UserNextAction } from "@agora/shared";

export interface NextActionChipsProps {
  onResult: (result: NextActionResult) => void;
}

function useActions(t: ReturnType<typeof useI18n>["t"]): Array<{ action: UserNextAction; label: string; desc: string }> {
  return useMemo(() => [
    { action: { kind: "host_synthesize" }, label: t.synthesize, desc: t.synthesizeDesc },
    { action: { kind: "continue_discussion" }, label: t.continueDiscussion, desc: t.continueDesc },
    { action: { kind: "finalize_decision" }, label: t.finalize, desc: t.finalizeDesc },
    { action: { kind: "write_doc_candidate" }, label: t.writeDoc, desc: t.writeDocDesc },
    { action: { kind: "discard" }, label: t.discard, desc: t.discardDesc },
  ], [t]);
}

export const NextActionChips: React.FC<NextActionChipsProps> = ({ onResult }) => {
  const { colors } = useTheme();
  const { t } = useI18n();
  const ACTIONS = useActions(t);

  const handleClick = useCallback((action: UserNextAction) => {
    const result = handleCouncilNextAction(action);
    onResult(result);
  }, [onResult]);

  return (
    <div style={containerStyle(colors)}>
      <div style={labelStyle(colors)}>{t.nextAction}</div>
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
