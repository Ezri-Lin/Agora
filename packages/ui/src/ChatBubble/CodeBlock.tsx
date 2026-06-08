import React, { useMemo } from "react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import type { ColorPalette } from "../theme/palettes.js";
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
          padding: "10px 12px",
          fontSize: 12,
          lineHeight: 1.5,
          background: "transparent",
          borderRadius: "0 0 4px 4px",
        }}
        codeTagProps={{
          style: { fontFamily: 'Menlo, Monaco, "Courier New", monospace' },
        }}
      >
        {displayText}
      </SyntaxHighlighter>
    </div>
  );
};

const wrapperStyle = (colors: ColorPalette): React.CSSProperties => ({
  borderRadius: 4,
  border: `1px solid ${colors.border}`,
  overflow: "hidden",
  marginBottom: 4,
});

const headerStyle = (colors: ColorPalette): React.CSSProperties => ({
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: "3px 8px",
  background: colors.surface,
  borderBottom: `1px solid ${colors.border}`,
});

const langLabelStyle = (colors: ColorPalette): React.CSSProperties => ({
  fontSize: 10,
  color: colors.textMuted,
  fontWeight: 600,
  textTransform: "uppercase",
  letterSpacing: 0.3,
});
