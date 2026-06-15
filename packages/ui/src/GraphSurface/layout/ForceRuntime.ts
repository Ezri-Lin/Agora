/**
 * ForceRuntime — layout engine interface.
 * Decouples renderer from any specific force simulation library.
 * Runtime positions are the single source of truth for node placement.
 */

import type { ReadonlyVec2 } from "./layoutTypes.js";
import type { CoreGraph } from "../model/coreTypes.js";
import type { LayoutProfile, ReleaseOptions } from "./layoutTypes.js";

export type { ReadonlyVec2, LayoutProfile, ReleaseOptions };

export interface ForceRuntime {
  /** Update graph data. Preserves existing node positions by id. */
  setGraph(graph: CoreGraph): void;

  /** Start simulation. */
  start(): void;

  /** Stop simulation (does NOT clear positions). */
  stop(): void;

  /** Stop simulation, clear all timers, release all resources. */
  destroy(): void;

  /** Advance simulation by one tick. */
  tick(): void;

  /** Whether the simulation is currently running. */
  isRunning(): boolean;

  /** Whether the simulation has settled (alpha decayed, no movement). */
  isSettled(): boolean;

  /** Subscribe to tick events. Returns unsubscribe function. */
  onTick(listener: () => void): () => void;

  /** Pin a node to a fixed position. Pass null to unpin. */
  setNodeFixed(nodeId: string, position: ReadonlyVec2 | null): void;

  /** Release a pinned node with optional sticky delay and velocity clear. */
  releaseNode(nodeId: string, options?: ReleaseOptions): void;

  /** Read-only snapshot of all node positions. */
  getPositions(): ReadonlyMap<string, ReadonlyVec2>;
}
