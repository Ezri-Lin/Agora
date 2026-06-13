import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { ColorPalette } from "../theme/palettes.js";
import { fontFamilies, radius, spacing, typography } from "../theme/tokens.js";
import { CodeBlock } from "./CodeBlock.js";

interface MessageContentProps {
  content: string;
  colors: ColorPalette;
  onWikiLink?: (target: string) => void;
}

export const MessageContent: React.FC<MessageContentProps> = ({ content, colors, onWikiLink }) => {
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
                borderRadius: radius.xs,
                padding: `${spacing.xxs}px ${spacing.xs}px`,
                fontSize: "0.9em",
                fontFamily: fontFamilies.mono,
              }}
              {...props}
            >
              {children}
            </code>
          );
        },
        a({ children, href, ...props }) {
          if (href?.startsWith("wikilink:") && onWikiLink) {
            const target = href.slice("wikilink:".length);
            return (
              <a
                href="#"
                className="wikilink"
                onClick={(e) => { e.preventDefault(); onWikiLink(target); }}
                {...props}
              >
                {children}
              </a>
            );
          }
          return (
            <a
              href={href}
              onClick={(e) => {
                e.preventDefault();
                // Open external URLs via Electron shell or fallback
                if (href && (href.startsWith("http://") || href.startsWith("https://"))) {
                  window.open(href);
                }
              }}
              style={{ color: colors.accent, textDecoration: "underline", cursor: "pointer" }}
              {...props}
            >
              {children}
            </a>
          );
        },
        table({ children, ...props }) {
          return (
            <div style={{ overflowX: "auto", marginBottom: spacing.sm }}>
              <table
                style={{
                  borderCollapse: "collapse",
                  width: "100%",
                  fontSize: typography.meta.size,
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
                padding: `${spacing.xs + 1}px ${spacing.sm}px`,
                background: colors.surface,
                fontWeight: typography.heading.weight,
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
                padding: `${spacing.xs + 1}px ${spacing.sm}px`,
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
                paddingLeft: spacing.md,
                marginLeft: 0,
                marginBottom: spacing.sm,
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
              style={{ paddingLeft: spacing.xl, marginBottom: spacing.sm }}
              {...props}
            >
              {children}
            </ul>
          );
        },
        ol({ children, ...props }) {
          return (
            <ol
              style={{ paddingLeft: spacing.xl, marginBottom: spacing.sm }}
              {...props}
            >
              {children}
            </ol>
          );
        },
        li({ children, ...props }) {
          return (
            <li style={{ marginBottom: spacing.xxs }} {...props}>
              {children}
            </li>
          );
        },
        p({ children, ...props }) {
          return (
            <p style={{ marginBottom: spacing.sm - 2 }} {...props}>
              {children}
            </p>
          );
        },
        h1({ children, ...props }) {
          return <h1 style={{ fontSize: typography.heroTitle.size - 4, fontWeight: typography.heroTitle.weight, marginBottom: spacing.sm, marginTop: spacing.md }} {...props}>{children}</h1>;
        },
        h2({ children, ...props }) {
          return <h2 style={{ fontSize: typography.heading.size + 2, fontWeight: typography.heading.weight, marginBottom: spacing.sm - 2, marginTop: spacing.md - 2 }} {...props}>{children}</h2>;
        },
        h3({ children, ...props }) {
          return <h3 style={{ fontSize: typography.heading.size, fontWeight: typography.heading.weight, marginBottom: spacing.xs, marginTop: spacing.sm }} {...props}>{children}</h3>;
        },
        hr({ ...props }) {
          return <hr style={{ border: "none", borderTop: `1px solid ${colors.border}`, margin: `${spacing.sm}px 0` }} {...props} />;
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
              style={{ marginRight: spacing.xs + 2 }}
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
