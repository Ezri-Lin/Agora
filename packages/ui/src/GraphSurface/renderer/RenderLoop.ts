/**
 * RenderLoop — idle-aware render loop using Pixi ticker (v7).
 * v7 ticker auto-renders, so we don't call app.render() explicitly.
 * Stops rendering after all layers settled for IDLE_THRESHOLD frames.
 */

import type { Application } from "pixi.js";

const IDLE_THRESHOLD = 60;

export interface SettledSource {
  isSettled(): boolean;
}

export class RenderLoop {
  private idleFrames = 0;
  private active = false;
  private sources: SettledSource[] = [];
  private renderFn: () => void;
  private ticker: Application["ticker"];

  constructor(app: Application, renderFn: () => void) {
    this.renderFn = renderFn;
    this.ticker = app.ticker;
  }

  /** Register a settled-source (camera, layout, layers, selection). */
  addSource(source: SettledSource): void {
    this.sources.push(source);
  }

  /** Start the render loop. */
  start(): void {
    if (this.active) return;
    this.active = true;
    this.idleFrames = 0;
    this.ticker.add(this.onTick, this);
  }

  /** Stop the render loop entirely. */
  stop(): void {
    if (!this.active) return;
    this.active = false;
    this.ticker.remove(this.onTick, this);
  }

  /** Wake up the loop (reset idle counter, ensure running). */
  wake(): void {
    this.idleFrames = 0;
    if (!this.active) this.start();
  }

  /** Check if all sources are settled. */
  private allSettled(): boolean {
    for (const s of this.sources) {
      if (!s.isSettled()) return false;
    }
    return true;
  }

  private onTick(): void {
    this.renderFn();
    // v7 auto-renders via ticker — no explicit app.render() needed

    if (this.allSettled()) {
      this.idleFrames++;
      if (this.idleFrames >= IDLE_THRESHOLD) {
        this.stop();
      }
    } else {
      this.idleFrames = 0;
    }
  }

  destroy(): void {
    this.stop();
    this.sources = [];
  }
}
