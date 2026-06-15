/**
 * SelectionController — hover/select state management.
 * Provides the highlighted set for node/edge muting.
 */

import type { CoreGraph } from "../model/coreTypes.js";
import { getHighlightedSet } from "../model/graphSelectors.js";

export class SelectionController {
  hoveredId: string | null = null;
  selectedId: string | null = null;
  private onChange: () => void;
  private settled = true;

  constructor(onChange: () => void) {
    this.onChange = onChange;
  }

  setHovered(id: string | null): void {
    if (id === this.hoveredId) return;
    this.hoveredId = id;
    this.settled = false;
    this.onChange();
  }

  setSelected(id: string | null): void {
    if (id === this.selectedId) return;
    this.selectedId = id;
    this.settled = false;
    this.onChange();
  }

  /** Get the set of node ids that should be highlighted (not muted). */
  getHighlightedSet(graph: CoreGraph): Set<string> | null {
    const activeId = this.hoveredId ?? this.selectedId;
    if (!activeId) return null;
    return getHighlightedSet(graph, activeId);
  }

  /** Mark as settled after visual updates complete. */
  markSettled(): void {
    this.settled = true;
  }

  isSettled(): boolean {
    return this.settled;
  }
}
