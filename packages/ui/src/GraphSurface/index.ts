/**
 * GraphSurface — public API exports.
 */

export { GraphSurface } from "./GraphSurface.js";
export type { GraphSurfaceProps } from "./GraphSurface.js";

export type {
  CoreNode,
  CoreEdge,
  CoreGraph,
  CoreFlightEdge,
  CoreFlightEdgeKind,
  CoreGraphViewModel,
  ReadonlyVec2,
} from "./model/coreTypes.js";

export { buildCoreGraph, buildGraphViewModel } from "./model/coreTypes.js";
export { buildNodeIndex, getNeighbors, getConnectedEdges, getDegree } from "./model/graphSelectors.js";
export { D3ForceRuntime } from "./layout/D3ForceRuntime.js";
export { OBSIDIAN_PROFILE, LOOSE_PROFILE } from "./layout/layoutProfile.js";
export { resolveGraphTheme, watchGraphTheme, hexToPixiTint } from "./theme/ThemeBridge.js";
export type { ResolvedGraphTheme } from "./theme/ThemeBridge.js";
