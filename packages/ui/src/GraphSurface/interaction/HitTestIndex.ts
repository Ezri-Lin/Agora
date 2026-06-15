/**
 * HitTestIndex — scale-aware hit testing using graph coordinates.
 * Hit radius = Math.max(node.radius, BASE_HIT_RADIUS / camera.scale).
 */

import type { CoreNode, ReadonlyVec2 } from "../model/coreTypes.js";
import type { CameraController } from "../renderer/CameraController.js";

const BASE_HIT_RADIUS = 8;

export class HitTestIndex {
  /**
   * Find the closest node at screen position (sx, sy).
   * Positions are in graph space. Returns node id or null.
   */
  hitTest(
    sx: number,
    sy: number,
    nodes: ReadonlyArray<CoreNode>,
    positions: ReadonlyMap<string, ReadonlyVec2>,
    camera: CameraController,
    viewportW: number,
    viewportH: number,
  ): string | null {
    const [gx, gy] = camera.screenToGraph(sx, sy, viewportW, viewportH);
    const scale = camera.current.scale;
    const hitRadius = BASE_HIT_RADIUS / scale;

    let closest: string | null = null;
    let closestDist = Infinity;

    for (const node of nodes) {
      const pos = positions.get(node.id);
      if (!pos) continue;

      const dx = gx - pos.x;
      const dy = gy - pos.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const threshold = Math.max(node.size, hitRadius);

      if (dist < threshold && dist < closestDist) {
        closest = node.id;
        closestDist = dist;
      }
    }

    return closest;
  }
}
