/**
 * EdgeLayer — interface for edge rendering.
 * SpriteEdgeLayer is the Obsidian-compatible implementation.
 */

import type { Container } from "pixi.js";
import type { CoreEdge, ReadonlyVec2 } from "../model/coreTypes.js";
import type { ResolvedGraphTheme } from "../theme/ThemeBridge.js";

export interface EdgeLayer extends Container {
  build(edges: ReadonlyArray<CoreEdge>, theme: ResolvedGraphTheme): void;
  updatePositions(positions: ReadonlyMap<string, ReadonlyVec2>): void;
  updateVisibility(highlightedSet: Set<string> | null, hoveredId: string | null, theme: ResolvedGraphTheme): void;
  animate(): boolean;
  isSettled(): boolean;
  destroy(): void;
}
