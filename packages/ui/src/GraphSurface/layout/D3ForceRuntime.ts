/**
 * D3ForceRuntime — d3-force simulation implementing ForceRuntime interface.
 * Behavior-compatible with Obsidian-like graph motion: tight clustering,
 * soft springs, sticky drag, slow cooldown.
 */

import {
  forceSimulation,
  forceLink,
  forceManyBody,
  forceCollide,
  forceCenter,
  forceX,
  forceY,
  type Simulation,
  type SimulationNodeDatum,
  type SimulationLinkDatum,
} from "d3-force";
import type { CoreGraph, CoreEdge, ReadonlyVec2 } from "../model/coreTypes.js";
import type { ForceRuntime, LayoutProfile, ReleaseOptions } from "./ForceRuntime.js";
import { computeCentroid, getNeighbors } from "../model/graphSelectors.js";
import { OBSIDIAN_PROFILE } from "./layoutProfile.js";

interface SimNode extends SimulationNodeDatum {
  id: string;
  radius: number;
}

interface SimLink extends SimulationLinkDatum<SimNode> {
  weight?: number;
}

export class D3ForceRuntime implements ForceRuntime {
  private sim: Simulation<SimNode, SimLink> | null = null;
  private positions = new Map<string, ReadonlyVec2>();
  private nodeMap = new Map<string, SimNode>();
  private edgeList: SimLink[] = [];
  private graph: CoreGraph | null = null;
  private profile: LayoutProfile;
  private settled = false;
  private listeners: Array<() => void> = [];
  private stickyTimers: ReturnType<typeof setTimeout>[] = [];

  constructor(profile: LayoutProfile = OBSIDIAN_PROFILE) {
    this.profile = profile;
  }

  setGraph(graph: CoreGraph): void {
    this.graph = graph;
    const prevPositions = new Map(this.positions);

    // Build centroid for new nodes
    const centroid = prevPositions.size > 0
      ? computeCentroid(prevPositions)
      : { x: 0, y: 0 };

    // Build sim nodes: preserve existing positions, spawn new near neighbors
    const simNodes: SimNode[] = [];
    const newNodeMap = new Map<string, SimNode>();

    for (const node of graph.nodes) {
      const prev = prevPositions.get(node.id);
      let x: number, y: number;

      if (prev) {
        x = prev.x;
        y = prev.y;
      } else {
        // Try spawning near strongest neighbor
        const neighbors = getNeighbors(graph, node.id);
        let anchor: ReadonlyVec2 | null = null;
        for (const nid of neighbors) {
          const np = prevPositions.get(nid);
          if (np) { anchor = np; break; }
        }
        const base = anchor ?? centroid;
        const jitter = 10;
        x = base.x + (Math.random() - 0.5) * jitter;
        y = base.y + (Math.random() - 0.5) * jitter;
      }

      const simNode: SimNode = {
        id: node.id,
        radius: node.size + this.profile.collidePadding,
        x, y,
      };
      simNodes.push(simNode);
      newNodeMap.set(node.id, simNode);
    }

    // Build sim links — use string IDs (matched by forceLink.id accessor)
    const simLinks: SimLink[] = graph.edges.map((e) => ({
      source: e.source,
      target: e.target,
      weight: e.weight,
    }));

    this.nodeMap = newNodeMap;
    this.edgeList = simLinks;

    // Destroy old simulation
    if (this.sim) this.sim.stop();

    // Create new simulation
    const { linkDistance, linkStrength, manyBodyStrength, collidePadding,
      velocityDecay, alphaDecay, dragAlphaTarget } = this.profile;

    this.sim = forceSimulation(simNodes)
      .force("link", forceLink<SimNode, SimLink>(simLinks)
        .id((d) => d.id)
        .distance(linkDistance)
        .strength(linkStrength))
      .force("charge", forceManyBody<SimNode>()
        .strength(manyBodyStrength))
      .force("collide", forceCollide<SimNode>()
        .radius((d) => d.radius + collidePadding))
      .force("center", forceCenter(0, 0))
      .force("x", forceX(0).strength(0.1))
      .force("y", forceY(0).strength(0.1))
      .velocityDecay(velocityDecay)
      .alphaDecay(alphaDecay)
      .on("tick", () => {
        this.syncPositions();
        for (const fn of this.listeners) fn();
      })
      .on("end", () => {
        this.settled = true;
      });

    // Keep alphaTarget at 0 by default (simulation stops naturally)
    this.sim.alphaTarget(0);
    this.settled = false;
  }

  start(): void {
    if (this.sim) {
      this.settled = false;
      this.sim.restart();
    }
  }

  stop(): void {
    if (this.sim) this.sim.stop();
  }

  destroy(): void {
    // Clear sticky timers
    for (const t of this.stickyTimers) clearTimeout(t);
    this.stickyTimers = [];

    if (this.sim) {
      this.sim.stop();
      this.sim = null;
    }
    this.positions.clear();
    this.nodeMap.clear();
    this.edgeList = [];
    this.graph = null;
    this.listeners = [];
    this.settled = true;
  }

  tick(): void {
    if (this.sim) this.sim.tick();
  }

  isRunning(): boolean {
    return this.sim !== null && !this.settled;
  }

  isSettled(): boolean {
    return this.settled;
  }

  onTick(listener: () => void): () => void {
    this.listeners.push(listener);
    return () => {
      const idx = this.listeners.indexOf(listener);
      if (idx >= 0) this.listeners.splice(idx, 1);
    };
  }

  setNodeFixed(nodeId: string, position: ReadonlyVec2 | null): void {
    const node = this.nodeMap.get(nodeId);
    if (!node) return;

    if (position) {
      node.fx = position.x;
      node.fy = position.y;
      // Reheat for drag
      if (this.sim) {
        this.sim.alphaTarget(this.profile.dragAlphaTarget);
        this.sim.restart();
      }
      this.settled = false;
    } else {
      node.fx = null;
      node.fy = null;
    }
  }

  releaseNode(nodeId: string, options?: ReleaseOptions): void {
    const node = this.nodeMap.get(nodeId);
    if (!node) return;

    const { stickyMs = 120, clearVelocity = true } = options ?? {};

    if (clearVelocity) {
      node.vx = 0;
      node.vy = 0;
    }

    if (stickyMs > 0) {
      // Keep fixed for a short time, then release
      const timer = setTimeout(() => {
        this.setNodeFixed(nodeId, null);
        if (this.sim) this.sim.alphaTarget(0);
        this.stickyTimers = this.stickyTimers.filter((t) => t !== timer);
      }, stickyMs);
      this.stickyTimers.push(timer);
    } else {
      this.setNodeFixed(nodeId, null);
      if (this.sim) this.sim.alphaTarget(0);
    }
  }

  getPositions(): ReadonlyMap<string, ReadonlyVec2> {
    return this.positions;
  }

  // ── Internal ──

  private syncPositions(): void {
    for (const [id, node] of this.nodeMap) {
      this.positions.set(id, { x: node.x ?? 0, y: node.y ?? 0 });
    }
  }
}
