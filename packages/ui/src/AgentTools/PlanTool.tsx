import React, { memo, useState } from "react";
import { SpiralLoader } from "./SpiralLoader.js";
import { useTheme } from "../theme/ThemeContext.js";
import { createToolStyles } from "./toolStyles.js";

export type Plan = {
  id?: string;
  title: string;
  summary?: string;
};

export type PlanToolProps = {
  part: {
    type: string;
    toolCallId?: string;
    state?: string;
    input?: {
      plan?: Plan;
      onApprove?: () => void;
      approveLabel?: string;
      approved?: boolean;
    };
  };
  chatStatus?: string;
};

function getPlanFileName(plan: Plan) {
  const rawId = plan.id?.trim();
  if (!rawId) return "plan-working.md";
  if (rawId.endsWith(".md")) return rawId;
  return `plan-${rawId}.md`;
}

export const PlanTool = memo(function PlanTool({ part }: PlanToolProps) {
  const { colors } = useTheme();
  const styles = createToolStyles(colors);
  const isPending = part.state === "call" || part.state === "partial-call" || part.state === "input-streaming";
  const plan = part.input?.plan;
  const [isExpanded, setIsExpanded] = useState(false);
  const [isApproved, setIsApproved] = useState(false);

  if (!plan) return null;

  const fileName = getPlanFileName(plan);
  const summary = plan.summary?.trim() ?? "";
  const hasSummary = summary.length > 0;
  const isAlreadyApproved = part.input?.approved || isApproved;
  const approveText = isAlreadyApproved ? "Approved" : (part.input?.approveLabel ?? "Approve");

  const handleApprove = () => {
    if (isAlreadyApproved) return;
    setIsApproved(true);
    if (typeof part.input?.onApprove === "function") {
      part.input.onApprove();
    }
  };

  return (
    <div style={styles.toolCard}>
      <div style={styles.toolHeader}>
        <div style={styles.toolHeaderLeft}>
          {isPending ? (
            <SpiralLoader size={12} style={styles.spinner} />
          ) : (
            <svg style={{ width: 14, height: 14, flexShrink: 0, color: colors.textMuted }} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M4 2h8a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V4a2 2 0 012-2z" />
              <path d="M6 6h4M6 8h4M6 10h2" />
            </svg>
          )}
          <span style={{ fontSize: 12, color: colors.textMuted, overflow: "hidden", textOverflow: "ellipsis" }}>
            {fileName}
          </span>
        </div>
        <button
          type="button"
          onClick={() => setIsExpanded((prev) => !prev)}
          style={{
            width: 20,
            height: 20,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            color: colors.textMuted,
            background: "none",
            border: "none",
            cursor: "pointer",
          }}
        >
          <svg
            style={{
              width: 14,
              height: 14,
              transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)",
              transition: "transform 0.15s ease",
            }}
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M4 6l4 4 4-4" />
          </svg>
        </button>
      </div>

      <div style={{ borderTop: `1px solid ${colors.border}`, background: colors.bg, padding: "8px 0" }}>
        <div style={{ padding: "0 12px", fontSize: 13, color: colors.text }}>
          {plan.title}
        </div>

        {hasSummary && (
          <div style={{ position: "relative" }}>
            <div style={{
              padding: "0 12px",
              fontSize: 13,
              color: colors.textMuted,
              maxHeight: isExpanded ? undefined : 94,
              overflow: isExpanded ? undefined : "hidden",
            }}>
              {summary}
            </div>

            {!isExpanded && (
              <div style={{
                position: "absolute",
                insetInline: 0,
                bottom: 0,
                height: 64,
                display: "flex",
                alignItems: "flex-end",
                justifyContent: "space-between",
                padding: "0 12px 8px",
                background: `linear-gradient(transparent, ${colors.bg} 50%)`,
              }}>
                <button
                  type="button"
                  onClick={() => setIsExpanded(true)}
                  style={{
                    fontSize: 12,
                    color: colors.textMuted,
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    padding: 0,
                  }}
                >
                  Read detailed plan
                </button>
                {!isAlreadyApproved && (
                  <button
                    type="button"
                    onClick={handleApprove}
                    style={styles.approvalBtnPrimary}
                  >
                    {approveText}
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {isExpanded && (
          <div style={{
            marginTop: 8,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "6px 12px 8px",
            borderTop: `1px solid ${colors.border}`,
            background: colors.surface,
          }}>
            <button
              type="button"
              onClick={() => setIsExpanded(false)}
              style={{
                fontSize: 12,
                color: colors.textMuted,
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: 0,
              }}
            >
              Hide detailed plan
            </button>
            {!isAlreadyApproved && (
              <button
                type="button"
                onClick={handleApprove}
                style={styles.approvalBtnPrimary}
              >
                {approveText}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
});
