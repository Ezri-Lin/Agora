/**
 * ContextAdapter — converts CouncilMessage/RoleCard/selectedRefs → CoreGraph.
 * Absorbs logic from ContextGraph.tsx buildGraphology().
 */

import type { CouncilMessage, RoleCard } from "@agora/shared";
import type { CoreNode, CoreEdge, CoreGraph } from "../model/coreTypes.js";
import { buildCoreGraph } from "../model/coreTypes.js";
import { getRoleColor } from "../../theme/tokens.js";

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
