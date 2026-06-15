/**
 * CameraController — current/target dual-state camera with exponential lerp.
 * Camera transform is applied to the world container, not per-sprite.
 */

import type { ReadonlyVec2 } from "../model/coreTypes.js";

export interface CameraState {
  x: number;
  y: number;
  scale: number;
}

const DEFAULT_EASE = 0.8;

export class CameraController {
  current: CameraState = { x: 0, y: 0, scale: 1 };
  target: CameraState = { x: 0, y: 0, scale: 1 };
  private easeFactor: number;
  private epsilon: number;

  constructor(easeFactor = DEFAULT_EASE) {
    this.easeFactor = easeFactor;
    this.epsilon = 0.001 / easeFactor;
  }

  /** Set target position and scale. */
  setTarget(x: number, y: number, scale: number): void {
    this.target.x = x;
    this.target.y = y;
    this.target.scale = Math.max(0.02, Math.min(50, scale));
  }

  /** Pan target by screen-space delta (pixels). */
  pan(dx: number, dy: number, viewportW: number): void {
    const worldScale = this.current.scale;
    this.target.x -= dx / (viewportW / worldScale);
    this.target.y -= dy / (viewportW / worldScale);
  }

  /** Zoom target around a screen-space anchor point. */
  zoomAt(
    screenX: number,
    screenY: number,
    factor: number,
    viewportW: number,
    viewportH: number,
  ): void {
    const prevScale = this.target.scale;
    const newScale = Math.max(0.02, Math.min(50, prevScale * factor));

    // Convert anchor to graph coords before zoom
    const graphX = (screenX - viewportW / 2) / (viewportW / prevScale) + this.target.x;
    const graphY = (screenY - viewportH / 2) / (viewportW / prevScale) + this.target.y;

    // Adjust position so anchor stays fixed
    this.target.x = graphX - (screenX - viewportW / 2) / (viewportW / newScale);
    this.target.y = graphY - (screenY - viewportH / 2) / (viewportW / newScale);
    this.target.scale = newScale;
  }

  /** Lerp current toward target. Returns true if still moving. */
  tick(): boolean {
    const e = this.easeFactor;
    const dx = this.target.x - this.current.x;
    const dy = this.target.y - this.current.y;
    const ds = this.target.scale - this.current.scale;

    const moving =
      Math.abs(dx) > this.epsilon ||
      Math.abs(dy) > this.epsilon ||
      Math.abs(ds) > this.epsilon * 0.01;

    if (moving) {
      this.current.x += dx * e;
      this.current.y += dy * e;
      this.current.scale += ds * e;
    } else {
      this.current.x = this.target.x;
      this.current.y = this.target.y;
      this.current.scale = this.target.scale;
    }

    return moving;
  }

  /** Snap current to target (no lerp). */
  snap(): void {
    this.current.x = this.target.x;
    this.current.y = this.target.y;
    this.current.scale = this.target.scale;
  }

  /** Whether camera is settled (current ≈ target). */
  isSettled(): boolean {
    const dx = Math.abs(this.target.x - this.current.x);
    const dy = Math.abs(this.target.y - this.current.y);
    const ds = Math.abs(this.target.scale - this.current.scale);
    return dx < this.epsilon && dy < this.epsilon && ds < this.epsilon * 0.01;
  }

  /** Convert graph coords to screen coords. */
  graphToScreen(
    gx: number,
    gy: number,
    viewportW: number,
    viewportH: number,
  ): [number, number] {
    const s = this.current.scale;
    return [
      (gx - this.current.x) * s + viewportW / 2,
      (gy - this.current.y) * s + viewportH / 2,
    ];
  }

  /** Convert screen coords to graph coords. */
  screenToGraph(
    sx: number,
    sy: number,
    viewportW: number,
    viewportH: number,
  ): [number, number] {
    const s = this.current.scale;
    return [
      (sx - viewportW / 2) / s + this.current.x,
      (sy - viewportH / 2) / s + this.current.y,
    ];
  }

  /** Fit camera to a bounding box. */
  fitBounds(
    minX: number,
    minY: number,
    maxX: number,
    maxY: number,
    viewportW: number,
    viewportH: number,
    padding = 40,
  ): void {
    const rangeX = (maxX - minX) || 1;
    const rangeY = (maxY - minY) || 1;
    const scale = Math.min(
      (viewportW - padding * 2) / rangeX,
      (viewportH - padding * 2) / rangeY,
    );
    this.setTarget(
      (minX + maxX) / 2,
      (minY + maxY) / 2,
      Math.max(0.05, Math.min(20, scale)),
    );
    this.snap();
  }
}
