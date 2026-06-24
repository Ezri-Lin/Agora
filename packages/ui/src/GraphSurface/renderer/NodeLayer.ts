/**
 * NodeLayer — renders graph nodes as PIXI.Graphics circles (v7 API).
 * Positions set via gfx.position.set() — works in v7 (no RenderGroup cache).
 */

import { Container, Graphics } from "pixi.js";
import type { CoreNode, ReadonlyVec2 } from "../model/coreTypes.js";
import type { ResolvedGraphTheme } from "../theme/ThemeBridge.js";

const HOVER_SCALE = 1.7;
const GLOW_ALPHA = 0.20;
const GLOW_EXTRA_RADIUS = 8;
const NEIGHBOR_SCALE = 1.08;
const LERP_SPEED = 0.18;

interface NodeView {
  id: string;
  gfx: Graphics;
  glow: Graphics;
  currentAlpha: number;
  targetAlpha: number;
  currentScale: number;
  targetScale: number;
  baseColor: number;
}

export class NodeLayer extends Container {
  private viewMap = new Map<string, NodeView>();
  private settled = true;

  /** Build all node graphics from CoreGraph. */
  build(nodes: ReadonlyArray<CoreNode>, theme: ResolvedGraphTheme): void {
    this.clear();

    for (const node of nodes) {
      const color = node.color.startsWith("#")
        ? parseInt(node.color.replace("#", ""), 16)
        : theme.node.defaultTint;

      const glow = new Graphics();
      glow.beginFill(0xffffff, GLOW_ALPHA);
      glow.drawCircle(0, 0, node.size + GLOW_EXTRA_RADIUS);
      glow.endFill();
      glow.visible = false;
      glow.eventMode = "none";
      this.addChild(glow);

      const gfx = new Graphics();
      gfx.beginFill(0xffffff);
      gfx.drawCircle(0, 0, node.size);
      gfx.endFill();
      gfx.tint = color;
      gfx.alpha = 1;
      gfx.eventMode = "none";
      this.addChild(gfx);

      this.viewMap.set(node.id, {
        id: node.id,
        gfx,
        glow,
        currentAlpha: 1,
        targetAlpha: 1,
        currentScale: 1,
        targetScale: 1,
        baseColor: color,
      });
    }
  }

  /** Update node positions (graph coords — hanger applies camera transform). */
  updatePositions(
    nodes: ReadonlyArray<CoreNode>,
    positions: ReadonlyMap<string, ReadonlyVec2>,
  ): void {
    for (const [id, view] of this.viewMap) {
      const pos = positions.get(id);
      if (!pos) {
        view.gfx.visible = false;
        view.glow.visible = false;
        continue;
      }
      view.gfx.visible = true;
      view.gfx.position.set(pos.x, pos.y);
      view.glow.position.set(pos.x, pos.y);
    }
  }

  /** Update visual state (hover glow, muted alpha). */
  updateVisuals(
    nodes: ReadonlyArray<CoreNode>,
    highlightedSet: Set<string> | null,
    hoveredId: string | null,
    theme: ResolvedGraphTheme,
  ): void {
    for (const node of nodes) {
      const view = this.viewMap.get(node.id);
      if (!view) continue;

      const isHovered = node.id === hoveredId;
      const isHighlighted = highlightedSet ? highlightedSet.has(node.id) : true;

      if (isHovered) {
        view.targetScale = HOVER_SCALE;
        view.targetAlpha = 1;
        view.glow.visible = true;
        view.gfx.tint = theme.node.hoverTint;
      } else {
        view.glow.visible = false;
        view.gfx.tint = view.baseColor;

        if (highlightedSet && !isHighlighted) {
          view.targetScale = 1;
          view.targetAlpha = theme.node.mutedAlpha;
        } else if (highlightedSet && isHighlighted) {
          // Neighbor node
          view.targetScale = NEIGHBOR_SCALE;
          view.targetAlpha = 0.95;
        } else {
          view.targetScale = 1;
          view.targetAlpha = 1;
        }
      }
    }
    this.settled = false;
  }

  /** Animate alpha/scale toward targets. Returns true if settled. */
  animate(): boolean {
    let allSettled = true;

    for (const view of this.viewMap.values()) {
      const da = view.targetAlpha - view.currentAlpha;
      if (Math.abs(da) > 0.005) {
        view.currentAlpha += da * LERP_SPEED;
        view.gfx.alpha = view.currentAlpha;
        allSettled = false;
      } else {
        view.currentAlpha = view.targetAlpha;
        view.gfx.alpha = view.targetAlpha;
      }

      const ds = view.targetScale - view.currentScale;
      if (Math.abs(ds) > 0.005) {
        view.currentScale += ds * LERP_SPEED;
        view.gfx.scale.set(view.currentScale);
        view.glow.scale.set(view.currentScale);
        allSettled = false;
      } else {
        view.currentScale = view.targetScale;
        view.gfx.scale.set(view.targetScale);
        view.glow.scale.set(view.targetScale);
      }
    }

    this.settled = allSettled;
    return allSettled;
  }

  isSettled(): boolean {
    return this.settled;
  }

  private clear(): void {
    for (const view of this.viewMap.values()) {
      view.gfx.destroy();
      view.glow.destroy();
    }
    this.viewMap.clear();
    this.removeChildren();
  }

  override destroy(): void {
    this.clear();
    super.destroy();
  }
}
