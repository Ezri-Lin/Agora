/**
 * LLMCompressorAdapter — 将 LLMContextCompressor 适配为 ConversationCompressor 接口
 */

import type { ConversationCompressor } from "../eval/EvalRunner.js";
import type { ConversationSummaryV1 } from "./ConversationSummary.js";
import { LLMContextCompressor, type LLMProvider } from "./LLMContextCompressor.js";

export class LLMCompressorAdapter implements ConversationCompressor {
  private compressor: LLMContextCompressor;

  constructor(llm: LLMProvider) {
    this.compressor = new LLMContextCompressor({ llm });
  }

  async compress(input: {
    sessionId: string;
    transcript: string;
  }): Promise<ConversationSummaryV1> {
    const result = await this.compressor.compress({
      sessionId: input.sessionId,
      transcript: input.transcript,
    });

    return result.summary;
  }
}
