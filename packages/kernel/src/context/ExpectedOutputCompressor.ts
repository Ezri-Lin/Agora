/**
 * ExpectedOutputCompressor — 直接读取 expected output
 *
 * 用于 contract-mode smoke test，验证 eval runner 本身是否工作
 */

import type { ConversationCompressor } from "../eval/EvalRunner.js";
import type { ConversationSummaryV1 } from "./ConversationSummary.js";

export class ExpectedOutputCompressor implements ConversationCompressor {
  private expectedOutputs: Map<string, ConversationSummaryV1>;

  constructor(expectedOutputs: Map<string, ConversationSummaryV1>) {
    this.expectedOutputs = expectedOutputs;
  }

  async compress(input: {
    sessionId: string;
    transcript: string;
  }): Promise<ConversationSummaryV1> {
    const expected = this.expectedOutputs.get(input.sessionId);
    if (!expected) {
      throw new Error(`No expected output found for session: ${input.sessionId}`);
    }

    // Return expected output with current timestamp
    return {
      ...expected,
      compressedAt: new Date().toISOString(),
    };
  }
}
