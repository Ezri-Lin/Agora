import Graph from "graphology";
import type { ScannedDoc } from "../AgoraBridge.js";
import { graph as graphTokens } from "../theme/tokens.js";

interface GraphColors {
  border: string;
  text: string;
}

interface ParsedDoc {
  path: string;
  name: string;
  wikilinks: string[];
  tags: string[];
}

/** Strip extension and normalize for wikilink matching. */
function normalize(name: string): string {
  return name.replace(/\.[^.]+$/, "").toLowerCase();
}

/** Obsidian-style node size: 3 * sqrt(degree + 1), clamped. */
function obsidianSize(degree: number, min: number, max: number): number {
  return Math.max(min, Math.min(3 * Math.sqrt(degree + 1), max));
}

/** Build a citation graph from parsed document data. */
export function buildWorkspaceGraph(
  docs: ScannedDoc[],
  parsed: ParsedDoc[],
  colors: GraphColors,
): Graph {
  const g = new Graph({ multi: true });

  // Index docs by normalized name for wikilink resolution
  const nameToPath = new Map<string, string>();
  for (const doc of docs) {
    nameToPath.set(normalize(doc.name), doc.path);
    nameToPath.set(doc.name.toLowerCase(), doc.path);
  }

  // ── Document nodes (Obsidian muted gray) ──
  for (const doc of docs) {
    const id = `doc:${doc.path}`;
    g.addNode(id, {
      label: doc.name.replace(/\.[^.]+$/, ""),
      kind: "document",
      x: (Math.random() - 0.5) * 2,
      y: (Math.random() - 0.5) * 2,
      size: 4,
      color: graphTokens.nodeFill,
    });
  }

  // ── Tag nodes (Obsidian green) ──
  const tagSet = new Set<string>();
  for (const p of parsed) {
    for (const tag of p.tags) tagSet.add(tag);
  }
  for (const tag of tagSet) {
    g.addNode(`tag:${tag}`, {
      label: `#${tag}`,
      kind: "tag",
      x: (Math.random() - 0.5) * 2,
      y: (Math.random() - 0.5) * 2,
      size: 3,
      color: graphTokens.nodeTag,
    });
  }
  for (const p of parsed) {
    const docId = `doc:${p.path}`;
    if (!g.hasNode(docId)) continue;
    for (const tag of p.tags) {
      const tagId = `tag:${tag}`;
      if (g.hasNode(tagId) && !g.hasEdge(docId, tagId)) {
        g.addEdge(docId, tagId, {
          size: 0.3,
          color: graphTokens.nodeStroke,
        });
      }
    }
  }

  // ── Wikilink edges (doc → doc) ──
  for (const p of parsed) {
    const srcId = `doc:${p.path}`;
    if (!g.hasNode(srcId)) continue;
    for (const target of p.wikilinks) {
      const targetPath = nameToPath.get(target.toLowerCase());
      if (targetPath) {
        const tgtId = `doc:${targetPath}`;
        if (g.hasNode(tgtId) && !g.hasEdge(srcId, tgtId)) {
          g.addEdge(srcId, tgtId, {
            size: 0.6,
            color: graphTokens.nodeStroke,
          });
        }
      } else {
        const ghostId = `ghost:${target}`;
        if (!g.hasNode(ghostId)) {
          g.addNode(ghostId, {
            label: target,
            kind: "ghost",
            x: (Math.random() - 0.5) * 2,
            y: (Math.random() - 0.5) * 2,
            size: 3,
            color: graphTokens.nodeMuted,
          });
        }
        if (!g.hasEdge(srcId, ghostId)) {
          g.addEdge(srcId, ghostId, {
            size: 0.3,
            color: graphTokens.nodeStroke,
          });
        }
      }
    }
  }

  // ── Obsidian-style size by degree: sqrt(degree+1) * 3, clamped ──
  g.forEachNode((node, attrs) => {
    const degree = g.degree(node);
    const kind = attrs.kind as string;
    const max = kind === "workspace" ? 15
      : kind === "tag" || kind === "ghost" ? 6
      : 12;
    g.setNodeAttribute(node, "size", obsidianSize(degree, 3, max));
  });

  return g;
}
