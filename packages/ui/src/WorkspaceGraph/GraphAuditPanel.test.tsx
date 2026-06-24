import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { GraphAuditPanel } from "./GraphAuditPanel.js";
import type { GraphAuditSnapshot } from "../GraphSurface/model/graphAudit.js";

const mockSnapshot: GraphAuditSnapshot = {
  nodes: { total: 10, document: 5, tag: 3, ghost: 1, workspace: 1, room: 0, other: 0 },
  edges: { total: 8, wikilink: 3, tag: 3, ghost: 1, fallback: 1, other: 0 },
  parser: { filesScanned: 5, filesParsed: 5, filesFailed: 0, totalWikilinks: 4, totalTags: 3, totalMarkdownLinks: 2, resolvedWikilinks: 3, unresolvedWikilinks: 1 },
  clusters: { total: 2, largest: 3, unclustered: 2, topClusters: [{ id: "src", count: 3 }, { id: "lib", count: 2 }] },
};

describe("GraphAuditPanel", () => {
  it("renders audit counts", () => {
    render(<GraphAuditPanel snapshot={mockSnapshot} />);
    expect(screen.getByText(/Nodes: 10/)).toBeDefined();
    expect(screen.getByText(/Edges: 8/)).toBeDefined();
    expect(screen.getByText(/Files scanned: 5/)).toBeDefined();
  });

  it("renders nothing when snapshot is null", () => {
    const { container } = render(<GraphAuditPanel snapshot={null} />);
    expect(container.firstChild).toBeNull();
  });
});
