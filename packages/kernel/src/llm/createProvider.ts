import type { LLMConfig } from "@agora/shared";
import type { LLMProvider } from "../types/index.js";
import { MockMultiCallProvider } from "./MockMultiCallProvider.js";
import { OpenAICompatibleProvider } from "./OpenAICompatibleProvider.js";

export function createProvider(config: LLMConfig): LLMProvider {
  switch (config.provider) {
    case "mock":
      return new MockMultiCallProvider();
    case "openai_compatible":
      return new OpenAICompatibleProvider(config);
    default:
      throw new Error(`Unknown provider: ${config.provider}`);
  }
}
