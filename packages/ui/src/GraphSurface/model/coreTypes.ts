/**
 * Core graph types — domain-agnostic, serializable, immutable data.
 * Renderer and layout never import Agora-specific types.
 */

export type Vec2 = { x: number; y: number };
export type ReadonlyVec2 = Readonly<Vec2>;

// ── Nodes ──

export interface CoreNode {
  readonly id: string;
  readonly label: string;
  readonly kind: string;
  readonly size: number;
  readonly color: string;
  readonly weight?: number;
  readonly initialPosition?: ReadonlyVec2;
  readonly data?: unknown;
}

// ── Edges (base, participate in layout) ──

export interface CoreEdge {
  readonly id: string;
  readonly source: string;
  readonly target: string;
  readonly size: number;
  readonly color?: string;
  readonly weight?: number;
  readonly data?: unknown;
}

// ── Flight edges (overlay, do NOT participate in layout) ──

export type CoreFlightEdgeKind =
  | "supports"
  | "opposes"
  | "questions"
  | "contradicts"
  | "refines";

export interface CoreFlightEdge {
  readonly id: string;
  readonly source: string;
  readonly target: string;
  readonly kind: CoreFlightEdgeKind;
  readonly weight: number;
  readonly confidence?: number;
  readonly data?: unknown;
}

// ── Graph view modes ──

export type GraphViewMode =
  | "project_world"
  | "room_graph"
  | "argument_graph";

// ── Semantic node kinds ──

export const SEMANTIC_NODE_KINDS = {
  // Existing P0
  document: "document",
  directory: "directory",
  topic: "topic",
  source: "source",
  workspace: "workspace",
  tag: "tag",
  ghost: "ghost",
  // P1 semantic
  room: "room",
  persona: "persona",
  role: "role",
  message_turn: "message_turn",
  claim: "claim",
  key_claim: "key_claim",
  decision: "decision",
  evidence: "evidence",
  open_question: "open_question",
} as const;

export type SemanticNodeKind = typeof SEMANTIC_NODE_KINDS[keyof typeof SEMANTIC_NODE_KINDS];

// ── Semantic base edge kinds ──

export const SEMANTIC_EDGE_KINDS = {
  contains: "contains",
  links_to: "links_to",
  mentions: "mentions",
  discusses: "discusses",
  authored_by: "authored_by",
  replied_to: "replied_to",
  extracts_claim: "extracts_claim",
  cites: "cites",
  derived_from: "derived_from",
  summarized_into: "summarized_into",
  decided_as: "decided_as",
} as const;

export type SemanticEdgeKind = typeof SEMANTIC_EDGE_KINDS[keyof typeof SEMANTIC_EDGE_KINDS];

// ── Node kind classification helpers ──

/** Node kinds visible in project_world mode by default. */
export const PROJECT_WORLD_KINDS = new Set<string>([
  SEMANTIC_NODE_KINDS.document,
  SEMANTIC_NODE_KINDS.directory,
  SEMANTIC_NODE_KINDS.room,
  SEMANTIC_NODE_KINDS.topic,
  SEMANTIC_NODE_KINDS.decision,
  SEMANTIC_NODE_KINDS.key_claim,
  SEMANTIC_NODE_KINDS.workspace,
]);

/** Node kinds visible in argument_graph mode. */
export const ARGUMENT_KINDS = new Set<string>([
  SEMANTIC_NODE_KINDS.claim,
  SEMANTIC_NODE_KINDS.key_claim,
  SEMANTIC_NODE_KINDS.evidence,
  SEMANTIC_NODE_KINDS.decision,
  SEMANTIC_NODE_KINDS.open_question,
]);

/** Node kinds that are "landmarks" — always visible even in dense graphs. */
export const LANDMARK_KINDS = new Set<string>([
  SEMANTIC_NODE_KINDS.room,
  SEMANTIC_NODE_KINDS.decision,
  SEMANTIC_NODE_KINDS.key_claim,
  SEMANTIC_NODE_KINDS.workspace,
]);

// ── Graph (pure serializable data) ──

export interface CoreGraph {
  readonly nodes: ReadonlyArray<CoreNode>;
  readonly edges: ReadonlyArray<CoreEdge>;
}

// ── ViewModel (graph + flight overlay) ──

export interface CoreGraphViewModel {
  readonly graph: CoreGraph;
  readonly flightEdges: ReadonlyArray<CoreFlightEdge>;
}

// ── Builder ──

export function buildCoreGraph(
  nodes: CoreNode[],
  edges: CoreEdge[],
): CoreGraph {
  return { nodes, edges };
}

export function buildGraphViewModel(
  graph: CoreGraph,
  flightEdges: CoreFlightEdge[] = [],
): CoreGraphViewModel {
  return { graph, flightEdges };
}
