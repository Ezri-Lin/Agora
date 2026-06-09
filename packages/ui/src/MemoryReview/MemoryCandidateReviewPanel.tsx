import React, { useCallback, useMemo, useState } from "react";
import type { MemoryCandidateReviewPanelProps } from "./types.js";
import { MemoryCandidateCard } from "./MemoryCandidateCard.js";
import { useTheme } from "../theme/ThemeContext.js";
import {
  reviewPanelStyle,
  reviewScrollBodyStyle,
  reviewTitleStyle,
  reviewSubtitleStyle,
  reviewFooterStyle,
  footerCountStyle,
  footerActionsStyle,
  reviewBtnStyle,
  reviewBtnDisabledStyle,
  emptyStyle,
} from "./styles.js";

export const MemoryCandidateReviewPanel: React.FC<MemoryCandidateReviewPanelProps> = ({
  candidates,
  onSave,
  onDismiss,
}) => {
  const { colors } = useTheme();

  const defaultSelected = useMemo(
    () => new Set(candidates.filter((c) => c.selectedByDefault).map((c) => c.id)),
    [candidates],
  );

  const [selectedIds, setSelectedIds] = useState<Set<string>>(defaultSelected);

  const toggle = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const selectedCandidates = useMemo(
    () => candidates.filter((c) => selectedIds.has(c.id)),
    [candidates, selectedIds],
  );

  const handleSave = useCallback(() => {
    onSave(selectedCandidates);
  }, [onSave, selectedCandidates]);

  return (
    <div style={reviewPanelStyle(colors)}>
      <div style={reviewScrollBodyStyle}>
        <div style={reviewTitleStyle(colors)}>记忆候选</div>
        <div style={reviewSubtitleStyle(colors)}>
          {candidates.length > 0
            ? `${candidates.length} 条候选记忆，请选择要保存的`
            : ""}
        </div>

        {candidates.length === 0 && (
          <div style={emptyStyle(colors)}>No memory candidates yet.</div>
        )}

        {candidates.map((candidate) => (
          <MemoryCandidateCard
            key={candidate.id}
            candidate={candidate}
            selected={selectedIds.has(candidate.id)}
            onToggle={toggle}
          />
        ))}
      </div>

      {candidates.length > 0 && (
        <div style={reviewFooterStyle(colors)}>
          <div style={footerCountStyle(colors)}>
            {selectedIds.size > 0
              ? `已选择 ${selectedIds.size} 条`
              : "请选择要保存的记忆"}
          </div>
          <div style={footerActionsStyle}>
            <button type="button" style={reviewBtnStyle(colors)} onClick={onDismiss}>
              忽略全部
            </button>
            <button
              type="button"
              style={selectedIds.size > 0 ? reviewBtnStyle(colors, "accent") : reviewBtnDisabledStyle(colors)}
              onClick={handleSave}
              disabled={selectedIds.size === 0}
            >
              保存选中
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
