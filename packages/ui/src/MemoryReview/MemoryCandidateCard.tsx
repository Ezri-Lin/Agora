import React from "react";
import type { MemoryCandidateViewModel } from "./types.js";
import { MemoryScopeBadge } from "./MemoryScopeBadge.js";
import { useTheme } from "../theme/ThemeContext.js";
import {
  candidateCardStyle,
  checkboxStyle,
  candidateBodyStyle,
  candidateTextStyle,
  candidateReasonStyle,
  tagsRowStyle,
  tagStyle,
} from "./styles.js";

interface MemoryCandidateCardProps {
  candidate: MemoryCandidateViewModel;
  selected: boolean;
  onToggle: (id: string) => void;
}

export const MemoryCandidateCard: React.FC<MemoryCandidateCardProps> = ({
  candidate,
  selected,
  onToggle,
}) => {
  const { colors } = useTheme();

  const provenanceWarning =
    candidate.provenanceStatus === "missing_legacy" ||
    candidate.provenanceStatus === "none";

  return (
    <div
      style={candidateCardStyle(colors, selected)}
      role="button"
      tabIndex={0}
      aria-pressed={selected}
      onClick={() => onToggle(candidate.id)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onToggle(candidate.id);
        }
      }}
    >
      <div style={checkboxStyle(colors, selected)} aria-hidden="true">
        {selected && "✓"}
      </div>
      <div style={candidateBodyStyle}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
          <MemoryScopeBadge scope={candidate.scope} />
          {candidate.confidence !== undefined && (
            <span style={confidenceStyle(colors)}>
              {Math.round(candidate.confidence * 100)}%
            </span>
          )}
        </div>
        <div style={candidateTextStyle(colors)}>{candidate.text}</div>
        {candidate.reason && (
          <div style={candidateReasonStyle(colors)}>{candidate.reason}</div>
        )}
        {candidate.provenanceExcerpt && (
          <div style={provenanceStyle(colors)}>
            {candidate.provenanceExcerpt}
          </div>
        )}
        {provenanceWarning && (
          <div style={warningStyle}>
            ⚠ Provenance missing
          </div>
        )}
        {candidate.tags && candidate.tags.length > 0 && (
          <div style={tagsRowStyle}>
            {candidate.tags.map((tag) => (
              <span key={tag} style={tagStyle(colors)}>{tag}</span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const confidenceStyle = (colors: any): React.CSSProperties => ({
  fontSize: 11,
  color: colors.textMuted,
  opacity: 0.7,
});

const provenanceStyle = (colors: any): React.CSSProperties => ({
  fontSize: 12,
  color: colors.textMuted,
  marginTop: 4,
  padding: "4px 8px",
  background: colors.surface,
  borderRadius: 4,
  borderLeft: `3px solid ${colors.border}`,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
});

const warningStyle: React.CSSProperties = {
  fontSize: 11,
  color: "#e53e3e",
  marginTop: 4,
};
