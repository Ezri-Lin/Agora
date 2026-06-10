import React, { useState, useCallback } from "react";
import type { ColorPalette } from "../theme/palettes.js";
import { motion, radius, spacing, typography } from "../theme/tokens.js";

interface CopyButtonProps {
  text: string;
  colors: ColorPalette;
  size?: "small" | "medium";
}

export const CopyButton: React.FC<CopyButtonProps> = ({ text, colors, size = "medium" }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // fallback: textarea trick
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.left = "-9999px";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  }, [text]);

  const isSmall = size === "small";

  return (
    <button
      onClick={handleCopy}
      style={{
        background: "none",
        border: "none",
        cursor: "pointer",
        color: copied ? colors.success : colors.textMuted,
        fontSize: isSmall ? typography.badge.size : typography.meta.size,
        padding: isSmall ? `${spacing.xxs - 1}px ${spacing.xs}px` : `${spacing.xxs}px ${spacing.xs + 2}px`,
        borderRadius: radius.xs,
        display: "flex",
        alignItems: "center",
        gap: spacing.xxs + 1,
        lineHeight: 1,
        transition: `color ${motion.fast}`,
      }}
      title="Copy"
    >
      {copied ? "✓" : "📋"}
      {!isSmall && <span style={{ fontSize: typography.badge.size }}>{copied ? "Copied!" : "Copy"}</span>}
    </button>
  );
};
