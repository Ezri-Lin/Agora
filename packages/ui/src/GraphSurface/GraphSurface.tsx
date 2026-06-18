/**
 * GraphSurface — thin React shell wrapping the Pixi graph renderer.
 * Uses PIXI v7 with hanger-based camera (Obsidian approach).
 * React owns: container ref, theme, props → data flow.
 * Pixi owns: render loop, camera, layers, hit testing.
 *
 * Event handlers extracted to useGraphInteraction.ts.
 */

import React, { useEffect, useRef, useCallback, useState } from "react";
import type { CoreGraph, CoreGraphViewModel } from "./model/coreTypes.js";
import type { ResolvedGraphTheme } from "./theme/ThemeBridge.js";
import { resolveGraphTheme } from "./theme/ThemeBridge.js";
import { useTheme } from "../theme/ThemeContext.js";
import type { ForceRuntime } from "./layout/ForceRuntime.js";
import { D3ForceRuntime } from "./layout/D3ForceRuntime.js";
import { OBSIDIAN_PROFILE } from "./layout/layoutProfile.js";
import { createGraphStage } from "./renderer/GraphStage.js";
import type { GraphStage } from "./renderer/GraphStage.js";
import { CameraController } from "./renderer/CameraController.js";
import { RenderLoop } from "./renderer/RenderLoop.js";
import { NodeLayer } from "./renderer/NodeLayer.js";
import { SpriteEdgeLayer } from "./renderer/SpriteEdgeLayer.js";
import { LabelLayer } from "./renderer/LabelLayer.js";
import { FlightOverlayLayer } from "./renderer/FlightOverlayLayer.js";
import { HitTestIndex } from "./interaction/HitTestIndex.js";
import { SelectionController } from "./interaction/SelectionController.js";
import { useGraphInteraction } from "./useGraphInteraction.js";
import type { LayoutProfile } from "./layout/layoutTypes.js";

export interface GraphSurfaceProps {
  viewModel: CoreGraphViewModel | null;
  layoutProfile?: LayoutProfile;
  onNodeClick?: (nodeId: string) => void;
  className?: string;
  style?: React.CSSProperties;
}

export const GraphSurface: React.FC<GraphSurfaceProps> = ({
  viewModel,
  layoutProfile = OBSIDIAN_PROFILE,
  onNodeClick,
  className,
  style,
}) => {
  const { colors } = useTheme();
  const containerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  // Imperative refs
  const stageRef = useRef<GraphStage | null>(null);
  const runtimeRef = useRef<ForceRuntime | null>(null);
  const cameraRef = useRef<CameraController>(new CameraController());
  const nodeLayerRef = useRef<NodeLayer | null>(null);
  const edgeLayerRef = useRef<SpriteEdgeLayer | null>(null);
  const labelLayerRef = useRef<LabelLayer | null>(null);
  const flightLayerRef = useRef<FlightOverlayLayer | null>(null);
  const hitTestRef = useRef<HitTestIndex>(new HitTestIndex());
  const selectionRef = useRef<SelectionController>(
    new SelectionController(() => renderLoopRef.current?.wake()),
  );
  const renderLoopRef = useRef<RenderLoop | null>(null);
  const graphRef = useRef<CoreGraph | null>(null);
  const themeRef = useRef<ResolvedGraphTheme>(resolveGraphTheme(colors));
  const hasPointerRef = useRef(false);
  const mountedRef = useRef(true);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const needsFitRef = useRef(false);
  const fitTickRef = useRef(0);
  const hasFittedRef = useRef(false);
  const layersReadyRef = useRef(false);
  const [isVisible, setIsVisible] = useState(true);

  // IntersectionObserver — pause render loop when off-screen
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => setIsVisible(entry.isIntersecting),
      { threshold: 0 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Pause/resume render loop based on visibility
  useEffect(() => {
    if (!isVisible) {
      renderLoopRef.current?.stop();
    } else {
      renderLoopRef.current?.wake();
    }
  }, [isVisible]);

  const flightVisCacheRef = useRef<{
    highlightedSet: Set<string> | null;
    showAll: boolean;
  }>({ highlightedSet: null, showAll: false });

  // Wire up event handlers (extracted hook)
  const interaction = useGraphInteraction({
    cameraRef, runtimeRef, graphRef, nodeLayerRef, edgeLayerRef,
    hitTestRef, selectionRef, renderLoopRef, themeRef, tooltipRef,
    hasPointerRef, onNodeClick, containerRef,
  });

  // ── Render function ──
  const render = useCallback(() => {
    const nodeLayer = nodeLayerRef.current;
    const edgeLayer = edgeLayerRef.current;
    const labelLayer = labelLayerRef.current;
    const stage = stageRef.current;
    const camera = cameraRef.current;
    const runtime = runtimeRef.current;
    const graph = graphRef.current;
    const theme = themeRef.current;

    if (!stage || !runtime || !graph || !nodeLayer || !edgeLayer || !labelLayer) return;

    // DEBUG: confirm render runs
    if (!(window as any).__gr) { (window as any).__gr = 0; console.log("[GS] render running, ticker:", stage.app.ticker.started); }
    (window as any).__gr++;

    camera.tick();

    const vw = stage.app.screen.width;
    const vh = stage.app.screen.height;
    const cam = camera.current;
    const positions = runtime.getPositions();

    // Deferred fitBounds — wait for d3-force to spread nodes
    if (needsFitRef.current && !hasFittedRef.current) {
      fitTickRef.current++;
      if (fitTickRef.current >= 30) {
        needsFitRef.current = false;
        hasFittedRef.current = true;
        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        for (const pos of positions.values()) {
          if (pos.x < minX) minX = pos.x;
          if (pos.x > maxX) maxX = pos.x;
          if (pos.y < minY) minY = pos.y;
          if (pos.y > maxY) maxY = pos.y;
        }
        if (minX < maxX) {
          camera.fitBounds(minX, minY, maxX, maxY, vw, vh);
        }
      }
    }

    // Apply camera to hanger (Obsidian-style: direct container transform)
    const hanger = stage.hanger;
    hanger.x = -cam.x * cam.scale + vw / 2;
    hanger.y = -cam.y * cam.scale + vh / 2;
    hanger.scale.x = cam.scale;
    hanger.scale.y = cam.scale;

    // Update positions in graph coords (hanger handles camera transform)
    nodeLayer.updatePositions(graph.nodes, positions);
    edgeLayer.updatePositions(positions);

    const sel = selectionRef.current;
    labelLayer.update(
      graph.nodes, positions, camera,
      sel.getHighlightedSet(graph), sel.hoveredId, sel.selectedId,
      theme, vw, vh,
    );

    nodeLayer.animate();
    edgeLayer.animate();
    labelLayer.animate();

    // Flight overlay — render() combines alpha lerp + draw
    const flightLayer = flightLayerRef.current;
    if (flightLayer) {
      const highlighted = sel.getHighlightedSet(graph);
      const cache = flightVisCacheRef.current;
      const highlightedChanged =
        highlighted !== cache.highlightedSet &&
        (!highlighted || !cache.highlightedSet ||
          highlighted.size !== cache.highlightedSet.size ||
          ![...highlighted].every((id) => cache.highlightedSet!.has(id)));
      if (highlightedChanged) {
        cache.highlightedSet = highlighted;
        flightLayer.updateVisibility(highlighted, theme);
      }
      flightLayer.renderArcs(positions);
    }

    sel.markSettled();
  }, []);

  // ── Pixi init + cleanup ──
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    mountedRef.current = true;

    // v7: synchronous init — wait for container to have size
    const initStage = () => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      if (w === 0 || h === 0) {
        requestAnimationFrame(initStage);
        return;
      }

      const stage = createGraphStage(container, { backgroundAlpha: 0 });
      if (!mountedRef.current) { stage.destroy(); return; }

      stageRef.current = stage;

      const nodeLayer = new NodeLayer();
      const edgeLayer = new SpriteEdgeLayer();
      const labelLayer = new LabelLayer();
      const flightLayer = new FlightOverlayLayer();

      stage.hanger.addChild(nodeLayer);
      stage.hanger.addChild(edgeLayer);
      stage.hanger.addChild(labelLayer);
      stage.hanger.addChild(flightLayer);

      nodeLayerRef.current = nodeLayer;
      edgeLayerRef.current = edgeLayer;
      labelLayerRef.current = labelLayer;
      flightLayerRef.current = flightLayer;
      layersReadyRef.current = true;

      // Build if graph data already arrived
      const graph = graphRef.current;
      if (graph) {
        const theme = themeRef.current;
        nodeLayer.build(graph.nodes, theme);
        edgeLayer.build(graph.edges, theme);
        const vm = viewModel;
        if (vm) flightLayer.setEdges(vm.flightEdges, themeRef.current);
      }

      const renderLoop = new RenderLoop(stage.app, render);
      renderLoop.addSource(cameraRef.current);
      renderLoop.addSource({ isSettled: () => runtimeRef.current?.isSettled() ?? true });
      renderLoop.addSource(nodeLayer);
      renderLoop.addSource(edgeLayer);
      renderLoop.addSource(labelLayer);
      renderLoop.addSource(flightLayer);
      renderLoop.addSource(selectionRef.current);
      renderLoop.addSource({ isSettled: () => !hasPointerRef.current });
      renderLoopRef.current = renderLoop;
      renderLoop.start();

      // ResizeObserver — keep Pixi canvas in sync with container
      const ro = new ResizeObserver((entries) => {
        const entry = entries[0];
        if (!entry) return;
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          stage.app.renderer.resize(width, height);
          renderLoopRef.current?.wake();
        }
      });
      ro.observe(container);
      resizeObserverRef.current = ro;
    };

    initStage();

    return () => {
      mountedRef.current = false;
      resizeObserverRef.current?.disconnect();
      resizeObserverRef.current = null;
      layersReadyRef.current = false;
      renderLoopRef.current?.destroy();
      renderLoopRef.current = null;
      runtimeRef.current?.destroy();
      runtimeRef.current = null;
      nodeLayerRef.current?.destroy();
      nodeLayerRef.current = null;
      edgeLayerRef.current?.destroy();
      edgeLayerRef.current = null;
      labelLayerRef.current?.destroy();
      labelLayerRef.current = null;
      flightLayerRef.current?.destroy();
      flightLayerRef.current = null;
      stageRef.current?.destroy();
      stageRef.current = null;
    };
  }, [render]);

  // ── Data changes ──
  useEffect(() => {
    if (!viewModel) return;
    const graph = viewModel.graph;
    graphRef.current = graph;
    const theme = themeRef.current;

    let runtime = runtimeRef.current;
    if (!runtime) {
      runtime = new D3ForceRuntime(layoutProfile);
      runtimeRef.current = runtime;
      runtime.onTick(() => renderLoopRef.current?.wake());
    }

    runtime.setGraph(graph);
    runtime.start();

    // Only build layers if they're ready
    if (layersReadyRef.current) {
      const nodeLayer = nodeLayerRef.current;
      const edgeLayer = edgeLayerRef.current;
      if (nodeLayer && edgeLayer) {
        nodeLayer.build(graph.nodes, theme);
        edgeLayer.build(graph.edges, theme);
        flightLayerRef.current?.setEdges(viewModel.flightEdges, themeRef.current);
      }
    }

    // Only set camera to origin on first load
    if (!hasFittedRef.current && !needsFitRef.current) {
      cameraRef.current.setTarget(0, 0, 1);
      cameraRef.current.snap();
      needsFitRef.current = true;
    }

    renderLoopRef.current?.wake();
  }, [viewModel, layoutProfile]);

  // ── Theme changes ──
  useEffect(() => {
    themeRef.current = resolveGraphTheme(colors);
    const graph = graphRef.current;
    if (!graph || !layersReadyRef.current) return;

    const nodeLayer = nodeLayerRef.current;
    const edgeLayer = edgeLayerRef.current;
    if (nodeLayer && edgeLayer) {
      nodeLayer.build(graph.nodes, themeRef.current);
      edgeLayer.build(graph.edges, themeRef.current);
    }
    flightLayerRef.current?.updateTheme(themeRef.current);
    renderLoopRef.current?.wake();
  }, [colors]);

  // Events are all native addEventListener in useGraphInteraction

  return (
    <div
      ref={containerRef}
      className={className}
      style={{ position: "relative", width: "100%", height: "100%", touchAction: "none", ...style }}
    >
      <div
        ref={tooltipRef}
        style={{
          position: "absolute",
          pointerEvents: "none",
          opacity: 0,
          background: colors.surface,
          border: `1px solid ${colors.border}`,
          borderRadius: 4,
          padding: "4px 8px",
          fontSize: 11,
          fontWeight: 500,
          color: colors.text,
          whiteSpace: "nowrap",
          zIndex: 20,
          transition: "opacity 0.12s",
          boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
        }}
      />
    </div>
  );
};
