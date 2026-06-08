import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { ColorPalette } from "../theme/palettes.js";
import { CodeBlock } from "./CodeBlock.js";

interface MessageContentProps {
  content: string;
  colors: ColorPalette;
}

export const MessageContent: React.FC<MessageContentProps> = ({ content, colors }) => {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      skipHtml={true}
      components={{
        code({ className, children, ...props }) {
          const match = /language-(\w+)/.exec(className || "");
          const codeStr = String(children).replace(/\n$/, "");
          const isBlock = match || codeStr.includes("\n");
          if (isBlock) {
            return <CodeBlock language={match?.[1]} children={codeStr} colors={colors} />;
          }
          return (
            <code
              style={{
                background: colors.surface,
                border: `1px solid ${colors.border}`,
                borderRadius: 3,
                padding: "1px 4px",
                fontSize: "0.9em",
                fontFamily: 'Menlo, Monaco, "Courier New", monospace',
              }}
              {...props}
            >
              {children}
            </code>
          );
        },
        a({ children, href, ...props }) {
          return (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: colors.accent, textDecoration: "underline" }}
              {...props}
            >
              {children}
            </a>
          );
        },
        table({ children, ...props }) {
          return (
            <div style={{ overflowX: "auto", marginBottom: 8 }}>
              <table
                style={{
                  borderCollapse: "collapse",
                  width: "100%",
                  fontSize: 12,
                }}
                {...props}
              >
                {children}
              </table>
            </div>
          );
        },
        th({ children, ...props }) {
          return (
            <th
              style={{
                border: `1px solid ${colors.border}`,
                padding: "5px 8px",
                background: colors.surface,
                fontWeight: 600,
                textAlign: "left",
              }}
              {...props}
            >
              {children}
            </th>
          );
        },
        td({ children, ...props }) {
          return (
            <td
              style={{
                border: `1px solid ${colors.border}`,
                padding: "5px 8px",
              }}
              {...props}
            >
              {children}
            </td>
          );
        },
        blockquote({ children, ...props }) {
          return (
            <blockquote
              style={{
                borderLeft: `3px solid ${colors.accentDim}`,
                paddingLeft: 12,
                marginLeft: 0,
                marginBottom: 8,
                color: colors.textMuted,
                fontStyle: "italic",
              }}
              {...props}
            >
              {children}
            </blockquote>
          );
        },
        ul({ children, ...props }) {
          return (
            <ul
              style={{ paddingLeft: 20, marginBottom: 8 }}
              {...props}
            >
              {children}
            </ul>
          );
        },
        ol({ children, ...props }) {
          return (
            <ol
              style={{ paddingLeft: 20, marginBottom: 8 }}
              {...props}
            >
              {children}
            </ol>
          );
        },
        li({ children, ...props }) {
          return (
            <li style={{ marginBottom: 2 }} {...props}>
              {children}
            </li>
          );
        },
        p({ children, ...props }) {
          return (
            <p style={{ marginBottom: 6 }} {...props}>
              {children}
            </p>
          );
        },
        h1({ children, ...props }) {
          return <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8, marginTop: 12 }} {...props}>{children}</h1>;
        },
        h2({ children, ...props }) {
          return <h2 style={{ fontSize: 17, fontWeight: 700, marginBottom: 6, marginTop: 10 }} {...props}>{children}</h2>;
        },
        h3({ children, ...props }) {
          return <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 4, marginTop: 8 }} {...props}>{children}</h3>;
        },
        hr({ ...props }) {
          return <hr style={{ border: "none", borderTop: `1px solid ${colors.border}`, margin: "8px 0" }} {...props} />;
        },
        del({ children, ...props }) {
          return <del style={{ color: colors.textMuted }} {...props}>{children}</del>;
        },
        input({ checked, ...props }) {
          return (
            <input
              type="checkbox"
              checked={checked}
              readOnly
              style={{ marginRight: 6 }}
              {...props}
            />
          );
        },
      }}
    >
      {content}
    </ReactMarkdown>
  );
};
