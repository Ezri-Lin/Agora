/**
 * useGraphInteraction — Obsidian-style direct hanger pan/drag.
 * All pointer events via native addEventListener on container.
 */

import { useRef, useCallback, useEffect } from "react";
import type { CoreGraph } from "./model/coreTypes.js";
import type { ForceRuntime } from "./layout/ForceRuntime.js";
import type { NodeLayer } from "./renderer/NodeLayer.js";
import type { SpriteEdgeLayer } from "./renderer/SpriteEdgeLayer.js";
import type { SelectionController } from "./interaction/SelectionController.js";
import type { HitTestIndex } from "./interaction/HitTestIndex.js";
import type { RenderLoop } from "./renderer/RenderLoop.js";
import type { ResolvedGraphTheme } from "./theme/ThemeBridge.js";
import type { CameraController } from "./renderer/CameraController.js";

interface DragState {
  lastX: number;
  lastY: number;
  nodeId: string | null;
}

export function useGraphInteraction(deps: {
  cameraRef: React.MutableRefObject<CameraController>;
  runtimeRef: React.MutableRefObject<ForceRuntime | null>;
  graphRef: React.MutableRefObject<CoreGraph | null>;
  nodeLayerRef: React.MutableRefObject<NodeLayer | null>;
  edgeLayerRef: React.MutableRefObject<SpriteEdgeLayer | null>;
  hitTestRef: React.MutableRefObject<HitTestIndex>;
  selectionRef: React.MutableRefObject<SelectionController>;
  renderLoopRef: React.MutableRefObject<RenderLoop | null>;
  themeRef: React.MutableRefObject<ResolvedGraphTheme>;
  tooltipRef: React.MutableRefObject<HTMLDivElement | null>;
  hasPointerRef: React.MutableRefObject<boolean>;
  onNodeClick?: (nodeId: string) => void;
  containerRef: React.MutableRefObject<HTMLDivElement | null>;
}) {
  const dragRef = useRef<DragState | null>(null);

  // All pointer events via native addEventListener on container
  useEffect(() => {
    const container = deps.containerRef.current;
    if (!container) return;

    const onPointerDown = (e: PointerEvent) => {
      if (e.button !== 0) return;

      const rect = container.getBoundingClientRect();
      const sx = e.clientX - rect.left;
      const sy = e.clientY - rect.top;
      deps.hasPointerRef.current = true;

      const graph = deps.graphRef.current;
      const runtime = deps.runtimeRef.current;
      if (!graph || !runtime) return;

      const positions = runtime.getPositions();
      const camera = deps.cameraRef.current;
      const nodeId = deps.hitTestRef.current.hitTest(
        sx, sy, graph.nodes, positions, camera, rect.width, rect.height,
      );

      if (nodeId) {
        const pos = positions.get(nodeId);
        runtime.setNodeFixed(nodeId, pos ?? { x: 0, y: 0 });
        container.style.cursor = "default";
      } else {
        container.style.cursor = "grabbing";
      }

      dragRef.current = { lastX: e.clientX, lastY: e.clientY, nodeId };
    };

    const onPointerMove = (e: PointerEvent) => {
      const drag = dragRef.current;
      if (!drag) {
        // Hover handling when not dragging
        const rect = container.getBoundingClientRect();
        const sx = e.clientX - rect.left;
        const sy = e.clientY - rect.top;
        const graph = deps.graphRef.current;
        const runtime = deps.runtimeRef.current;
        if (!graph || !runtime) return;

        const positions = runtime.getPositions();
        const nodeId = deps.hitTestRef.current.hitTest(
          sx, sy, graph.nodes, positions, deps.cameraRef.current, rect.width, rect.height,
        );
        deps.selectionRef.current.setHovered(nodeId);
        container.style.cursor = nodeId ? "pointer" : "";

        const theme = deps.themeRef.current;
        const highlighted = deps.selectionRef.current.getHighlightedSet(graph);
        deps.nodeLayerRef.current?.updateVisuals(graph.nodes, highlighted, nodeId, theme);
        deps.edgeLayerRef.current?.updateVisibility(highlighted, nodeId, theme);

        const tooltip = deps.tooltipRef.current;
        if (tooltip) {
          if (nodeId) {
            const node = graph.nodes.find((n) => n.id === nodeId);
            tooltip.textContent = node?.label ?? "";
            tooltip.style.opacity = "1";
            tooltip.style.left = `${sx}px`;
            tooltip.style.top = `${sy - 32}px`;
          } else {
            tooltip.style.opacity = "0";
          }
        }
        deps.renderLoopRef.current?.wake();
        return;
      }

      // Drag handling
      const dx = e.clientX - drag.lastX;
      const dy = e.clientY - drag.lastY;
      drag.lastX = e.clientX;
      drag.lastY = e.clientY;

      if (drag.nodeId) {
        const rect = container.getBoundingClientRect();
        const [gx, gy] = deps.cameraRef.current.screenToGraph(
          e.clientX - rect.left, e.clientY - rect.top, rect.width, rect.height,
        );
        deps.runtimeRef.current?.setNodeFixed(drag.nodeId, { x: gx, y: gy });
      } else {
        const rect = container.getBoundingClientRect();
        deps.cameraRef.current.pan(dx, dy);
      }
      deps.renderLoopRef.current?.wake();
    };

    const onPointerUp = (e: PointerEvent) => {
      const drag = dragRef.current;
      if (!drag) return;

      if (drag.nodeId) {
        deps.runtimeRef.current?.releaseNode(drag.nodeId, { clearVelocity: true });
      }
      container.style.cursor = "";
      deps.hasPointerRef.current = false;
      dragRef.current = null;
      deps.renderLoopRef.current?.wake();
    };

    const onPointerLeave = () => {
      deps.hasPointerRef.current = false;
      deps.selectionRef.current.setHovered(null);
      if (deps.tooltipRef.current) deps.tooltipRef.current.style.opacity = "0";
      const graph = deps.graphRef.current;
      if (graph) {
        const theme = deps.themeRef.current;
        deps.nodeLayerRef.current?.updateVisuals(graph.nodes, null, null, theme);
        deps.edgeLayerRef.current?.updateVisibility(null, null, theme);
      }
      deps.renderLoopRef.current?.wake();
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = container.getBoundingClientRect();
      const factor = e.deltaY > 0 ? 1.1 : 0.9;
      deps.cameraRef.current.zoomAt(
        e.clientX - rect.left, e.clientY - rect.top,
        factor, rect.width, rect.height,
      );
      deps.renderLoopRef.current?.wake();
    };

    container.addEventListener("pointerdown", onPointerDown);
    container.addEventListener("pointermove", onPointerMove);
    container.addEventListener("pointerup", onPointerUp);
    container.addEventListener("pointerleave", onPointerLeave);
    container.addEventListener("wheel", onWheel, { passive: false });

    return () => {
      container.removeEventListener("pointerdown", onPointerDown);
      container.removeEventListener("pointermove", onPointerMove);
      container.removeEventListener("pointerup", onPointerUp);
      container.removeEventListener("pointerleave", onPointerLeave);
      container.removeEventListener("wheel", onWheel);
    };
  }, [deps]);

  // No React event handlers needed — all native
  return {};
}
