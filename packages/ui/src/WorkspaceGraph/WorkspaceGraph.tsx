/**
 * WorkspaceGraph — thin wrapper around GraphSurface.
 * Handles async citation graph loading, then delegates to Pixi renderer.
 */

import React, { useEffect, useMemo, useState } from "react";
import type { ScannedDoc } from "../AgoraBridge.js";
import { getBridge } from "../AgoraBridge.js";
import { useTheme } from "../theme/ThemeContext.js";
import { graph as graphTokens } from "../theme/tokens.js";
import { GraphSurface } from "../GraphSurface/GraphSurface.js";
import type { CoreGraph, CoreGraphViewModel } from "../GraphSurface/model/coreTypes.js";
import { buildGraphViewModel } from "../GraphSurface/model/coreTypes.js";
import { buildFallbackCoreGraph, buildCitationCoreGraph } from "../GraphSurface/adapters/WorkspaceAdapter.js";
import { auditGraph } from "../GraphSurface/model/graphAudit.js";
import type { GraphAuditParserMetrics, GraphAuditSnapshot } from "../GraphSurface/model/graphAudit.js";
import {
  OBSIDIAN_DEFAULT_GRAPH_VIEW_OPTIONS,
  filterGraphForView,
} from "../GraphSurface/model/graphViewOptions.js";
import { GraphAuditPanel } from "./GraphAuditPanel.js";

interface RoomEntry {
  id: string;
  title: string;
  createdAt: string;
}

interface WorkspaceGraphProps {
  docs: ScannedDoc[];
  rooms: RoomEntry[];
  workspacePath?: string;
}

const COLORS = {
  border: graphTokens.nodeStroke,
  nodeFill: graphTokens.nodeFill,
  nodeTag: graphTokens.nodeTag,
  nodeMuted: graphTokens.nodeMuted,
  nodeGreen: graphTokens.nodeGreen,
  nodeYellow: graphTokens.nodeYellow,
  nodeGray: graphTokens.nodeGray,
  edgeWidth: graphTokens.edgeWidth,
};

export const WorkspaceGraph: React.FC<WorkspaceGraphProps> = ({ docs, rooms, workspacePath }) => {
  const { colors } = useTheme();
  const [citationGraph, setCitationGraph] = useState<CoreGraph | null>(null);
  const [loading, setLoading] = useState(false);
  const [parserMetrics, setParserMetrics] = useState<GraphAuditParserMetrics>({
    filesScanned: 0,
    filesParsed: 0,
    filesFailed: 0,
    totalWikilinks: 0,
    totalTags: 0,
    totalMarkdownLinks: 0,
    resolvedWikilinks: 0,
    unresolvedWikilinks: 0,
  });

  // Phase 1: immediate fallback (star topology)
  const fallback = useMemo(
    () => buildFallbackCoreGraph(docs, rooms, COLORS),
    [docs, rooms],
  );

  // Phase 2: citation graph (async, reads file contents)
  useEffect(() => {
    if (!workspacePath || docs.length === 0) return;
    let cancelled = false;

    (async () => {
      setLoading(true);
      const bridge = getBridge();
      if (!bridge) { setLoading(false); return; }

      const kernel = await import("@agora/kernel");

      const BATCH = 10;
      const parsed: Array<{ path: string; name: string; wikilinks: string[]; tags: string[]; aliases: string[]; markdownLinks: string[] }> = [];
      for (let i = 0; i < docs.length; i += BATCH) {
        const batch = docs.slice(i, i + BATCH);
        const results = await Promise.all(
          batch.map(async (doc) => {
            try {
              const content = await bridge.workspace.readDoc(workspacePath, doc.path);
              if (!content) return { path: doc.path, name: doc.name, wikilinks: [], tags: [], aliases: [], markdownLinks: [] };
              const { document } = kernel.parseDocument({ path: doc.path, content });
              return { path: doc.path, name: doc.name, wikilinks: document.wikilinks, tags: document.tags, aliases: document.aliases, markdownLinks: document.links };
            } catch {
              return { path: doc.path, name: doc.name, wikilinks: [], tags: [], aliases: [], markdownLinks: [] };
            }
          }),
        );
        parsed.push(...results);
        if (cancelled) return;
      }

      if (cancelled) return;
      setCitationGraph(buildCitationCoreGraph(docs, parsed, COLORS));

      // Track parser metrics
      let totalWikilinks = 0;
      let totalTags = 0;
      let totalMarkdownLinks = 0;
      for (const p of parsed) {
        totalWikilinks += p.wikilinks.length;
        totalTags += p.tags.length;
        totalMarkdownLinks += (p as any).markdownLinks?.length ?? 0;
      }
      setParserMetrics({
        filesScanned: docs.length,
        filesParsed: parsed.length,
        filesFailed: Math.max(0, docs.length - parsed.length),
        totalWikilinks,
        totalTags,
        totalMarkdownLinks,
        resolvedWikilinks: 0, // computed from audit edge counts
        unresolvedWikilinks: 0, // computed from audit edge counts
      });

      setLoading(false);
    })();

    return () => { cancelled = true; };
  }, [docs, workspacePath]);

  const rawGraph = citationGraph ?? fallback;
  const coreGraph = useMemo(
    () => filterGraphForView(rawGraph, OBSIDIAN_DEFAULT_GRAPH_VIEW_OPTIONS),
    [rawGraph],
  );
  const viewModel: CoreGraphViewModel = useMemo(
    () => buildGraphViewModel(coreGraph),
    [coreGraph],
  );

  const auditSnapshot: GraphAuditSnapshot | null = useMemo(() => {
    if (!citationGraph) return null;
    return auditGraph(coreGraph, parserMetrics);
  }, [citationGraph, coreGraph, parserMetrics]);

  const rawAuditSnapshot: GraphAuditSnapshot | null = useMemo(() => {
    if (!citationGraph) return null;
    return auditGraph(citationGraph, parserMetrics);
  }, [citationGraph, parserMetrics]);

  if (coreGraph.nodes.length <= 1) {
    return (
      <div style={{ position: "relative", height: "100%", minHeight: 360, display: "flex", alignItems: "center", justifyContent: "center", background: colors.bg }}>
        <div style={{ textAlign: "center", color: colors.textMuted, fontSize: 13, lineHeight: 1.6 }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" style={{ width: 32, height: 32, margin: "0 auto 12px", opacity: 0.3 }}>
            <circle cx="12" cy="12" r="10" strokeWidth="1.5" />
            <circle cx="12" cy="12" r="3" strokeWidth="1.5" />
            <path d="M12 2v4M12 18v4M2 12h4M18 12h4" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <div>No documents or rooms yet</div>
          <div style={{ fontSize: 12, opacity: 0.6 }}>Open files or start a chat to build the graph</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ position: "relative", height: "100%", minHeight: 360 }}>
      {loading && (
        <div style={{ position: "absolute", top: 8, left: 8, fontSize: 11, color: colors.textMuted, opacity: 0.6, zIndex: 10 }}>
          Loading links...
        </div>
      )}
      <GraphSurface viewModel={viewModel} />
      {process.env.NODE_ENV === "development" && auditSnapshot && (
        <GraphAuditPanel snapshot={auditSnapshot} rawSnapshot={rawAuditSnapshot} />
      )}
    </div>
  );
};
