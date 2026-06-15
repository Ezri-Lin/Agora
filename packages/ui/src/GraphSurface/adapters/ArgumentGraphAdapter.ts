/**
 * ArgumentGraphAdapter — builds a claim-level reasoning graph.
 * Shows claims, key claims, decisions, and open questions
 * with supports/opposes/questions/contradicts/refines flight edges.
 *
 * Uses 3-pass extraction to ensure claim indexes are complete
 * before deriving stance relations.
 */

import type { CoreNode, CoreEdge, CoreFlightEdge, CoreGraphViewModel } from "../model/coreTypes.js";
import { buildCoreGraph, buildGraphViewModel } from "../model/coreTypes.js";

interface ClaimInput {
  id: string;
  text: string;
  speakerId: string;
  isKey?: boolean;
}

interface StanceRelation {
  sourceClaimId: string;
  targetClaimId: string;
  kind: CoreFlightEdge["kind"];
  weight?: number;
}

interface ArgumentGraphInput {
  claims: ClaimInput[];
  decisions?: string[];
  openQuestions?: string[];
  stances?: StanceRelation[];
}

function truncate(s: string, max: number): string {
  const clean = s.replace(/[#*_`>\-\n]+/g, " ").trim();
  return clean.length > max ? clean.slice(0, max) + "\u2026" : clean;
}

export function buildArgumentGraph(input: ArgumentGraphInput): CoreGraphViewModel {
  const nodes: CoreNode[] = [];
  const edges: CoreEdge[] = [];
  const flightEdges: CoreFlightEdge[] = [];

  for (const claim of input.claims) {
    nodes.push({
      id: claim.id,
      label: truncate(claim.text, 50),
      kind: claim.isKey ? "key_claim" : "claim",
      size: claim.isKey ? 5 : 3,
      color: claim.isKey ? "#e0e0e0" : "#cccccc",
      weight: 1,
      data: { text: claim.text, speakerId: claim.speakerId },
    });
  }

  for (let i = 0; i < (input.decisions ?? []).length; i++) {
    nodes.push({
      id: `dec:${i}`,
      label: truncate(input.decisions![i], 50),
      kind: "decision",
      size: 5,
      color: "#4a8c5c",
      weight: 1,
    });
  }

  for (let i = 0; i < (input.openQuestions ?? []).length; i++) {
    nodes.push({
      id: `oq:${i}`,
      label: truncate(input.openQuestions![i], 50),
      kind: "open_question",
      size: 3,
      color: "#d29922",
      weight: 1,
    });
  }

  for (const stance of input.stances ?? []) {
    flightEdges.push({
      id: `fe:${stance.kind}:${stance.sourceClaimId}:${stance.targetClaimId}`,
      source: stance.sourceClaimId,
      target: stance.targetClaimId,
      kind: stance.kind,
      weight: stance.weight ?? 0.7,
    });
  }

  return buildGraphViewModel(buildCoreGraph(nodes, edges), flightEdges);
}

/**
 * Build argument graph from compact-like data using 3-pass extraction.
 * Pass 1: collect claims. Pass 2: build index. Pass 3: derive stances.
 */
export function buildArgumentGraphFromCompacts(
  compacts: Array<{
    messageId: string;
    speakerId: string;
    keyClaims: string[];
    agreements: Array<{ with: string; point: string }>;
    disagreements: Array<{ with: string; point: string }>;
    openQuestions: string[];
  }>,
  decisions?: string[],
): CoreGraphViewModel {
  const claims: ClaimInput[] = [];
  const stances: StanceRelation[] = [];

  // ── Pass 1: Collect all claims ──
  for (const compact of compacts) {
    for (const text of compact.keyClaims) {
      claims.push({
        id: `claim:${compact.messageId}:${simpleHash(text)}`,
        text,
        speakerId: compact.speakerId,
      });
    }
  }

  // ── Pass 2: Build claim text → ID index ──
  const claimTextToId = new Map<string, string>();
  for (const claim of claims) {
    claimTextToId.set(claim.text.toLowerCase(), claim.id);
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
          stances.push({ sourceClaimId: sourceId, targetClaimId: targetId, kind: "opposes", weight: 0.8 });
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
          stances.push({ sourceClaimId: sourceId, targetClaimId: targetId, kind: "supports", weight: 0.6 });
        }
      }
    }
  }

  return buildArgumentGraph({ claims, decisions, stances });
}

function simpleHash(text: string): string {
  let h = 0;
  for (let i = 0; i < text.length; i++) {
    h = ((h << 5) - h + text.charCodeAt(i)) | 0;
  }
  return Math.abs(h).toString(36);
}
