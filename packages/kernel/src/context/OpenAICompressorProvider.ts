/**
 * OpenAICompressorProvider — 将 OpenAI 兼容 provider 适配为 LLMCompressorProvider
 */

import type { LLMProvider as CompressorLLMProvider } from "./LLMContextCompressor.js";

interface OpenAICompatibleProvider {
  callModerator(params: {
    roomId: string;
    task: string;
    context: string;
  }): Promise<{ content: string; thinking?: string }>;
}

export class OpenAICompressorProvider implements CompressorLLMProvider {
  private provider: OpenAICompatibleProvider;

  constructor(provider: OpenAICompatibleProvider) {
    this.provider = provider;
  }

  async call(input: {
    prompt: string;
    temperature?: number;
    maxTokens?: number;
  }): Promise<{
    content: string;
    tokenUsage: { input: number; output: number };
  }> {
    // Use the moderator call with "summarize" task
    const result = await this.provider.callModerator({
      roomId: "compression",
      task: "summarize",
      context: input.prompt,
    });

    return {
      content: result.content,
      tokenUsage: {
        input: Math.ceil(input.prompt.length / 4), // Rough estimate
        output: Math.ceil(result.content.length / 4), // Rough estimate
      },
    };
  }
}
