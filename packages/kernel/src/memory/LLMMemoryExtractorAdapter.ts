/**
 * LLMMemoryExtractorAdapter — 将 DirectOpenAIProvider 适配为 MemoryExtractionProvider
 */

import type { MemoryExtractionProvider } from "./LLMMemoryExtractor.js";

interface OpenAICompatibleProvider {
  callModerator(params: {
    roomId: string;
    task: string;
    context: string;
  }): Promise<{ content: string; thinking?: string }>;
}

export class LLMMemoryExtractorAdapter implements MemoryExtractionProvider {
  private provider: OpenAICompatibleProvider;

  constructor(provider: OpenAICompatibleProvider) {
    this.provider = provider;
  }

  async complete(input: {
    systemPrompt: string;
    userPrompt: string;
    temperature: number;
    maxTokens?: number;
  }): Promise<{
    text: string;
    model: string;
    usage?: {
      inputTokens?: number;
      outputTokens?: number;
    };
  }> {
    // Combine system and user prompts for callModerator
    const context = `${input.systemPrompt}\n\n${input.userPrompt}`;

    const result = await this.provider.callModerator({
      roomId: "memory-extraction",
      task: "extract_memories",
      context,
    });

    return {
      text: result.content,
      model: "unknown", // Provider doesn't expose model
      usage: {
        inputTokens: Math.ceil(context.length / 4), // Rough estimate
        outputTokens: Math.ceil(result.content.length / 4), // Rough estimate
      },
    };
  }
}
