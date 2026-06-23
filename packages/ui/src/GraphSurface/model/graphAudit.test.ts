import { describe, it, expect } from "vitest";
import { auditGraph } from "./graphAudit.js";
import type { CoreGraph } from "./coreTypes.js";

describe("auditGraph", () => {
  it("counts nodes by kind", () => {
    const graph: CoreGraph = {
      nodes: [
        { id: "1", label: "A", kind: "document", size: 4, color: "#999" },
        { id: "2", label: "B", kind: "tag", size: 3, color: "#44cf6e" },
        { id: "3", label: "C", kind: "ghost", size: 3, color: "#666" },
        { id: "4", label: "D", kind: "document", size: 4, color: "#999" },
      ],
      edges: [],
    };
    const audit = auditGraph(graph, { filesScanned: 4, filesParsed: 3, filesFailed: 1, totalWikilinks: 0, totalTags: 0, totalMarkdownLinks: 0, resolvedWikilinks: 0, unresolvedWikilinks: 0 });
    expect(audit.nodes.total).toBe(4);
    expect(audit.nodes.document).toBe(2);
    expect(audit.nodes.tag).toBe(1);
    expect(audit.nodes.ghost).toBe(1);
  });

  it("counts edges by inferred kind", () => {
    const graph: CoreGraph = {
      nodes: [
        { id: "ws", label: "Workspace", kind: "workspace", size: 8, color: "#999" },
        { id: "d1", label: "A", kind: "document", size: 4, color: "#999" },
        { id: "d2", label: "B", kind: "document", size: 4, color: "#999" },
        { id: "t1", label: "#tag", kind: "tag", size: 3, color: "#44cf6e" },
        { id: "g1", label: "ghost", kind: "ghost", size: 3, color: "#666" },
      ],
      edges: [
        { id: "e1", source: "ws", target: "d1", size: 0.4 },  // fallback
        { id: "e2", source: "d1", target: "d2", size: 0.6 },  // wikilink
        { id: "e3", source: "d1", target: "t1", size: 0.3 },  // tag
        { id: "e4", source: "d2", target: "g1", size: 0.3 },  // ghost
      ],
    };
    const audit = auditGraph(graph, { filesScanned: 2, filesParsed: 2, filesFailed: 0, totalWikilinks: 1, totalTags: 1, totalMarkdownLinks: 0, resolvedWikilinks: 1, unresolvedWikilinks: 0 });
    expect(audit.edges.total).toBe(4);
    expect(audit.edges.fallback).toBe(1);
    expect(audit.edges.wikilink).toBe(1);
    expect(audit.edges.tag).toBe(1);
    expect(audit.edges.ghost).toBe(1);
  });

  it("returns zero counts for empty graph", () => {
    const graph: CoreGraph = { nodes: [], edges: [] };
    const audit = auditGraph(graph, { filesScanned: 0, filesParsed: 0, filesFailed: 0, totalWikilinks: 0, totalTags: 0, totalMarkdownLinks: 0, resolvedWikilinks: 0, unresolvedWikilinks: 0 });
    expect(audit.nodes.total).toBe(0);
    expect(audit.edges.total).toBe(0);
  });

  it("derives resolvedWikilinks from edge counts", () => {
    const graph: CoreGraph = {
      nodes: [
        { id: "d1", label: "A", kind: "document", size: 4, color: "#999" },
        { id: "d2", label: "B", kind: "document", size: 4, color: "#999" },
        { id: "g1", label: "ghost", kind: "ghost", size: 3, color: "#666" },
      ],
      edges: [
        { id: "e1", source: "d1", target: "d2", size: 0.6 },
        { id: "e2", source: "d2", target: "g1", size: 0.3 },
      ],
    };
    const audit = auditGraph(graph, { filesScanned: 2, filesParsed: 2, filesFailed: 0, totalWikilinks: 2, totalTags: 0, totalMarkdownLinks: 0, resolvedWikilinks: 0, unresolvedWikilinks: 0 });
    expect(audit.parser.resolvedWikilinks).toBe(1);
    expect(audit.parser.unresolvedWikilinks).toBe(1);
  });
});
