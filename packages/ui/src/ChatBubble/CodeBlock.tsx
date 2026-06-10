import React, { useMemo } from "react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import type { ColorPalette } from "../theme/palettes.js";
import { fontFamilies, radius, spacing, typography } from "../theme/tokens.js";
import { CopyButton } from "./CopyButton.js";

interface CodeBlockProps {
  language?: string;
  children: string;
  colors: ColorPalette;
}

export const CodeBlock: React.FC<CodeBlockProps> = ({ language, children, colors }) => {
  const displayText = useMemo(() => {
    if (language === "json") {
      try {
        const parsed = JSON.parse(children);
        return JSON.stringify(parsed, null, 2);
      } catch {
        return children;
      }
    }
    return children;
  }, [language, children]);

  return (
    <div style={wrapperStyle(colors)}>
      <div style={headerStyle(colors)}>
        <span style={langLabelStyle(colors)}>{language || "text"}</span>
        <CopyButton text={displayText} colors={colors} size="small" />
      </div>
      <SyntaxHighlighter
        language={language || "text"}
        style={oneDark}
        customStyle={{
          margin: 0,
          padding: `${spacing.sm + 2}px ${spacing.md}px`,
          fontSize: typography.console.size,
          lineHeight: typography.console.lineHeight,
          background: "transparent",
          borderRadius: `0 0 ${radius.xs}px ${radius.xs}px`,
        }}
        codeTagProps={{
          style: { fontFamily: fontFamilies.mono },
        }}
      >
        {displayText}
      </SyntaxHighlighter>
    </div>
  );
};

const wrapperStyle = (colors: ColorPalette): React.CSSProperties => ({
  borderRadius: radius.xs,
  border: `1px solid ${colors.border}`,
  overflow: "hidden",
  marginBottom: spacing.xs,
});

const headerStyle = (colors: ColorPalette): React.CSSProperties => ({
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: `${spacing.xs - 1}px ${spacing.sm}px`,
  background: colors.surface,
  borderBottom: `1px solid ${colors.border}`,
});

const langLabelStyle = (colors: ColorPalette): React.CSSProperties => ({
  fontSize: typography.badge.size,
  color: colors.textMuted,
  fontWeight: typography.badge.weight,
  textTransform: "uppercase",
  letterSpacing: typography.badge.tracking,
});
