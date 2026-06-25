/**
 * D3ForceRuntime — d3-force simulation implementing ForceRuntime interface.
 * Obsidian-like global graph motion: simple centering, degree-aware link
 * strength, strong repulsion, fixed collision radius, and slow cooldown.
 */

import {
  forceSimulation,
  forceLink,
  forceManyBody,
  forceCollide,
  forceX,
  forceY,
  type Simulation,
  type SimulationNodeDatum,
  type SimulationLinkDatum,
} from "d3-force";
import type { CoreGraph, ReadonlyVec2 } from "../model/coreTypes.js";
import type { ForceRuntime, LayoutProfile, ReleaseOptions } from "./ForceRuntime.js";
import { computeCentroid, getNeighbors } from "../model/graphSelectors.js";
import { OBSIDIAN_PROFILE } from "./layoutProfile.js";
import { spawnGraphNode } from "./graphSpawn.js";
import {
  computeObsidianCollisionRadius,
  computeObsidianLinkStrength,
  computeObsidianManyBodyStrength,
} from "./obsidianForceModel.js";

interface SimNode extends SimulationNodeDatum {
  id: string;
  radius: number;
  degree?: number;
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
  private fixedPositions = new Map<string, ReadonlyVec2>();

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

    // Compute node degrees
    const degreeMap = new Map<string, number>();
    for (const node of graph.nodes) degreeMap.set(node.id, 0);
    for (const edge of graph.edges) {
      degreeMap.set(edge.source, (degreeMap.get(edge.source) ?? 0) + 1);
      degreeMap.set(edge.target, (degreeMap.get(edge.target) ?? 0) + 1);
    }

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
        const neighborPositions = getNeighbors(graph, node.id)
          .map((nid) => prevPositions.get(nid))
          .filter((pos): pos is ReadonlyVec2 => Boolean(pos));
        const spawned = spawnGraphNode({
          neighborPositions,
          existingPositions: prevPositions.size > 0 ? Array.from(prevPositions.values()) : [centroid],
        });
        x = spawned.x;
        y = spawned.y;
      }

      const simNode: SimNode = {
        id: node.id,
        radius: node.size,
        x, y,
        degree: degreeMap.get(node.id) ?? 0,
      };
      simNodes.push(simNode);
      newNodeMap.set(node.id, simNode);
    }

    // Build sim links — use string IDs (matched by forceLink.id accessor)
    const simLinks: SimLink[] = graph.edges
      .filter((e) => newNodeMap.has(e.source) && newNodeMap.has(e.target))
      .map((e) => ({
        source: e.source,
        target: e.target,
        weight: e.weight,
      }));

    this.nodeMap = newNodeMap;
    this.edgeList = simLinks;

    // Destroy old simulation
    if (this.sim) this.sim.stop();

    // Create new simulation
    const { velocityDecay, alphaDecay } = this.profile;
    const p = this.profile;
    const linkNode = (node: string | SimNode): SimNode | undefined =>
      typeof node === "string" ? this.nodeMap.get(node) : node;

    this.sim = forceSimulation(simNodes)
      .force("link", forceLink<SimNode, SimLink>(simLinks)
        .id((d) => d.id)
        .distance(p.linkDistance)
        .strength((link) => {
          const source = linkNode(link.source as string | SimNode);
          const target = linkNode(link.target as string | SimNode);
          return computeObsidianLinkStrength(source?.degree ?? 1, target?.degree ?? 1, p);
        }))
      .force("charge", forceManyBody<SimNode>()
        .strength(() => computeObsidianManyBodyStrength(p))
        .distanceMin(p.repelDistanceMin ?? 30))
      .force("collide", forceCollide<SimNode>()
        .radius((d) => computeObsidianCollisionRadius(d.radius, p))
        .strength(p.collisionStrength ?? 0.5)
        .iterations(p.collideIterations ?? 1))
      .force("x", forceX(0).strength(p.centerStrength ?? 0.1))
      .force("y", forceY(0).strength(p.centerStrength ?? 0.1))
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
    this.syncPositions();
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
    this.fixedPositions.clear();
    this.listeners = [];
    this.settled = true;
  }

  tick(): void {
    if (this.sim) {
      this.sim.tick();
      this.syncPositions();
    }
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
    if (!node) {
      if (position) this.fixedPositions.set(nodeId, position);
      else this.fixedPositions.delete(nodeId);
      this.syncPositions();
      this.settled = false;
      return;
    }

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
    const { stickyMs = 120, clearVelocity = true } = options ?? {};

    if (!node) {
      if (stickyMs > 0) {
        const timer = setTimeout(() => {
          this.fixedPositions.delete(nodeId);
          this.syncPositions();
          this.stickyTimers = this.stickyTimers.filter((t) => t !== timer);
        }, stickyMs);
        this.stickyTimers.push(timer);
      } else {
        this.fixedPositions.delete(nodeId);
        this.syncPositions();
      }
      return;
    }

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
    const nextPositions = new Map<string, ReadonlyVec2>();
    for (const [id, node] of this.nodeMap) {
      nextPositions.set(id, { x: node.x ?? 0, y: node.y ?? 0 });
    }

    for (const [id, fixed] of this.fixedPositions) {
      if (nextPositions.has(id)) nextPositions.set(id, fixed);
    }

    this.positions = nextPositions;
  }
}
