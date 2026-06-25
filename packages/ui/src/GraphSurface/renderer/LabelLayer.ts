/**
 * LabelLayer — PIXI.Text object pool with alpha lerp, screen culling, and budget.
 * Labels are inside hanger (graph coords) with inverse scale for screen-readable text.
 */

import { Container, Text, TextStyle } from "pixi.js";
import type { CoreNode, ReadonlyVec2 } from "../model/coreTypes.js";
import type { CameraController } from "./CameraController.js";
import type { ResolvedGraphTheme } from "../theme/ThemeBridge.js";
import { getLabelVisibility, getLabelPriority } from "./LabelVisibilityPolicy.js";
import type { LabelVisibilityInput } from "./LabelVisibilityPolicy.js";

const LERP_SPEED = 0.18;
const NORMAL_BUDGET = 120;
const LABEL_OFFSET = 6;

interface LabelView {
  id: string;
  text: Text;
  currentAlpha: number;
  targetAlpha: number;
}

export class LabelLayer extends Container {
  private labelMap = new Map<string, LabelView>();
  private settled = true;

  /** Update labels — positions in graph coords, hanger handles camera. */
  update(
    nodes: ReadonlyArray<CoreNode>,
    positions: ReadonlyMap<string, ReadonlyVec2>,
    camera: CameraController,
    highlightedSet: Set<string> | null,
    hoveredId: string | null,
    selectedId: string | null,
    theme: ResolvedGraphTheme,
    viewportW: number,
    viewportH: number,
  ): void {
    const scale = camera.current.scale;
    const needsLabel = new Set<string>();
    const priorityList: Array<{ id: string; priority: number; input: LabelVisibilityInput }> = [];

    for (const node of nodes) {
      const pos = positions.get(node.id);
      if (!pos) continue;

      // Screen culling: convert graph pos to screen for off-screen check
      const [sx, sy] = camera.graphToScreen(pos.x, pos.y, viewportW, viewportH);
      if (sx < -100 || sx > viewportW + 100 || sy < -100 || sy > viewportH + 100) continue;

      const input: LabelVisibilityInput = {
        cameraScale: scale,
        nodeWeight: node.weight ?? 0,
        isHovered: node.id === hoveredId,
        isSelected: node.id === selectedId,
        isNeighbor: highlightedSet ? highlightedSet.has(node.id) : false,
        isWorkspaceRoot: node.kind === "workspace" || node.kind === "topic",
      };

      const vis = getLabelVisibility(input);
      if (!vis.visible) continue;

      const isForced = input.isHovered || input.isSelected || input.isNeighbor;
      if (!isForced) {
        priorityList.push({ id: node.id, priority: getLabelPriority(input), input });
      }

      needsLabel.add(node.id);

      // Get or create label view (v7 Text API)
      let view = this.labelMap.get(node.id);
      if (!view) {
        const style = new TextStyle({
          fontFamily: "system-ui, -apple-system, sans-serif",
          fontSize: vis.fontSize,
          fontWeight: "400",
          fill: theme.label.tint,
        });
        const text = new Text(node.label, style);
        text.anchor.set(0.5, 1);
        text.eventMode = "none";
        this.addChild(text);
        view = { id: node.id, text, currentAlpha: 0, targetAlpha: 0 };
        this.labelMap.set(node.id, view);
      }

      view.text.text = node.label;
      // Position in graph coords — hanger applies camera transform
      view.text.position.set(pos.x, pos.y - (node.size + LABEL_OFFSET));
      // Inverse scale: label stays screen-readable as hanger zooms
      view.text.scale.set(1 / scale);
      view.targetAlpha = vis.targetAlpha * theme.label.alpha;
    }

    // Apply budget to non-forced labels
    priorityList.sort((a, b) => b.priority - a.priority);
    const budgetExceeded = priorityList.length > NORMAL_BUDGET;
    if (budgetExceeded) {
      for (let i = NORMAL_BUDGET; i < priorityList.length; i++) {
        needsLabel.delete(priorityList[i].id);
      }
    }

    // Hide labels not in needsLabel
    for (const [id, view] of this.labelMap) {
      if (!needsLabel.has(id)) {
        view.targetAlpha = 0;
      }
    }

    this.settled = false;
  }

  /** Animate label alpha toward targets. Returns true if settled. */
  animate(): boolean {
    let allSettled = true;

    for (const [id, view] of this.labelMap) {
      const da = view.targetAlpha - view.currentAlpha;
      if (Math.abs(da) > 0.005) {
        view.currentAlpha += da * LERP_SPEED;
        view.text.alpha = view.currentAlpha;
        view.text.visible = view.currentAlpha > 0.01;
        allSettled = false;
      } else {
        view.currentAlpha = view.targetAlpha;
        view.text.alpha = view.targetAlpha;
        view.text.visible = view.targetAlpha > 0.01;
      }
    }

    // Clean up invisible labels
    for (const [id, view] of this.labelMap) {
      if (!view.text.visible && view.targetAlpha <= 0) {
        view.text.destroy();
        this.labelMap.delete(id);
      }
    }

    this.settled = allSettled;
    return allSettled;
  }

  isSettled(): boolean {
    return this.settled;
  }

  override destroy(): void {
    for (const view of this.labelMap.values()) {
      view.text.destroy();
    }
    this.labelMap.clear();
    this.removeChildren();
    super.destroy();
  }
}
