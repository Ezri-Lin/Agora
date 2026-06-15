/**
 * FlightOverlayLayer — skeleton for stance/flight edge rendering.
 * Flight edges (supports/opposes/questions/contradicts/refines) are rendered
 * as curved directional arcs that do NOT participate in force layout.
 *
 * P0: Empty implementation. P1: curved arcs with color coding.
 */

import { Container } from "pixi.js";
import type { CoreFlightEdge } from "../model/coreTypes.js";

export class FlightOverlayLayer extends Container {
  private edges: ReadonlyArray<CoreFlightEdge> = [];

  setEdges(edges: ReadonlyArray<CoreFlightEdge>): void {
    this.edges = edges;
    // P1: create arc sprites per edge
  }

  /** Update arc positions from node positions. */
  updatePositions(_positions: ReadonlyMap<string, { x: number; y: number }>): void {
    // P1: update arc endpoints
  }

  /** Update visibility based on selection. */
  updateVisibility(_highlightedSet: Set<string> | null): void {
    // P1: show/hide arcs based on selection
  }

  isSettled(): boolean {
    return true; // P0: always settled (no animation)
  }

  override destroy(): void {
    this.edges = [];
    this.removeChildren();
    super.destroy();
  }
}
