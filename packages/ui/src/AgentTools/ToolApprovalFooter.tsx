import React, { memo, useState } from "react";
import { useTheme } from "../theme/ThemeContext.js";
import { createToolStyles } from "./toolStyles.js";

export type ToolApproval = {
  approveLabel?: string;
  rejectLabel?: string;
  onApprove?: () => void;
  onReject?: () => void;
};

export type ToolApprovalFooterProps = ToolApproval & {
  isPending?: boolean;
};

export const ToolApprovalFooter = memo(function ToolApprovalFooter({
  isPending,
  approveLabel,
  rejectLabel,
  onApprove,
  onReject,
}: ToolApprovalFooterProps) {
  const { colors } = useTheme();
  const styles = createToolStyles(colors);
  const [decision, setDecision] = useState<"approved" | "rejected" | null>(null);

  const approveText = decision === "approved" ? "Approved" : (approveLabel ?? "Next");
  const rejectText = decision === "rejected" ? "Skipped" : (rejectLabel ?? "Skip");

  const handleApprove = () => {
    if (decision) return;
    setDecision("approved");
    onApprove?.();
  };

  const handleReject = () => {
    if (decision) return;
    setDecision("rejected");
    onReject?.();
  };

  const statusLabel = decision === "approved"
    ? "Waiting"
    : decision === "rejected"
      ? "Canceled"
      : isPending
        ? "Starting"
        : null;

  return (
    <div style={styles.approvalFooter}>
      {statusLabel ? (
        <span style={{ fontSize: 11, color: colors.textMuted }}>
          {statusLabel}
          {isPending && !decision && (
            <span style={{ display: "inline-flex" }}>
              <span style={{ animation: "ag-blink 1.4s infinite 0.2s" }}>.</span>
              <span style={{ animation: "ag-blink 1.4s infinite 0.4s" }}>.</span>
              <span style={{ animation: "ag-blink 1.4s infinite 0.6s" }}>.</span>
            </span>
          )}
        </span>
      ) : (
        <span />
      )}
      <div style={{ display: "flex", gap: 4 }}>
        <button
          type="button"
          onClick={handleReject}
          disabled={Boolean(decision)}
          style={styles.approvalBtn}
        >
          {rejectText}
        </button>
        <button
          type="button"
          onClick={handleApprove}
          disabled={Boolean(decision)}
          style={styles.approvalBtnPrimary}
        >
          {approveText}
        </button>
      </div>
    </div>
  );
});
