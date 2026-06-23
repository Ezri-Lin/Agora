/**
 * MockEvidenceSearchProvider — 用于 eval / CI 的 deterministic provider
 *
 * 返回预设的搜索结果，不依赖网络
 */

import type {
  EvidenceSearchProvider,
  EvidenceSearchResult,
} from "./EvidenceSearchTypes.js";

// === Mock Data ===

const MOCK_RESULTS: Record<string, EvidenceSearchResult[]> = {
  "Context Substrate": [
    {
      title: "Context Substrate Architecture Guide",
      url: "https://example.com/context-substrate-guide",
      snippet:
        "Context Substrate is a core architecture component for managing conversation context in AI systems.",
      sourceType: "fixture",
      score: 0.95,
    },
    {
      title: "Understanding Context Windows in LLMs",
      url: "https://example.com/context-windows",
      snippet:
        "Context windows are limited in LLMs. Context Substrate helps manage this limitation through intelligent compression.",
      sourceType: "fixture",
      score: 0.85,
    },
    {
      title: "Memory-Augmented Language Models",
      url: "https://example.com/memory-augmented",
      snippet:
        "Research shows that memory systems can reduce 60% of repeated questions in AI assistants.",
      sourceType: "fixture",
      score: 0.75,
    },
  ],
  TypeScript: [
    {
      title: "TypeScript Best Practices 2026",
      url: "https://example.com/typescript-best-practices",
      snippet:
        "TypeScript provides type safety and better developer experience for large-scale applications.",
      sourceType: "fixture",
      score: 0.9,
    },
    {
      title: "Why Choose TypeScript",
      url: "https://example.com/why-typescript",
      snippet:
        "TypeScript catches errors at compile time, reducing runtime bugs by up to 40%.",
      sourceType: "fixture",
      score: 0.8,
    },
  ],
  "memory system": [
    {
      title: "Building Effective Memory Systems",
      url: "https://example.com/memory-systems",
      snippet:
        "Effective memory systems require extraction, validation, storage, retrieval, and consolidation.",
      sourceType: "fixture",
      score: 0.9,
    },
    {
      title: "Anthropic Research on Memory",
      url: "https://anthropic.com/research/memory",
      snippet:
        "According to Anthropic research, memory systems can reduce 60% of repeated questions.",
      sourceType: "fixture",
      score: 0.85,
    },
  ],
};

const DEFAULT_RESULTS: EvidenceSearchResult[] = [
  {
    title: "General Knowledge Base",
    url: "https://example.com/general",
    snippet: "This is a general knowledge resource.",
    sourceType: "fixture",
    score: 0.5,
  },
];

// === MockEvidenceSearchProvider ===

export class MockEvidenceSearchProvider implements EvidenceSearchProvider {
  name = "mock";

  async search(
    query: string,
    limit: number = 10
  ): Promise<EvidenceSearchResult[]> {
    // Find matching mock data
    const queryLower = query.toLowerCase();

    for (const [key, results] of Object.entries(MOCK_RESULTS)) {
      if (queryLower.includes(key.toLowerCase()) || key.toLowerCase().includes(queryLower)) {
        return results.slice(0, limit);
      }
    }

    // Return default results
    return DEFAULT_RESULTS.slice(0, limit);
  }
}
