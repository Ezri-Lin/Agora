/**
 * SpriteEdgeLayer — renders edges using PIXI.Graphics lines (v7 API).
 * Positions in graph coords — hanger applies camera transform.
 * Supports: zoom-dependent fade, hub-spoke de-emphasis, endpoint clipping.
 */

import { Container, Graphics } from "pixi.js";
import type { CoreEdge, ReadonlyVec2 } from "../model/coreTypes.js";
import type { ResolvedGraphTheme } from "../theme/ThemeBridge.js";
import type { EdgeLayer } from "./EdgeLayer.js";

const LERP_SPEED = 0.8;
const MIN_SCREEN_EDGE_WIDTH = 0.55;
const ZOOM_FADE_THRESHOLD = 0.5;

// Hub-spoke visual constants
const HUB_SPOKE_ALPHA = 0.035;
const HUB_SPOKE_WIDTH_FACTOR = 0.35;
const HUB_SPOKE_HIGHLIGHT_ALPHA = 0.65;
const ENDPOINT_PAD = 1.5;

// Zoom-aware hub-spoke fade thresholds
const ZOOM_SPOKE_FADE_LOW = 0.8;
const ZOOM_SPOKE_FADE_HIGH = 1.5;

export interface NodeMeta {
  kind: string;
  size: number;
  docDocDegree: number;
}

interface EdgeView {
  id: string;
  gfx: Graphics;
  sourceId: string;
  targetId: string;
  color: number;
  baseAlpha: number;
  edgeKind: "wikilink" | "tag" | "ghost" | "fallback";
  isHubSpoke: boolean;
  currentAlpha: number;
  targetAlpha: number;
  visible: boolean;
}

export class SpriteEdgeLayer extends Container implements EdgeLayer {
  private views: EdgeView[] = [];
  private edgeMap = new Map<string, EdgeView>();
  private edges: ReadonlyArray<CoreEdge> = [];
  private nodeMeta = new Map<string, NodeMeta>();
  private settled = true;
  private zoomFade = 1.0;
  private zoom = 1.0;

  build(edges: ReadonlyArray<CoreEdge>, theme: ResolvedGraphTheme): void {
    this.clear();
    this.edges = edges;

    for (const edge of edges) {
      const gfx = new Graphics();
      gfx.visible = false;
      gfx.eventMode = "none";
      this.addChild(gfx);

      // Edge-kind-based opacity
      let baseAlpha: number;
      let edgeKind: EdgeView["edgeKind"];
      if (edge.size === 0.6) {
        baseAlpha = theme.edge.defaultAlpha;
        edgeKind = "wikilink";
      } else if (edge.size === 0.3) {
        baseAlpha = theme.edge.defaultAlpha * 0.24;
        edgeKind = "tag";
      } else if (edge.size === 0.2) {
        baseAlpha = theme.edge.defaultAlpha * 0.19;
        edgeKind = "ghost";
      } else {
        baseAlpha = theme.edge.defaultAlpha * 0.08;
        edgeKind = "fallback";
      }

      const view: EdgeView = {
        id: edge.id,
        gfx,
        sourceId: edge.source,
        targetId: edge.target,
        color: theme.edge.defaultTint,
        baseAlpha,
        edgeKind,
        isHubSpoke: false,
        currentAlpha: baseAlpha,
        targetAlpha: baseAlpha,
        visible: true,
      };
      this.views.push(view);
      this.edgeMap.set(edge.id, view);
    }

    // Re-classify if nodeMeta already provided
    if (this.nodeMeta.size > 0) this.classifyHubSpokes();
  }

  /** Provide node metadata for hub-spoke detection and endpoint clipping. */
  setNodeMeta(meta: ReadonlyMap<string, NodeMeta>): void {
    this.nodeMeta = new Map(meta);
    if (this.views.length > 0) this.classifyHubSpokes();
  }

  private classifyHubSpokes(): void {
    for (const view of this.views) {
      if (view.edgeKind !== "wikilink") {
        view.isHubSpoke = false;
        continue;
      }
      const src = this.nodeMeta.get(view.sourceId);
      const tgt = this.nodeMeta.get(view.targetId);
      if (!src || !tgt) { view.isHubSpoke = false; continue; }

      const srcDoc = src.kind === "document" ? src.docDocDegree : -1;
      const tgtDoc = tgt.kind === "document" ? tgt.docDocDegree : -1;

      // Hub-spoke: one end is hub (degree >= 3), other is leaf (degree <= 1)
      view.isHubSpoke = (srcDoc >= 3 && tgtDoc <= 1) || (tgtDoc >= 3 && srcDoc <= 1);

      // Apply hub-spoke base alpha
      if (view.isHubSpoke) {
        view.baseAlpha = HUB_SPOKE_ALPHA;
      }
    }
  }

  updatePositions(positions: ReadonlyMap<string, ReadonlyVec2>, zoom = 1): void {
    this.zoom = zoom;
    const edgeWidth = Math.max(1.0, MIN_SCREEN_EDGE_WIDTH / zoom);

    // Zoom fade for all edges
    if (zoom < ZOOM_FADE_THRESHOLD) {
      this.zoomFade = Math.max(0.05, zoom / ZOOM_FADE_THRESHOLD);
    } else {
      this.zoomFade = 1.0;
    }

    // Hub-spoke zoom fade: different thresholds
    let spokeZoomFade: number;
    if (zoom < ZOOM_SPOKE_FADE_LOW) {
      spokeZoomFade = 0.25;
    } else if (zoom < ZOOM_SPOKE_FADE_HIGH) {
      spokeZoomFade = 0.5;
    } else {
      spokeZoomFade = 0.85;
    }

    for (const view of this.views) {
      const sp = positions.get(view.sourceId);
      const tp = positions.get(view.targetId);
      if (!sp || !tp) {
        view.gfx.visible = false;
        continue;
      }

      // Endpoint clipping: don't draw through node centers
      const dx = tp.x - sp.x;
      const dy = tp.y - sp.y;
      const len = Math.sqrt(dx * dx + dy * dy);

      let x1 = sp.x, y1 = sp.y, x2 = tp.x, y2 = tp.y;

      if (len > 0.001) {
        const srcMeta = this.nodeMeta.get(view.sourceId);
        const tgtMeta = this.nodeMeta.get(view.targetId);
        const srcR = (srcMeta?.size ?? 0) + ENDPOINT_PAD;
        const tgtR = (tgtMeta?.size ?? 0) + ENDPOINT_PAD;

        const ux = dx / len;
        const uy = dy / len;

        // Only clip if nodes don't overlap
        if (srcR + tgtR < len) {
          x1 = sp.x + ux * srcR;
          y1 = sp.y + uy * srcR;
          x2 = tp.x - ux * tgtR;
          y2 = tp.y - uy * tgtR;
        }
      }

      // Hub-spoke edge width is thinner
      const w = view.isHubSpoke
        ? edgeWidth * HUB_SPOKE_WIDTH_FACTOR
        : edgeWidth;

      view.gfx.clear();
      view.gfx.lineStyle(w, view.color);
      view.gfx.moveTo(x1, y1);
      view.gfx.lineTo(x2, y2);
      view.gfx.visible = view.visible;

      // Store spoke zoom fade for animate()
      (view as any)._spokeZoomFade = view.isHubSpoke ? spokeZoomFade : 1.0;
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
          // Hub-spoke highlighted: use higher alpha than default spoke
          view.targetAlpha = view.isHubSpoke
            ? HUB_SPOKE_HIGHLIGHT_ALPHA
            : theme.edge.highlightAlpha;
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
        allSettled = false;
      } else {
        view.currentAlpha = view.targetAlpha;
      }
      // Apply zoom fade + spoke zoom fade
      const kindFade = view.edgeKind === "tag" || view.edgeKind === "ghost"
        ? this.zoomFade * 0.7
        : this.zoomFade;
      const spokeFade = (view as any)._spokeZoomFade ?? 1.0;
      view.gfx.alpha = view.currentAlpha * kindFade * spokeFade;
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
