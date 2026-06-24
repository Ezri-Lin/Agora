/**
 * WorkspaceAdapter — converts ScannedDoc/RoomEntry/ParsedDoc → CoreGraph.
 * Absorbs logic from buildWorkspaceGraph.ts and buildFallbackGraph().
 */

import type { ScannedDoc } from "../../AgoraBridge.js";
import type { CoreNode, CoreEdge, CoreGraph } from "../model/coreTypes.js";
import { buildCoreGraph } from "../model/coreTypes.js";

interface RoomEntry {
  id: string;
  title: string;
  createdAt: string;
}

interface ParsedDoc {
  path: string;
  name: string;
  wikilinks: string[];
  tags: string[];
  aliases?: string[];
  markdownLinks?: string[];
}

interface GraphColors {
  border: string;
  nodeFill: string;
  nodeTag: string;
  nodeMuted: string;
  nodeGreen: string;
  nodeYellow: string;
  nodeGray: string;
  edgeWidth: number;
}

const DEFAULT_COLORS: GraphColors = {
  border: "#3f3f3f",
  nodeFill: "#999999",
  nodeTag: "#44cf6e",
  nodeMuted: "#ff6b6b",
  nodeGreen: "#4a8c5c",
  nodeYellow: "#b8a642",
  nodeGray: "#999999",
  edgeWidth: 0.4,
};

function truncate(s: string, max: number): string {
  const clean = s.replace(/[#*_`>\-\n]+/g, " ").trim();
  return clean.length > max ? clean.slice(0, max) + "\u2026" : clean;
}

function normalize(name: string): string {
  return name.replace(/\.[^.]+$/, "").toLowerCase();
}

function obsidianSize(degree: number, min: number, max: number): number {
  return Math.max(min, Math.min(1.8 * Math.sqrt(degree + 1), max));
}

/** Build fallback star graph (Phase 1: no file reading needed). */
export function buildFallbackCoreGraph(
  docs: ScannedDoc[],
  rooms: RoomEntry[],
  colors: Partial<GraphColors> = {},
): CoreGraph {
  const c = { ...DEFAULT_COLORS, ...colors };
  const nodes: CoreNode[] = [];
  const edges: CoreEdge[] = [];

  // Workspace center node
  nodes.push({
    id: "workspace",
    label: "Workspace",
    kind: "workspace",
    size: 8,
    color: c.nodeGray,
    weight: docs.length + rooms.length,
  });

  // Document nodes
  for (const doc of docs) {
    const id = `doc:${doc.path}`;
    nodes.push({
      id,
      label: doc.name,
      kind: "document",
      size: 5,
      color: c.nodeGreen,
      weight: 1,
    });
    edges.push({ id: `e:ws:${id}`, source: "workspace", target: id, size: c.edgeWidth, color: c.border });
  }

  // Room nodes
  for (const room of rooms) {
    const id = `room:${room.id}`;
    nodes.push({
      id,
      label: room.title || "Room",
      kind: "room",
      size: 6,
      color: c.nodeYellow,
      weight: 1,
    });
    edges.push({ id: `e:ws:${id}`, source: "workspace", target: id, size: c.edgeWidth, color: c.border });
  }

  // Degree-based sizing
  const degreeMap = new Map<string, number>();
  for (const e of edges) {
    degreeMap.set(e.source, (degreeMap.get(e.source) ?? 0) + 1);
    degreeMap.set(e.target, (degreeMap.get(e.target) ?? 0) + 1);
  }
  for (const node of nodes) {
    const degree = degreeMap.get(node.id) ?? 0;
    const max = node.kind === "workspace" ? 15 : node.kind === "room" ? 8 : 10;
    (node as { size: number }).size = obsidianSize(degree, 3, max);
  }

  return buildCoreGraph(nodes, edges);
}

/** Build citation graph from parsed documents (Phase 2: async file reading). */
export function buildCitationCoreGraph(
  docs: ScannedDoc[],
  parsed: ParsedDoc[],
  colors: Partial<GraphColors> = {},
): CoreGraph {
  const c = { ...DEFAULT_COLORS, ...colors };
  const nodes: CoreNode[] = [];
  const edges: CoreEdge[] = [];

  // Index by normalized name for wikilink resolution
  const nameToPath = new Map<string, string>();
  for (const doc of docs) {
    // Full normalized name (extension-stripped + lowercase)
    nameToPath.set(normalize(doc.name), doc.path);
    // Lowercase with extension
    nameToPath.set(doc.name.toLowerCase(), doc.path);
    // Basename (last path segment without extension)
    const basename = doc.path.split("/").pop() ?? doc.name;
    nameToPath.set(normalize(basename), doc.path);
    // Path without extension (for folder/note links)
    const pathNoExt = doc.path.replace(/\.[^.]+$/, "").toLowerCase();
    nameToPath.set(pathNoExt, doc.path);
  }

  // Index aliases from frontmatter
  for (const p of parsed) {
    if (p.aliases) {
      for (const alias of p.aliases) {
        const normalized = alias.toLowerCase().trim();
        if (normalized && !nameToPath.has(normalized)) {
          nameToPath.set(normalized, p.path);
        }
      }
    }
  }

  // Resolve wikilink target with multiple strategies
  function resolveWikilink(target: string): string | undefined {
    const lower = target.toLowerCase();
    // 1. Exact normalized match
    const exact = nameToPath.get(lower);
    if (exact) return exact;
    // 2. Try without path separators (basename only)
    const basename = target.split("/").pop() ?? target;
    const basenameLower = basename.toLowerCase();
    const basenameMatch = nameToPath.get(basenameLower);
    if (basenameMatch) return basenameMatch;
    // 3. Try with .md extension
    const withExt = nameToPath.get(lower + ".md");
    if (withExt) return withExt;
    // 4. Try normalized (strip extension)
    const normalized = normalize(target);
    const normalizedMatch = nameToPath.get(normalized);
    if (normalizedMatch) return normalizedMatch;
    return undefined;
  }

  // Document nodes
  for (const doc of docs) {
    nodes.push({
      id: `doc:${doc.path}`,
      label: doc.name,
      kind: "document",
      size: 4,
      color: c.nodeFill,
      weight: 1,
    });
  }

  // Tag nodes
  const tagSet = new Set<string>();
  for (const p of parsed) {
    for (const tag of p.tags) tagSet.add(tag);
  }
  for (const tag of tagSet) {
    nodes.push({
      id: `tag:${tag}`,
      label: `#${tag}`,
      kind: "tag",
      size: 3,
      color: c.nodeTag,
      weight: 1,
    });
  }

  // Tag edges
  for (const p of parsed) {
    const docId = `doc:${p.path}`;
    for (const tag of p.tags) {
      const tagId = `tag:${tag}`;
      edges.push({ id: `e:${docId}:${tagId}`, source: docId, target: tagId, size: 0.3, color: c.border });
    }
  }

  // Wikilink edges + ghost nodes
  const unresolvedTargets: string[] = [];
  for (const p of parsed) {
    const srcId = `doc:${p.path}`;
    for (const target of p.wikilinks) {
      const targetPath = resolveWikilink(target);
      if (targetPath) {
        const tgtId = `doc:${targetPath}`;
        edges.push({ id: `e:${srcId}:${tgtId}`, source: srcId, target: tgtId, size: 0.6, color: c.border });
      } else {
        unresolvedTargets.push(target);
        const ghostId = `ghost:${target}`;
        if (!nodes.some((n) => n.id === ghostId)) {
          nodes.push({
            id: ghostId,
            label: target,
            kind: "ghost",
            size: 3,
            color: c.nodeMuted,
            weight: 1,
          });
        }
        edges.push({ id: `e:${srcId}:${ghostId}`, source: srcId, target: ghostId, size: 0.3, color: c.border });
      }
    }
  }

  // Debug: log unresolved wikilink targets and sample nameToPath keys
  if (unresolvedTargets.length > 0) {
    const sampleKeys = Array.from(nameToPath.keys()).slice(0, 20);
    console.log(`[GraphAudit] Unresolved wikilinks: ${unresolvedTargets.length}/${unresolvedTargets.length + edges.filter(e => e.size === 0.6).length}`);
    console.log(`[GraphAudit] Sample unresolved:`, unresolvedTargets.slice(0, 10));
    console.log(`[GraphAudit] Sample nameToPath keys:`, sampleKeys);
  }

  // Degree-based sizing
  const degreeMap = new Map<string, number>();
  for (const e of edges) {
    degreeMap.set(e.source, (degreeMap.get(e.source) ?? 0) + 1);
    degreeMap.set(e.target, (degreeMap.get(e.target) ?? 0) + 1);
  }
  for (const node of nodes) {
    const degree = degreeMap.get(node.id) ?? 0;
    const min = node.kind === "document" ? 3.8 : 3.2;
    const max = node.kind === "tag" || node.kind === "ghost" ? 12 : 16;
    (node as { size: number }).size = obsidianSize(degree, min, max);
  }

  return buildCoreGraph(nodes, edges);
}

interface ProjectWorldExtras {
  keyClaims?: string[];
  decisions?: string[];
  rooms?: Array<{ id: string; title: string }>;
}

/**
 * Build project world graph — summary-level landmarks only.
 * Shows rooms, key claims, and decisions as landmarks.
 * Does NOT include message_turns, ordinary claims, or persona internals.
 */
export function buildProjectWorldGraph(
  docs: ScannedDoc[],
  parsed: ParsedDoc[],
  extras: ProjectWorldExtras = {},
  colors: Partial<GraphColors> = {},
): CoreGraph {
  const base = buildCitationCoreGraph(docs, parsed, colors);
  const nodes = [...base.nodes] as CoreNode[];
  const edges = [...base.edges] as CoreEdge[];

  for (const room of extras.rooms ?? []) {
    nodes.push({
      id: `room:${room.id}`,
      label: room.title || "Room",
      kind: "room",
      size: 6,
      color: "#b8a642",
      weight: 1,
    });
  }

  for (let i = 0; i < (extras.keyClaims ?? []).length; i++) {
    nodes.push({
      id: `kc:${i}`,
      label: truncate(extras.keyClaims![i], 40),
      kind: "key_claim",
      size: 4,
      color: "#cccccc",
      weight: 1,
    });
  }

  for (let i = 0; i < (extras.decisions ?? []).length; i++) {
    nodes.push({
      id: `dec:${i}`,
      label: truncate(extras.decisions![i], 40),
      kind: "decision",
      size: 5,
      color: "#4a8c5c",
      weight: 1,
    });
  }

  return buildCoreGraph(nodes, edges);
}
