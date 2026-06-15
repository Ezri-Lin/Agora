/**
 * useGraphInteraction — pointer/wheel event handlers for GraphSurface.
 * Window-level listeners registered on pointerDown, removed on pointerUp.
 */

import { useRef, useCallback } from "react";
import type { CoreGraph, ReadonlyVec2 } from "./model/coreTypes.js";
import type { ForceRuntime } from "./layout/ForceRuntime.js";
import type { CameraController } from "./renderer/CameraController.js";
import type { NodeLayer } from "./renderer/NodeLayer.js";
import type { SpriteEdgeLayer } from "./renderer/SpriteEdgeLayer.js";
import type { SelectionController } from "./interaction/SelectionController.js";
import type { HitTestIndex } from "./interaction/HitTestIndex.js";
import type { RenderLoop } from "./renderer/RenderLoop.js";
import type { ResolvedGraphTheme } from "./theme/ThemeBridge.js";

interface DragState {
  startX: number;
  startY: number;
  nodeId: string | null;
  container: HTMLElement;
  cleanup: () => void;
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
}) {
  const dragRef = useRef<DragState | null>(null);

  const handlePointerDown = useCallback((e: React.PointerEvent, container: HTMLElement) => {
    e.preventDefault();
    const rect = container.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    deps.hasPointerRef.current = true;

    const graph = deps.graphRef.current;
    const runtime = deps.runtimeRef.current;
    if (!graph || !runtime) return;

    const positions = runtime.getPositions();
    const nodeId = deps.hitTestRef.current.hitTest(
      sx, sy, graph.nodes, positions, deps.cameraRef.current, rect.width, rect.height,
    );

    if (nodeId) {
      const pos = positions.get(nodeId);
      runtime.setNodeFixed(nodeId, pos ?? { x: 0, y: 0 });
      container.style.cursor = "default";
    } else {
      container.style.cursor = "grabbing";
    }

    // Register window listeners for this drag session
    const onMove = (ev: PointerEvent) => {
      ev.preventDefault();
      const r = container.getBoundingClientRect();
      if (nodeId) {
        const [gx, gy] = deps.cameraRef.current.screenToGraph(
          ev.clientX - r.left, ev.clientY - r.top, r.width, r.height,
        );
        runtime.setNodeFixed(nodeId, { x: gx, y: gy });
      } else {
        const dx = ev.clientX - (dragRef.current?.startX ?? ev.clientX);
        const dy = ev.clientY - (dragRef.current?.startY ?? ev.clientY);
        deps.cameraRef.current.pan(dx, dy, r.width);
        if (dragRef.current) {
          dragRef.current.startX = ev.clientX;
          dragRef.current.startY = ev.clientY;
        }
      }
      deps.renderLoopRef.current?.wake();
    };

    const onUp = (ev: PointerEvent) => {
      if (nodeId && runtime) {
        runtime.releaseNode(nodeId, { clearVelocity: true });
      } else if (!nodeId && deps.onNodeClick && runtime) {
        const g = deps.graphRef.current;
        if (g) {
          const r = container.getBoundingClientRect();
          const hitId = deps.hitTestRef.current.hitTest(
            ev.clientX - r.left, ev.clientY - r.top,
            g.nodes, runtime.getPositions(), deps.cameraRef.current, r.width, r.height,
          );
          if (hitId) deps.onNodeClick(hitId);
        }
      }
      container.style.cursor = "";
      deps.hasPointerRef.current = false;
      dragRef.current = null;
      deps.renderLoopRef.current?.wake();

      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };

    window.addEventListener("pointermove", onMove, { passive: false });
    window.addEventListener("pointerup", onUp);

    dragRef.current = {
      startX: e.clientX, startY: e.clientY, nodeId, container,
      cleanup: () => {
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
      },
    };
  }, [deps]);

  const handlePointerMove = useCallback((e: React.PointerEvent, container: HTMLElement) => {
    if (dragRef.current) return;

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
  }, [deps]);

  const handlePointerUp = useCallback(() => {
    // Handled by window listener registered in handlePointerDown
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent, container: HTMLElement) => {
    e.preventDefault();
    const rect = container.getBoundingClientRect();
    const factor = e.deltaY > 0 ? 1.1 : 0.9;
    deps.cameraRef.current.zoomAt(
      e.clientX - rect.left, e.clientY - rect.top,
      factor, rect.width, rect.height,
    );
    deps.renderLoopRef.current?.wake();
  }, [deps]);

  const handlePointerLeave = useCallback((e: React.PointerEvent, container: HTMLElement) => {
    deps.hasPointerRef.current = false;
    deps.selectionRef.current.setHovered(null);
    container.style.cursor = "";
    const graph = deps.graphRef.current;
    if (graph) {
      const theme = deps.themeRef.current;
      deps.nodeLayerRef.current?.updateVisuals(graph.nodes, null, null, theme);
      deps.edgeLayerRef.current?.updateVisibility(null, null, theme);
    }
    if (deps.tooltipRef.current) deps.tooltipRef.current.style.opacity = "0";
    deps.renderLoopRef.current?.wake();
  }, [deps]);

  return { handlePointerDown, handlePointerMove, handlePointerUp, handleWheel, handlePointerLeave };
}
