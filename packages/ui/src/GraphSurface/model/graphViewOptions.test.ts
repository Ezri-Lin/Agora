import { describe, expect, it } from "vitest";
import type { CoreGraph } from "./coreTypes.js";
import {
  OBSIDIAN_DEFAULT_GRAPH_VIEW_OPTIONS,
  filterGraphForView,
} from "./graphViewOptions.js";

const graph: CoreGraph = {
  nodes: [
    { id: "doc:a", label: "A", kind: "document", size: 4, color: "#999999" },
    { id: "doc:b", label: "B", kind: "document", size: 4, color: "#999999" },
    { id: "doc:orphan", label: "Orphan", kind: "document", size: 4, color: "#999999" },
    { id: "tag:ux", label: "#ux", kind: "tag", size: 3, color: "#44cf6e" },
    { id: "ghost:missing", label: "Missing", kind: "ghost", size: 3, color: "#777777" },
  ],
  edges: [
    { id: "ab", source: "doc:a", target: "doc:b", size: 0.6 },
    { id: "atag", source: "doc:a", target: "tag:ux", size: 0.3 },
    { id: "aghost", source: "doc:a", target: "ghost:missing", size: 0.2 },
  ],
};

describe("filterGraphForView", () => {
  it("matches Obsidian defaults by hiding tags while keeping unresolved and orphans", () => {
    const visible = filterGraphForView(graph, OBSIDIAN_DEFAULT_GRAPH_VIEW_OPTIONS);

    expect(visible.nodes.map((node) => node.id)).toEqual([
      "doc:a",
      "doc:b",
      "doc:orphan",
      "ghost:missing",
    ]);
    expect(visible.edges.map((edge) => edge.id)).toEqual(["ab", "aghost"]);
  });

  it("can show tags when explicitly enabled", () => {
    const visible = filterGraphForView(graph, {
      ...OBSIDIAN_DEFAULT_GRAPH_VIEW_OPTIONS,
      showTags: true,
    });

    expect(visible.nodes.some((node) => node.id === "tag:ux")).toBe(true);
    expect(visible.edges.some((edge) => edge.id === "atag")).toBe(true);
  });

  it("can hide unresolved ghost nodes when requested", () => {
    const visible = filterGraphForView(graph, {
      ...OBSIDIAN_DEFAULT_GRAPH_VIEW_OPTIONS,
      hideUnresolved: true,
    });

    expect(visible.nodes.some((node) => node.kind === "ghost")).toBe(false);
    expect(visible.edges.some((edge) => edge.id === "aghost")).toBe(false);
  });

  it("can hide orphan documents when requested", () => {
    const visible = filterGraphForView(graph, {
      ...OBSIDIAN_DEFAULT_GRAPH_VIEW_OPTIONS,
      showOrphans: false,
    });

    expect(visible.nodes.some((node) => node.id === "doc:orphan")).toBe(false);
  });
});
