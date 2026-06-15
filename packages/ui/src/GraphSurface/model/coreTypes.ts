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
