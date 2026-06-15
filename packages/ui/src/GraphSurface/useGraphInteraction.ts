/**
 * useGraphInteraction — mouse/wheel event handlers for GraphSurface.
 * 300ms long-press activates drag mode. Window-level mousemove/mouseup for reliable drag.
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

const LONG_PRESS_MS = 300;

interface DragState {
  lastX: number;
  lastY: number;
  nodeId: string | null;
  container: HTMLElement;
  active: boolean;
  timer: ReturnType<typeof setTimeout>;
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

  const handleMouseDown = useCallback((e: React.MouseEvent, container: HTMLElement) => {
    // Only handle left button
    if (e.button !== 0) return;

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

    // If hovering a node, start drag immediately (no long-press needed)
    if (nodeId) {
      const pos = positions.get(nodeId);
      runtime.setNodeFixed(nodeId, pos ?? { x: 0, y: 0 });
      container.style.cursor = "default";
      deps.hasPointerRef.current = true;

      const onMove = (ev: MouseEvent) => {
        const r = container.getBoundingClientRect();
        const [gx, gy] = deps.cameraRef.current.screenToGraph(
          ev.clientX - r.left, ev.clientY - r.top, r.width, r.height,
        );
        runtime.setNodeFixed(nodeId, { x: gx, y: gy });
        deps.renderLoopRef.current?.wake();
      };

      const onUp = () => {
        runtime.releaseNode(nodeId, { clearVelocity: true });
        container.style.cursor = "";
        deps.hasPointerRef.current = false;
        dragRef.current = null;
        deps.renderLoopRef.current?.wake();
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
      };

      dragRef.current = {
        lastX: e.clientX, lastY: e.clientY, nodeId, container,
        active: true, timer: setTimeout(() => {}, 0),
      };
      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
      return;
    }

    // Empty area: wait for long-press before activating drag
    deps.hasPointerRef.current = true;
    container.style.cursor = "wait";

    const timer = setTimeout(() => {
      // Long-press reached — activate drag
      if (!dragRef.current) return;
      dragRef.current.active = true;
      container.style.cursor = "grabbing";

      const onMove = (ev: MouseEvent) => {
        if (!dragRef.current?.active) return;
        const r = container.getBoundingClientRect();
        const dx = ev.clientX - dragRef.current.lastX;
        const dy = ev.clientY - dragRef.current.lastY;
        deps.cameraRef.current.pan(dx, dy, r.width);
        dragRef.current.lastX = ev.clientX;
        dragRef.current.lastY = ev.clientY;
        deps.renderLoopRef.current?.wake();
      };

      const onUp = () => {
        container.style.cursor = "";
        deps.hasPointerRef.current = false;
        dragRef.current = null;
        deps.renderLoopRef.current?.wake();
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
      };

      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
    }, LONG_PRESS_MS);

    dragRef.current = {
      lastX: e.clientX, lastY: e.clientY, nodeId: null, container,
      active: false, timer,
    };
  }, [deps]);

  const handleMouseMove = useCallback((e: React.MouseEvent, container: HTMLElement) => {
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

  const handleMouseUp = useCallback((e: React.MouseEvent, container: HTMLElement) => {
    const drag = dragRef.current;
    if (!drag) return;

    clearTimeout(drag.timer);

    if (!drag.active) {
      // Long-press not reached — treat as click
      if (deps.onNodeClick) {
        const graph = deps.graphRef.current;
        const runtime = deps.runtimeRef.current;
        if (graph && runtime) {
          const rect = container.getBoundingClientRect();
          const hitId = deps.hitTestRef.current.hitTest(
            e.clientX - rect.left, e.clientY - rect.top,
            graph.nodes, runtime.getPositions(), deps.cameraRef.current, rect.width, rect.height,
          );
          if (hitId) deps.onNodeClick(hitId);
        }
      }
    }

    container.style.cursor = "";
    deps.hasPointerRef.current = false;
    dragRef.current = null;
  }, [deps]);

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

  const handleMouseLeave = useCallback(() => {
    const drag = dragRef.current;
    if (drag) {
      clearTimeout(drag.timer);
      dragRef.current = null;
    }
    deps.hasPointerRef.current = false;
    deps.selectionRef.current.setHovered(null);
    const graph = deps.graphRef.current;
    if (graph) {
      const theme = deps.themeRef.current;
      deps.nodeLayerRef.current?.updateVisuals(graph.nodes, null, null, theme);
      deps.edgeLayerRef.current?.updateVisibility(null, null, theme);
    }
    if (deps.tooltipRef.current) deps.tooltipRef.current.style.opacity = "0";
    deps.renderLoopRef.current?.wake();
  }, [deps]);

  return { handleMouseDown, handleMouseMove, handleMouseUp, handleWheel, handleMouseLeave };
}
