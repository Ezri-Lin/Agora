/**
 * FlightOverlayLayer — renders stance flight edges as curved directional arcs.
 * Flight edges (supports/opposes/questions/contradicts/refines) are overlay-only
 * and do NOT participate in force layout.
 *
 * API:
 * - setEdges() — initialize edges (called on data change)
 * - updateVisibility() — set visibility targets (called on selection change, NOT every frame)
 * - render() — lerp alpha + draw arcs (called every frame while active)
 * - isSettled() — true when no alpha animation pending
 */

import { Container, Graphics } from "pixi.js";
import type { CoreFlightEdge, ReadonlyVec2 } from "../model/coreTypes.js";
import type { ResolvedGraphTheme } from "../theme/ThemeBridge.js";

const LERP_SPEED = 0.8;
const MIN_DIST = 1;

interface FlightEdgeView {
  id: string;
  gfx: Graphics;
  sourceId: string;
  targetId: string;
  kind: CoreFlightEdge["kind"];
  color: number;
  lineWidth: number;
  currentAlpha: number;
  targetAlpha: number;
  visible: boolean;
}

export class FlightOverlayLayer extends Container {
  private views: FlightEdgeView[] = [];
  private edgeMap = new Map<string, FlightEdgeView>();
  private edges: ReadonlyArray<CoreFlightEdge> = [];
  private settled = true;

  /** Initialize edges. Called on data change. */
  setEdges(edges: ReadonlyArray<CoreFlightEdge>, theme?: ResolvedGraphTheme): void {
    this.clear();
    this.edges = edges;

    for (const edge of edges) {
      const gfx = new Graphics();
      gfx.visible = false;
      gfx.eventMode = "none";
      this.addChild(gfx);

      const { color, lineWidth } = resolveEdgeStyle(edge.kind, theme);

      this.views.push({
        id: edge.id,
        gfx,
        sourceId: edge.source,
        targetId: edge.target,
        kind: edge.kind,
        color,
        lineWidth,
        currentAlpha: 0,
        targetAlpha: 0.6,
        visible: true,
      });
      this.edgeMap.set(edge.id, this.views[this.views.length - 1]);
    }

    this.settled = false;
  }

  /**
   * Update visibility targets. Called ONLY on selection/hover change, NOT every frame.
   * Calling this every frame would keep settled=false and break idle stop.
   */
  updateVisibility(
    highlightedSet: Set<string> | null,
    _theme: ResolvedGraphTheme,
    showAll = false,
  ): void {
    for (const view of this.views) {
      if (showAll) {
        view.visible = true;
        view.targetAlpha = 0.5;
      } else if (!highlightedSet) {
        view.visible = true;
        view.targetAlpha = 0.4;
      } else {
        const connected =
          highlightedSet.has(view.sourceId) || highlightedSet.has(view.targetId);
        view.visible = connected;
        view.targetAlpha = connected ? 0.85 : 0;
      }
    }
    this.settled = false;
  }

  /** Update theme colors. Called on theme change. */
  updateTheme(theme: ResolvedGraphTheme): void {
    for (const view of this.views) {
      const { color, lineWidth } = resolveEdgeStyle(view.kind, theme);
      view.color = color;
      view.lineWidth = lineWidth;
    }
    this.settled = false;
  }

  /**
   * Combined alpha lerp + draw. Called every frame while render loop is active.
   * This is the ONLY method that redraws arcs.
   */
  renderArcs(positions: ReadonlyMap<string, ReadonlyVec2>): boolean {
    let allSettled = true;

    for (const view of this.views) {
      // Lerp alpha
      const da = view.targetAlpha - view.currentAlpha;
      if (Math.abs(da) > 0.005) {
        view.currentAlpha += da * LERP_SPEED;
        allSettled = false;
      } else {
        view.currentAlpha = view.targetAlpha;
      }

      // Skip invisible
      if (!view.visible || view.currentAlpha < 0.01) {
        view.gfx.visible = false;
        continue;
      }

      // Skip missing positions
      const sp = positions.get(view.sourceId);
      const tp = positions.get(view.targetId);
      if (!sp || !tp) {
        view.gfx.visible = false;
        continue;
      }

      // Skip zero-distance (prevents NaN from division)
      const dx = tp.x - sp.x;
      const dy = tp.y - sp.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < MIN_DIST) {
        view.gfx.visible = false;
        continue;
      }

      // Draw curved arc
      view.gfx.clear();
      view.gfx.lineStyle(view.lineWidth, view.color, view.currentAlpha);

      const mx = (sp.x + tp.x) / 2;
      const my = (sp.y + tp.y) / 2;
      const curveOffset = dist * 0.15;
      const cx = mx - (dy / dist) * curveOffset;
      const cy = my + (dx / dist) * curveOffset;

      view.gfx.moveTo(sp.x, sp.y);
      view.gfx.quadraticCurveTo(cx, cy, tp.x, tp.y);

      // Arrowhead at target
      drawArrowhead(view.gfx, cx, cy, tp.x, tp.y, view.lineWidth, view.color, view.currentAlpha);

      view.gfx.visible = true;
    }

    this.settled = allSettled;
    return allSettled;
  }

  isSettled(): boolean {
    return this.settled;
  }

  private clear(): void {
    for (const view of this.views) view.gfx.destroy();
    this.views = [];
    this.edgeMap.clear();
    this.removeChildren();
  }

  override destroy(): void {
    this.clear();
    super.destroy();
  }
}

function resolveEdgeStyle(
  kind: CoreFlightEdge["kind"],
  theme?: ResolvedGraphTheme,
): { color: number; lineWidth: number } {
  const s = theme?.stance;
  switch (kind) {
    case "supports":    return { color: s?.supportTint ?? 0x44cf6e, lineWidth: 1.2 };
    case "opposes":     return { color: s?.opposeTint ?? 0xe5534b, lineWidth: 1.6 };
    case "contradicts": return { color: s?.contradictTint ?? 0xe5534b, lineWidth: 2.2 };
    case "questions":   return { color: s?.questionTint ?? 0xd29922, lineWidth: 1.0 };
    case "refines":     return { color: s?.refineTint ?? 0xa882ff, lineWidth: 1.0 };
    default:            return { color: 0x888888, lineWidth: 1.0 };
  }
}

function drawArrowhead(
  gfx: Graphics,
  cx: number, cy: number,
  tx: number, ty: number,
  lineWidth: number,
  color: number,
  alpha: number,
): void {
  const dx = tx - cx;
  const dy = ty - cy;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len < 1) return;

  const ux = dx / len;
  const uy = dy / len;
  const size = lineWidth * 3 + 2;
  const angle = Math.PI / 6;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);

  gfx.lineStyle(lineWidth * 0.8, color, alpha);
  gfx.moveTo(tx, ty);
  gfx.lineTo(tx - size * (ux * cos + uy * sin), ty - size * (uy * cos - ux * sin));
  gfx.moveTo(tx, ty);
  gfx.lineTo(tx - size * (ux * cos - uy * sin), ty - size * (uy * cos + ux * sin));
}
