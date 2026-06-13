import React, { useState, useMemo, useCallback } from "react";
import type { ScannedDoc } from "../AgoraBridge.js";
import type { ColorPalette } from "../theme/palettes.js";
import { radius, spacing, typography } from "../theme/tokens.js";

interface DocTreeProps {
  docs: ScannedDoc[];
  activeDocPath?: string | null;
  workspacePath?: string;
  onSelect: (doc: ScannedDoc) => void;
  colors: ColorPalette;
}

interface TreeNode {
  name: string;
  path: string;
  children: TreeNode[];
  doc?: ScannedDoc;
}

function buildTree(docs: ScannedDoc[], workspacePath?: string): TreeNode[] {
  const root: TreeNode[] = [];
  const wsPrefix = workspacePath ? workspacePath.replace(/\/?$/, "/") : "";

  for (const doc of docs) {
    // Strip workspace root prefix to get relative path
    const relPath = wsPrefix && doc.path.startsWith(wsPrefix)
      ? doc.path.slice(wsPrefix.length)
      : doc.path;
    const parts = relPath.split("/").filter(Boolean);
    let current = root;

    // Walk path segments (skip last = filename)
    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      let node = current.find((n) => n.name === part && !n.doc);
      if (!node) {
        node = { name: part, path: parts.slice(0, i + 1).join("/"), children: [] };
        current.push(node);
      }
      current = node.children;
    }

    // Add file node
    current.push({
      name: doc.name,
      path: doc.path,
      children: [],
      doc,
    });
  }

  return root;
}

export const DocTree: React.FC<DocTreeProps> = ({ docs, activeDocPath, workspacePath, onSelect, colors }) => {
  const tree = useMemo(() => buildTree(docs, workspacePath), [docs, workspacePath]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const toggle = useCallback((path: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  }, []);

  if (tree.length === 0) {
    return <div style={emptyStyle(colors)}>No documents found</div>;
  }

  return (
    <div style={treeStyle}>
      {tree.map((node) => (
        <TreeNodeView
          key={node.path}
          node={node}
          depth={0}
          expanded={expanded}
          activeDocPath={activeDocPath}
          onToggle={toggle}
          onSelect={onSelect}
          colors={colors}
        />
      ))}
    </div>
  );
};

const TreeNodeView: React.FC<{
  node: TreeNode;
  depth: number;
  expanded: Set<string>;
  activeDocPath?: string | null;
  onToggle: (path: string) => void;
  onSelect: (doc: ScannedDoc) => void;
  colors: ColorPalette;
}> = ({ node, depth, expanded, activeDocPath, onToggle, onSelect, colors }) => {
  const isFolder = !node.doc;
  const isExpanded = expanded.has(node.path);
  const isActive = node.doc && activeDocPath === node.doc.path;

  if (isFolder) {
    return (
      <div>
        <button
          type="button"
          style={folderRowStyle(colors, depth)}
          onClick={() => onToggle(node.path)}
        >
          <span style={chevronStyle(colors)}>{isExpanded ? "▾" : "▸"}</span>
          <span style={folderNameStyle(colors)}>{node.name}</span>
        </button>
        {isExpanded && (
          <div>
            {node.children.map((child) => (
              <TreeNodeView
                key={child.path}
                node={child}
                depth={depth + 1}
                expanded={expanded}
                activeDocPath={activeDocPath}
                onToggle={onToggle}
                onSelect={onSelect}
                colors={colors}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <button
      type="button"
      style={fileRowStyle(colors, depth, !!isActive)}
      onClick={() => node.doc && onSelect(node.doc)}
    >
      <span style={fileNameStyle(colors, !!isActive)}>{node.name}</span>
    </button>
  );
};

// --- Styles ---

const treeStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
};

const emptyStyle = (colors: ColorPalette): React.CSSProperties => ({
  color: colors.textMuted,
  fontSize: typography.meta.size,
  padding: `${spacing.sm}px 0`,
});

const folderRowStyle = (colors: ColorPalette, depth: number): React.CSSProperties => ({
  display: "flex",
  alignItems: "center",
  gap: spacing.xs,
  width: "100%",
  padding: `${spacing.xxs + 1}px ${spacing.sm}px`,
  paddingLeft: spacing.sm + depth * 8,
  border: "none",
  borderRadius: 0,
  background: "transparent",
  color: colors.text,
  cursor: "pointer",
  textAlign: "left",
  fontSize: typography.meta.size,
});

const fileRowStyle = (colors: ColorPalette, depth: number, active: boolean): React.CSSProperties => ({
  display: "flex",
  alignItems: "center",
  gap: spacing.sm,
  width: "100%",
  padding: `${spacing.xs}px ${spacing.sm}px`,
  paddingLeft: spacing.sm + depth * 8 + 12,
  border: `1px solid ${active ? colors.border : "transparent"}`,
  borderRadius: radius.xs,
  background: active ? colors.surfaceHover : "transparent",
  color: colors.text,
  cursor: "pointer",
  textAlign: "left",
});

const chevronStyle = (colors: ColorPalette): React.CSSProperties => ({
  fontSize: 10,
  width: 10,
  flexShrink: 0,
  color: colors.textMuted,
});

const folderIconStyle: React.CSSProperties = {
  fontSize: 12,
  flexShrink: 0,
};

const folderNameStyle = (colors: ColorPalette): React.CSSProperties => ({
  fontSize: typography.meta.size,
  fontWeight: 600,
  color: colors.text,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
});

const extBadgeStyle = (colors: ColorPalette, ext?: string): React.CSSProperties => ({
  minWidth: 26,
  borderRadius: radius.xs,
  border: `1px solid ${colors.border}`,
  color: colors.textMuted,
  fontSize: 9,
  textAlign: "center",
  padding: `0 ${spacing.xxs}px`,
  flexShrink: 0,
});

const fileNameStyle = (colors: ColorPalette, active: boolean): React.CSSProperties => ({
  fontSize: typography.meta.size,
  fontWeight: active ? 600 : 400,
  color: active ? colors.text : colors.text,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
});
