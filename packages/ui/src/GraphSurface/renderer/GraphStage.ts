/**
 * GraphStage — PIXI.Application lifecycle manager (v7).
 * Matches Obsidian's approach: hanger container for camera transform.
 */

import * as PIXI from "pixi.js";

export interface GraphStage {
  app: PIXI.Application;
  /** Root container (= app.stage) */
  root: PIXI.Container;
  /** Camera container — set x/y/scale for pan/zoom */
  hanger: PIXI.Container;
  destroy(): void;
}

interface StageOptions {
  backgroundAlpha?: number;
  antialias?: boolean;
  resolution?: number;
}

let nextStageId = 0;

/**
 * Create a GraphStage attached to a DOM container.
 * Matches Obsidian: PIXI v7, hanger-based camera, manual render control.
 */
export function createGraphStage(
  container: HTMLElement,
  options: StageOptions = {},
): GraphStage {
  const stageId = ++nextStageId;
  let destroyed = false;

  // Create canvas element (Obsidian-style)
  const canvas = document.createElement("canvas");
  canvas.style.position = "absolute";
  canvas.style.top = "0";
  canvas.style.left = "0";
  container.appendChild(canvas);

  // Let PIXI handle sizing — just pass container dimensions
  const w = container.clientWidth;
  const h = container.clientHeight;

  // Create PIXI app (v7 API — no async init)
  const app = new PIXI.Application({
    view: canvas,
    width: w,
    height: h,
    antialias: options.antialias ?? true,
    backgroundAlpha: options.backgroundAlpha ?? 0,
    resolution: options.resolution ?? window.devicePixelRatio ?? 1,
    autoDensity: true,
  });

  // Build container hierarchy: app.stage → hanger → layers
  const hanger = new PIXI.Container();
  app.stage.addChild(hanger);

  // Disable PIXI's built-in interaction manager — we use our own HitTestIndex
  app.renderer.events.destroy();

  function destroy() {
    if (destroyed) return;
    destroyed = true;

    // Remove canvas from DOM
    if (canvas.parentNode) canvas.parentNode.removeChild(canvas);

    // Destroy app
    app.destroy(true, { children: true, texture: true });
  }

  return { app, root: app.stage, hanger, destroy };
}
