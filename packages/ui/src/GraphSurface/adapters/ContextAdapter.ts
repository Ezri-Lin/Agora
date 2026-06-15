/**
 * ContextAdapter — converts CouncilMessage/RoleCard/selectedRefs → CoreGraph.
 * Absorbs logic from ContextGraph.tsx buildGraphology().
 */

import type { CouncilMessage, RoleCard } from "@agora/shared";
import type { CoreNode, CoreEdge, CoreGraph, CoreFlightEdge, CoreGraphViewModel } from "../model/coreTypes.js";
import { buildCoreGraph, buildGraphViewModel } from "../model/coreTypes.js";
import { getRoleColor } from "../../theme/tokens.js";

/**
 * Compact-like interface for graph extraction.
 * Mirrors MessageCompact from @agora/kernel but defined locally
 * to avoid cross-package dependency from UI → kernel.
 * If kernel types become importable, replace with: import type { MessageCompact } from "@agora/kernel";
 */
export interface GraphMessageCompactLike {
  messageId: string;
  speakerId: string;
  phase: string;
  summary: string;
  keyClaims: string[];
  agreements: Array<{ with: string; point: string }>;
  disagreements: Array<{ with: string; point: string }>;
  openQuestions: string[];
}

function truncate(s: string, max: number): string {
  const clean = s.replace(/[#*_`>\-\n]+/g, " ").trim();
  return clean.length > max ? clean.slice(0, max) + "\u2026" : clean;
}

export function buildContextCoreGraph(
  messages: CouncilMessage[],
  selectedRefs: Array<{ path: string; label: string }>,
  roles: RoleCard[],
): CoreGraph {
  const nodes: CoreNode[] = [];
  const edges: CoreEdge[] = [];

  const userMsg = messages.find((m) => m.senderType === "user");
  if (!userMsg) return buildCoreGraph([], []);

  // Topic node (user message)
  nodes.push({
    id: "topic",
    label: truncate(userMsg.content, 40),
    kind: "topic",
    size: 6,
    color: "#999999",
    weight: messages.length,
    data: { content: userMsg.content },
  });

  // Source nodes
  const sourceIds: string[] = [];
  for (const ref of selectedRefs) {
    const id = `source:${ref.path}`;
    sourceIds.push(id);
    nodes.push({
      id,
      label: ref.label,
      kind: "source",
      size: 5,
      color: "#999999",
      weight: 1,
    });
    edges.push({ id: `e:topic:${id}`, source: "topic", target: id, size: 0.5 });
  }

  // Role nodes (unique by senderId)
  const roleMsgs = messages.filter((m) => m.senderType === "role" && m.status !== "error");
  const seenRoles = new Set<string>();
  const roleIds: string[] = [];

  for (const msg of roleMsgs) {
    if (seenRoles.has(msg.senderId)) continue;
    seenRoles.add(msg.senderId);

    const roleDef = roles.find((r) => r.id === msg.senderId);
    const name = roleDef?.name ?? msg.senderId;
    const id = `role:${msg.senderId}`;
    roleIds.push(id);

    const colorHex = getRoleColor(msg.senderId);
    nodes.push({
      id,
      label: name,
      kind: "role",
      size: 5,
      color: colorHex,
      weight: 2,
      data: { content: msg.graphSummary || truncate(msg.content, 80) },
    });
    edges.push({ id: `e:${id}:topic`, source: id, target: "topic", size: 0.5 });
  }

  // Decorative role-role edges (40% random)
  for (let i = 0; i < roleIds.length; i++) {
    for (let j = i + 1; j < roleIds.length; j++) {
      if (Math.random() < 0.4) {
        edges.push({
          id: `e:${roleIds[i]}:${roleIds[j]}`,
          source: roleIds[i],
          target: roleIds[j],
          size: 0.3,
        });
      }
    }
  }

  // Decorative source-role edges (30% random)
  for (const srcId of sourceIds) {
    for (const roleId of roleIds) {
      if (Math.random() < 0.3) {
        edges.push({
          id: `e:${srcId}:${roleId}`,
          source: srcId,
          target: roleId,
          size: 0.3,
        });
      }
    }
  }

  // Degree-based sizing
  const degreeMap = new Map<string, number>();
  for (const e of edges) {
    degreeMap.set(e.source, (degreeMap.get(e.source) ?? 0) + 1);
    degreeMap.set(e.target, (degreeMap.get(e.target) ?? 0) + 1);
  }
  for (const node of nodes) {
    const degree = degreeMap.get(node.id) ?? 0;
    const max = node.kind === "topic" ? 12 : 8;
    (node as { size: number }).size = Math.max(3, Math.min(3 * Math.sqrt(degree + 1), max));
  }

  return buildCoreGraph(nodes, edges);
}

/**
 * Build a room-level CoreGraphViewModel with optional semantic enrichment.
 * Uses 3-pass extraction:
 *   Pass 1: collect all claim/question/decision nodes
 *   Pass 2: build claimTextToId index
 *   Pass 3: derive supports/opposes flightEdges
 * Falls back to simple topic/role graph when compact data is absent.
 */
export function buildRoomGraphViewModel(
  messages: CouncilMessage[],
  selectedRefs: Array<{ path: string; label: string }>,
  roles: RoleCard[],
  compacts?: GraphMessageCompactLike[],
): CoreGraphViewModel {
  const baseGraph = buildContextCoreGraph(messages, selectedRefs, roles);

  if (!compacts || compacts.length === 0) {
    return buildGraphViewModel(baseGraph);
  }

  const nodes = [...baseGraph.nodes] as CoreNode[];
  const edges = [...baseGraph.edges] as CoreEdge[];
  const flightEdges: CoreFlightEdge[] = [];
  const existingIds = new Set(nodes.map((n) => n.id));

  // ── Pass 1: Collect all semantic nodes ──

  for (const compact of compacts) {
    const turnId = `turn:${compact.messageId}`;

    if (!existingIds.has(turnId)) {
      nodes.push({
        id: turnId,
        label: compact.summary || `Turn by ${compact.speakerId}`,
        kind: "message_turn",
        size: 4,
        color: "#888888",
        weight: 1,
        data: { phase: compact.phase, speakerId: compact.speakerId },
      });
      existingIds.add(turnId);

      const roleId = `role:${compact.speakerId}`;
      if (existingIds.has(roleId)) {
        edges.push({ id: `e:${roleId}:${turnId}`, source: roleId, target: turnId, size: 0.4 });
      }
    }

    for (const claimText of compact.keyClaims) {
      const claimId = `claim:${compact.messageId}:${hashClaim(claimText)}`;
      if (!existingIds.has(claimId)) {
        nodes.push({
          id: claimId,
          label: truncate(claimText, 50),
          kind: "claim",
          size: 3,
          color: "#cccccc",
          weight: 1,
          data: { text: claimText, speakerId: compact.speakerId },
        });
        existingIds.add(claimId);
        edges.push({ id: `e:${turnId}:${claimId}`, source: turnId, target: claimId, size: 0.3 });
      }
    }

    for (const q of compact.openQuestions) {
      const qId = `oq:${compact.messageId}:${hashClaim(q)}`;
      if (!existingIds.has(qId)) {
        nodes.push({
          id: qId,
          label: truncate(q, 50),
          kind: "open_question",
          size: 3,
          color: "#d29922",
          weight: 1,
          data: { text: q },
        });
        existingIds.add(qId);
      }
    }
  }

  // ── Pass 2: Build claim text → ID index ──

  const claimTextToId = new Map<string, string>();
  for (const node of nodes) {
    if (node.kind === "claim" || node.kind === "key_claim") {
      const text = (node.data as { text?: string })?.text;
      if (text) claimTextToId.set(text.toLowerCase(), node.id);
    }
  }

  // ── Pass 3: Derive stance flight edges ──
  // Prefer false negatives: only match when point text maps to a specific claim.

  for (const compact of compacts) {
    for (const d of compact.disagreements) {
      const sourceId = claimTextToId.get(d.point.toLowerCase());
      if (!sourceId) continue;

      const targetCompact = compacts.find((c) => c.speakerId === d.with);
      if (!targetCompact) continue;

      for (const tc of targetCompact.keyClaims) {
        const targetId = claimTextToId.get(tc.toLowerCase());
        if (targetId && targetId !== sourceId) {
          flightEdges.push({
            id: `fe:opposes:${sourceId}:${targetId}`,
            source: sourceId,
            target: targetId,
            kind: "opposes",
            weight: 0.8,
          });
        }
      }
    }

    for (const a of compact.agreements) {
      const sourceId = claimTextToId.get(a.point.toLowerCase());
      if (!sourceId) continue;

      const targetCompact = compacts.find((c) => c.speakerId === a.with);
      if (!targetCompact) continue;

      for (const tc of targetCompact.keyClaims) {
        const targetId = claimTextToId.get(tc.toLowerCase());
        if (targetId && targetId !== sourceId) {
          flightEdges.push({
            id: `fe:supports:${sourceId}:${targetId}`,
            source: sourceId,
            target: targetId,
            kind: "supports",
            weight: 0.6,
          });
        }
      }
    }
  }

  return buildGraphViewModel(buildCoreGraph(nodes, edges), flightEdges);
}

function hashClaim(text: string): string {
  let h = 0;
  for (let i = 0; i < text.length; i++) {
    h = ((h << 5) - h + text.charCodeAt(i)) | 0;
  }
  return Math.abs(h).toString(36);
}
