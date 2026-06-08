import React, { useState, useCallback } from "react";
import type { ColorPalette } from "../theme/palettes.js";

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
        fontSize: isSmall ? 10 : 12,
        padding: isSmall ? "1px 4px" : "2px 6px",
        borderRadius: 3,
        display: "flex",
        alignItems: "center",
        gap: 3,
        lineHeight: 1,
        transition: "color 0.15s",
      }}
      title="Copy"
    >
      {copied ? "✓" : "📋"}
      {!isSmall && <span style={{ fontSize: 10 }}>{copied ? "Copied!" : "Copy"}</span>}
    </button>
  );
};
