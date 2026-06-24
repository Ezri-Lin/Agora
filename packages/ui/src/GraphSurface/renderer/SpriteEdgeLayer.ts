/**
 * SpriteEdgeLayer — renders edges using PIXI.Graphics lines (v7 API).
 * Positions in graph coords — hanger applies camera transform.
 */

import { Container, Graphics } from "pixi.js";
import type { CoreEdge, ReadonlyVec2 } from "../model/coreTypes.js";
import type { ResolvedGraphTheme } from "../theme/ThemeBridge.js";
import type { EdgeLayer } from "./EdgeLayer.js";

const LERP_SPEED = 0.8;
const MIN_SCREEN_EDGE_WIDTH = 0.9;

interface EdgeView {
  id: string;
  gfx: Graphics;
  sourceId: string;
  targetId: string;
  color: number;
  baseAlpha: number;
  currentAlpha: number;
  targetAlpha: number;
  visible: boolean;
}

export class SpriteEdgeLayer extends Container implements EdgeLayer {
  private views: EdgeView[] = [];
  private edgeMap = new Map<string, EdgeView>();
  private edges: ReadonlyArray<CoreEdge> = [];
  private settled = true;

  build(edges: ReadonlyArray<CoreEdge>, theme: ResolvedGraphTheme): void {
    this.clear();
    this.edges = edges;

    for (const edge of edges) {
      const gfx = new Graphics();
      gfx.visible = false;
      gfx.eventMode = "none";
      this.addChild(gfx);

      // Edge-kind-based opacity (size is proxy: 0.6=wikilink, 0.3=tag, 0.2=ghost)
      let baseAlpha: number;
      if (edge.size === 0.6) {
        baseAlpha = theme.edge.defaultAlpha;           // 0.42 wikilink
      } else if (edge.size === 0.3) {
        baseAlpha = theme.edge.defaultAlpha * 0.24;    // ~0.10 tag
      } else if (edge.size === 0.2) {
        baseAlpha = theme.edge.defaultAlpha * 0.19;    // ~0.08 ghost
      } else {
        baseAlpha = theme.edge.defaultAlpha * 0.08;    // ~0.03 fallback
      }

      const view: EdgeView = {
        id: edge.id,
        gfx,
        sourceId: edge.source,
        targetId: edge.target,
        color: theme.edge.defaultTint,
        baseAlpha,
        currentAlpha: baseAlpha,
        targetAlpha: baseAlpha,
        visible: true,
      };
      this.views.push(view);
      this.edgeMap.set(edge.id, view);
    }
  }

  updatePositions(positions: ReadonlyMap<string, ReadonlyVec2>): void {
    for (const view of this.views) {
      const sp = positions.get(view.sourceId);
      const tp = positions.get(view.targetId);
      if (!sp || !tp) {
        view.gfx.visible = false;
        continue;
      }

      // Redraw line at graph positions (v7 API)
      view.gfx.clear();
      view.gfx.lineStyle(1.0, view.color);
      view.gfx.moveTo(sp.x, sp.y);
      view.gfx.lineTo(tp.x, tp.y);
      view.gfx.visible = view.visible;
    }
  }

  updateVisibility(
    highlightedSet: Set<string> | null,
    hoveredId: string | null,
    theme: ResolvedGraphTheme,
  ): void {
    for (const view of this.views) {
      if (!highlightedSet || !hoveredId) {
        view.visible = true;
        view.targetAlpha = view.baseAlpha;
      } else {
        const connected =
          highlightedSet.has(view.sourceId) && highlightedSet.has(view.targetId);
        if (connected) {
          view.visible = true;
          view.targetAlpha = theme.edge.highlightAlpha;
        } else {
          view.visible = false;
          view.targetAlpha = 0;
        }
      }
    }
    this.settled = false;
  }

  animate(): boolean {
    let allSettled = true;

    for (const view of this.views) {
      const da = view.targetAlpha - view.currentAlpha;
      if (Math.abs(da) > 0.005) {
        view.currentAlpha += da * LERP_SPEED;
        view.gfx.alpha = view.currentAlpha;
        allSettled = false;
      } else {
        view.currentAlpha = view.targetAlpha;
        view.gfx.alpha = view.targetAlpha;
      }
      view.gfx.visible = view.visible && view.currentAlpha > 0.01;
    }

    this.settled = allSettled;
    return allSettled;
  }

  isSettled(): boolean {
    return this.settled;
  }

  private clear(): void {
    for (const view of this.views) {
      view.gfx.destroy();
    }
    this.views = [];
    this.edgeMap.clear();
    this.removeChildren();
  }

  override destroy(): void {
    this.clear();
    super.destroy();
  }
}
