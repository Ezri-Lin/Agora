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
import type { NodeMeta } from "./renderer/SpriteEdgeLayer.js";
import { computeGraphFitBounds } from "./model/fitBounds.js";
import { computeGraphFitPadding } from "./renderer/graphFitPadding.js";
import { computeLayoutMetrics } from "./model/layoutMetrics.js";

/** Compute docDocDegree and node metadata for hub-spoke edge classification. */
function computeNodeMeta(graph: CoreGraph): Map<string, NodeMeta> {
  const nodeKind = new Map<string, string>();
  for (const node of graph.nodes) nodeKind.set(node.id, node.kind);

  const docDocDegree = new Map<string, number>();
  for (const node of graph.nodes) {
    if (node.kind === "document") docDocDegree.set(node.id, 0);
  }
  for (const edge of graph.edges) {
    const sk = nodeKind.get(edge.source) ?? "";
    const tk = nodeKind.get(edge.target) ?? "";
    if (sk === "document" && tk === "document") {
      docDocDegree.set(edge.source, (docDocDegree.get(edge.source) ?? 0) + 1);
      docDocDegree.set(edge.target, (docDocDegree.get(edge.target) ?? 0) + 1);
    }
  }

  const meta = new Map<string, NodeMeta>();
  for (const node of graph.nodes) {
    meta.set(node.id, {
      kind: node.kind,
      size: node.size,
      docDocDegree: docDocDegree.get(node.id) ?? 0,
    });
  }
  return meta;
}

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
  const layoutMetricsTickRef = useRef(0);
  const hasFittedRef = useRef(false);
  const layersReadyRef = useRef(false);
  const [isVisible, setIsVisible] = useState(true);

  // IntersectionObserver — pause render loop when off-screen
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      setIsVisible(true);
      return;
    }
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

    camera.tick();

    const vw = stage.app.screen.width;
    const vh = stage.app.screen.height;
    const cam = camera.current;

    // Expose camera zoom for audit panel
    (window as any).__cameraZoom = cam.scale;
    const positions = runtime.getPositions();

    if (process.env.NODE_ENV === "development") {
      layoutMetricsTickRef.current++;
      if (layoutMetricsTickRef.current % 15 === 0) {
        (window as any).__graphLayoutMetrics = computeLayoutMetrics(positions);
      }
    }

    // Deferred fitBounds — wait for d3-force to spread nodes.
    // Fit the largest document component so weak tails do not shrink the graph.
    if (needsFitRef.current && !hasFittedRef.current) {
      fitTickRef.current++;
      if (fitTickRef.current >= 30) {
        needsFitRef.current = false;
        hasFittedRef.current = true;

        const bounds = computeGraphFitBounds(graph, positions);
        if (bounds && bounds.minX < bounds.maxX) {
          camera.fitBounds(
            bounds.minX,
            bounds.minY,
            bounds.maxX,
            bounds.maxY,
            vw,
            vh,
            computeGraphFitPadding(vw, vh),
          );
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
    nodeLayer.applyZoom(cam.scale);
    edgeLayer.updatePositions(positions, cam.scale);

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
        edgeLayer.setNodeMeta?.(computeNodeMeta(graph));
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
        edgeLayer.setNodeMeta?.(computeNodeMeta(graph));
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
      edgeLayer.setNodeMeta?.(computeNodeMeta(graph));
    }
    flightLayerRef.current?.updateTheme(themeRef.current);
    renderLoopRef.current?.wake();
  }, [colors]);

  // Events are all native addEventListener in useGraphInteraction

  return (
    <div
      ref={containerRef}
      role="img"
      aria-label="Workspace Graph Canvas"
      className={className}
      style={{ position: "relative", width: "100%", height: "100%", touchAction: "none", ...style }}
    >
      <div
        style={{
          position: "absolute",
          width: 1,
          height: 1,
          padding: 0,
          margin: -1,
          overflow: "hidden",
          clipPath: "inset(50%)",
          whiteSpace: "nowrap",
          border: 0,
        }}
      >
        {viewModel?.graph.nodes.map((node) => (
          <span key={node.id}>{node.label}</span>
        ))}
      </div>
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
