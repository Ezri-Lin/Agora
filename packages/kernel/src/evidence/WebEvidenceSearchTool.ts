/**
 * WebEvidenceSearchTool — 注册到 Tool Runtime 的 Evidence Search 工具
 *
 * 设计原则：
 * - read-only network tool
 * - built on Tool Runtime
 * - claim must be source-bound
 */

import type {
  ToolManifest,
  ToolExecutor,
} from "../tools/ToolRuntimeTypes.js";
import type {
  EvidenceSearchProvider,
  EvidenceSearchInput,
  EvidenceSearchOutput,
  EvidencePacket,
  EvidenceItem,
  EvidenceClaim,
} from "./EvidenceSearchTypes.js";
import { ContentExtractor } from "./ContentExtractor.js";
import { EvidenceRanker } from "./EvidenceRanker.js";
import { CitationPolicy } from "./CitationPolicy.js";

// === Tool Manifest ===

export const webEvidenceSearchManifest: ToolManifest = {
  name: "web_evidence_search",
  description:
    "Search the web and return an auditable EvidencePacket.",
  riskLevel: "read_only",
  sideEffects: ["network_request"],
  requiresApproval: false,
  inputSchema: {
    type: "object",
    properties: {
      query: { type: "string" },
      limit: { type: "number" },
    },
    required: ["query"],
  },
  outputSchema: {
    type: "object",
    description: "EvidencePacket",
  },
};

// === WebEvidenceSearchTool ===

export class WebEvidenceSearchTool {
  private provider: EvidenceSearchProvider;
  private extractor: ContentExtractor;
  private ranker: EvidenceRanker;
  private citationPolicy: CitationPolicy;

  constructor(provider: EvidenceSearchProvider) {
    this.provider = provider;
    this.extractor = new ContentExtractor();
    this.ranker = new EvidenceRanker();
    this.citationPolicy = new CitationPolicy();
  }

  /**
   * 获取工具清单
   */
  getManifest(): ToolManifest {
    return webEvidenceSearchManifest;
  }

  /**
   * 获取工具执行器
   */
  getExecutor(): ToolExecutor {
    return async (args: unknown) => {
      const input = args as EvidenceSearchInput;
      return this.execute(input);
    };
  }

  /**
   * 执行搜索
   */
  async execute(input: EvidenceSearchInput): Promise<EvidenceSearchOutput> {
    const startedAt = new Date().toISOString();
    const { query, limit = 10 } = input;

    // Search
    const searchResults = await this.provider.search(query, limit);

    // Convert to EvidenceItems
    const items: EvidenceItem[] = searchResults.map((result, index) => ({
      id: `item-${Date.now()}-${index}`,
      title: result.title,
      url: result.url,
      snippet: result.snippet,
      sourceType: result.sourceType,
      retrievedAt: startedAt,
      score: result.score,
    }));

    // Rank items
    const rankedItems = this.ranker.rank(items, query);

    // Extract claims
    const rawClaims = this.extractor.extract(rankedItems);

    // Validate claims (source binding)
    const validClaims = this.citationPolicy.validate(rawClaims, rankedItems);

    // Rank claims
    const rankedClaims = this.ranker.rankClaims(validClaims);

    // Determine uncertainty
    const uncertainty = this.assessUncertainty(rankedItems, rankedClaims);

    // Create packet
    const packet: EvidencePacket = {
      id: `packet-${Date.now()}`,
      query,
      results: rankedItems,
      extractedClaims: rankedClaims,
      uncertainty,
      retrievalTrace: {
        provider: this.provider.name,
        query,
        resultCount: rankedItems.length,
        extractedClaimCount: rankedClaims.length,
        startedAt,
        completedAt: new Date().toISOString(),
      },
      createdAt: startedAt,
    };

    return { packet };
  }

  // === Private Helpers ===

  private assessUncertainty(
    items: EvidenceItem[],
    claims: EvidenceClaim[]
  ): "low" | "medium" | "high" {
    // No results = high uncertainty
    if (items.length === 0) return "high";

    // No claims = high uncertainty
    if (claims.length === 0) return "high";

    // Check average confidence
    const confidenceWeight = { high: 3, medium: 2, low: 1 };
    const totalWeight = claims.reduce(
      (sum, c) => sum + confidenceWeight[c.confidence],
      0
    );
    const avgConfidence = totalWeight / claims.length;

    if (avgConfidence >= 2.5) return "low";
    if (avgConfidence >= 1.5) return "medium";
    return "high";
  }
}
