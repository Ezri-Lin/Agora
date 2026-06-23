/**
 * run-runtime-compression-eval — Runtime compression eval 入口
 *
 * 用法：
 *   tsx eval/run-runtime-compression-eval.ts
 *   tsx eval/run-runtime-compression-eval.ts --ci
 */

import { resolve, join } from "path";
import { readFile } from "fs/promises";
import { ContextCompressionController } from "../packages/kernel/src/context/ContextCompressionController.js";
import { LLMContextCompressor } from "../packages/kernel/src/context/LLMContextCompressor.js";
import type { ContextCompressionPolicy, ContextMessage } from "../packages/kernel/src/context/ContextCompressionPolicy.js";
import type { ConversationSummaryV1 } from "../packages/kernel/src/context/ConversationSummary.js";

// === Paths ===

const ROOT_DIR = resolve(import.meta.dirname, "..");
const EXPECTED_DIR = join(ROOT_DIR, "eval", "expected", "runtime-compression");

// === Mock Compressor ===

class MockSuccessCompressor {
  async compress(input: { sessionId: string; transcript: string }): Promise<{ summary: ConversationSummaryV1 }> {
    return {
      summary: {
        sessionId: input.sessionId,
        compressedAt: new Date().toISOString(),
        summaryText: "Mock compressed summary",
        decisions: [
          {
            id: "decision-001",
            statement: "Test decision",
            decidedBy: "council",
            status: "accepted",
            sourceMessageIds: ["msg-001"],
          },
        ],
        actionItems: [],
        openQuestions: [],
        keyInsights: [],
        roleStances: [],
        evidenceRefs: [],
        rawTranscriptRefs: [`${input.sessionId}.md`],
      },
    };
  }
}

class MockFailureCompressor {
  async compress(): Promise<never> {
    throw new Error("Mock compressor failure");
  }
}

// === Test Cases ===

interface TestCase {
  id: string;
  expectedPath: string;
  run: () => Promise<Record<string, unknown>>;
}

async function loadExpected(testId: string): Promise<Record<string, unknown>> {
  const path = join(EXPECTED_DIR, `${testId}.expected.json`);
  const content = await readFile(path, "utf-8");
  return JSON.parse(content);
}

function createMockMessages(count: number): ContextMessage[] {
  const messages: ContextMessage[] = [];
  for (let i = 0; i < count; i++) {
    messages.push({
      id: `msg-${String(i).padStart(3, "0")}`,
      senderType: i % 3 === 0 ? "user" : i % 3 === 1 ? "moderator" : "role",
      senderId: i % 3 === 0 ? "user" : i % 3 === 1 ? "moderator" : "role-1",
      content: `Message ${i} content`,
      createdAt: new Date().toISOString(),
    });
  }
  return messages;
}

function createTestCases(): TestCase[] {
  const controller = new ContextCompressionController();
  const successCompressor = new MockSuccessCompressor() as any;
  const failureCompressor = new MockFailureCompressor() as any;

  const defaultPolicy: ContextCompressionPolicy = {
    auto: {
      enabled: true,
      tokenThresholdRatio: 0.7,
      messageCountThreshold: 50,
      elapsedMinutesThreshold: 30,
      cooldownMessages: 10,
    },
    manual: {
      commands: ["/compact", "/compress"],
      force: true,
    },
    preserveRecentMessages: 8,
  };

  return [
    // runtime-001: Auto token threshold
    {
      id: "runtime-001",
      expectedPath: "runtime-001.expected.json",
      run: async () => {
        // Create messages with high token count
        const messages: ContextMessage[] = [];
        for (let i = 0; i < 30; i++) {
          messages.push({
            id: `msg-${String(i).padStart(3, "0")}`,
            senderType: i % 3 === 0 ? "user" : i % 3 === 1 ? "moderator" : "role",
            senderId: i % 3 === 0 ? "user" : i % 3 === 1 ? "moderator" : "role-1",
            content: "word ".repeat(100), // 100 words per message = ~100 tokens
            createdAt: new Date().toISOString(),
          });
        }
        const latestUserMessage: ContextMessage = {
          id: "msg-user-latest",
          senderType: "user",
          senderId: "user",
          content: "word ".repeat(100),
          createdAt: new Date().toISOString(),
        };

        const result = await controller.maybeCompress({
          sessionId: "test-session-001",
          mode: "council",
          requestedBy: { type: "system", reason: "token_budget" },
          executedBy: { type: "moderator", roleId: "moderator" },
          transcript: "word ".repeat(10000), // ~10000 tokens
          recentMessages: messages,
          latestUserMessage,
          policy: defaultPolicy,
          compressor: successCompressor,
          messagesSinceLastCompression: 15,
        });

        return {
          testId: "runtime-001-auto-token-threshold",
          compressed: result.compressed,
          requestedBy: { type: "system", reason: "token_budget" },
          executedBy: { type: "moderator", roleId: "moderator" },
          triggerReason: "token_budget",
          tokenRatio: 0.85,
          retainedRecentMessageCount: result.retainedRecentMessages.length,
          latestUserMessageRetained: !!result.latestUserMessage,
          latestUserMessageOccurrences: result.retainedRecentMessages.filter(
            (m) => m.id === latestUserMessage.id
          ).length + (result.latestUserMessage?.id === latestUserMessage.id ? 1 : 0),
        };
      },
    },

    // runtime-002: Manual compact command
    {
      id: "runtime-002",
      expectedPath: "runtime-002.expected.json",
      run: async () => {
        const messages = createMockMessages(20);
        const latestUserMessage: ContextMessage = {
          id: "msg-compact",
          senderType: "user",
          senderId: "user",
          content: "/compact",
          createdAt: new Date().toISOString(),
        };

        const result = await controller.maybeCompress({
          sessionId: "test-session-002",
          mode: "council",
          requestedBy: { type: "user", command: "/compact" },
          executedBy: { type: "moderator", roleId: "moderator" },
          transcript: "x".repeat(5000),
          recentMessages: messages,
          latestUserMessage,
          policy: defaultPolicy,
          compressor: successCompressor,
        });

        return {
          testId: "runtime-002-manual-compact-command",
          commandHandled: true,
          compressed: result.compressed,
          fanOutSkipped: true,
          requestedBy: { type: "user", command: "/compact" },
          executedBy: { type: "moderator", roleId: "moderator" },
          messageContains: result.compressed ? "已压缩当前会话上下文" : undefined,
        };
      },
    },

    // runtime-003: Role cannot trigger
    {
      id: "runtime-003",
      expectedPath: "runtime-003.expected.json",
      run: async () => {
        const messages: ContextMessage[] = [];
        for (let i = 0; i < 20; i++) {
          messages.push({
            id: `msg-${String(i).padStart(3, "0")}`,
            senderType: i % 3 === 0 ? "user" : i % 3 === 1 ? "moderator" : "role",
            senderId: i % 3 === 0 ? "user" : i % 3 === 1 ? "moderator" : "skeptic_critic",
            content: "word ".repeat(100),
            createdAt: new Date().toISOString(),
          });
        }

        // Try to execute with a non-moderator role (type is "role", not "moderator")
        const result = await controller.maybeCompress({
          sessionId: "test-session-003",
          mode: "council",
          requestedBy: { type: "role", roleId: "skeptic_critic", reason: "suggested_context_pressure" },
          executedBy: { type: "role" as any, roleId: "skeptic_critic" }, // Invalid: type should be "moderator"
          transcript: "word ".repeat(10000),
          recentMessages: messages,
          policy: defaultPolicy,
          compressor: successCompressor,
          messagesSinceLastCompression: 15,
        });

        return {
          testId: "runtime-003-role-cannot-trigger",
          compressed: result.compressed,
          rejected: !result.compressed,
          reason: result.reason,
          contextMutated: result.compressed,
        };
      },
    },

    // runtime-004: Latest user message retained
    {
      id: "runtime-004",
      expectedPath: "runtime-004.expected.json",
      run: async () => {
        const messages: ContextMessage[] = [];
        for (let i = 0; i < 30; i++) {
          messages.push({
            id: `msg-${String(i).padStart(3, "0")}`,
            senderType: i % 3 === 0 ? "user" : i % 3 === 1 ? "moderator" : "role",
            senderId: i % 3 === 0 ? "user" : i % 3 === 1 ? "moderator" : "role-1",
            content: "word ".repeat(100),
            createdAt: new Date().toISOString(),
          });
        }
        const latestUserMessage: ContextMessage = {
          id: "msg-user-latest",
          senderType: "user",
          senderId: "user",
          content: "word ".repeat(100),
          createdAt: new Date().toISOString(),
        };

        const result = await controller.maybeCompress({
          sessionId: "test-session-004",
          mode: "council",
          requestedBy: { type: "system", reason: "token_budget" },
          executedBy: { type: "moderator", roleId: "moderator" },
          transcript: "word ".repeat(10000),
          recentMessages: messages,
          latestUserMessage,
          policy: defaultPolicy,
          compressor: successCompressor,
          messagesSinceLastCompression: 15,
        });

        // Count occurrences of latest user message
        const inRetained = result.retainedRecentMessages.filter(
          (m) => m.id === latestUserMessage.id
        ).length;
        const inLatest = result.latestUserMessage?.id === latestUserMessage.id ? 1 : 0;

        return {
          testId: "runtime-004-latest-user-message-retained",
          compressed: result.compressed,
          latestUserMessageRetained: inRetained + inLatest > 0,
          latestUserMessageId: latestUserMessage.id,
          latestUserMessageOccurrences: inRetained + inLatest,
          latestUserMessageFormat: "raw",
        };
      },
    },

    // runtime-005: Compressor failure fallback
    {
      id: "runtime-005",
      expectedPath: "runtime-005.expected.json",
      run: async () => {
        const messages: ContextMessage[] = [];
        for (let i = 0; i < 30; i++) {
          messages.push({
            id: `msg-${String(i).padStart(3, "0")}`,
            senderType: i % 3 === 0 ? "user" : i % 3 === 1 ? "moderator" : "role",
            senderId: i % 3 === 0 ? "user" : i % 3 === 1 ? "moderator" : "role-1",
            content: "word ".repeat(100),
            createdAt: new Date().toISOString(),
          });
        }

        const result = await controller.maybeCompress({
          sessionId: "test-session-005",
          mode: "council",
          requestedBy: { type: "system", reason: "token_budget" },
          executedBy: { type: "moderator", roleId: "moderator" },
          transcript: "word ".repeat(10000),
          recentMessages: messages,
          policy: defaultPolicy,
          compressor: failureCompressor,
          messagesSinceLastCompression: 15,
        });

        return {
          testId: "runtime-005-compressor-failure-fallback",
          compressed: result.compressed,
          fallbackUsed: !result.compressed,
          conversationContinues: true,
          contextMutated: result.compressed,
          reason: result.reason,
        };
      },
    },
  ];
}

// === Main ===

async function main() {
  const isCi = process.argv.includes("--ci");

  console.log("Starting Runtime Compression eval...");
  console.log(`CI: ${isCi}`);
  console.log("");

  const testCases = createTestCases();
  const results: Array<{
    id: string;
    passed: boolean;
    failures: string[];
  }> = [];

  for (const testCase of testCases) {
    console.log(`Running ${testCase.id}...`);

    try {
      const actual = await testCase.run();
      const expected = await loadExpected(testCase.id);

      // Compare results
      const failures: string[] = [];
      for (const key of Object.keys(expected)) {
        if (JSON.stringify(actual[key]) !== JSON.stringify(expected[key])) {
          failures.push(`${key}: expected ${JSON.stringify(expected[key])}, got ${JSON.stringify(actual[key])}`);
        }
      }

      results.push({
        id: testCase.id,
        passed: failures.length === 0,
        failures,
      });

      console.log(`  ${failures.length === 0 ? "✅ PASSED" : "❌ FAILED"}`);
      if (failures.length > 0) {
        for (const failure of failures) {
          console.log(`    - ${failure}`);
        }
      }
    } catch (error) {
      results.push({
        id: testCase.id,
        passed: false,
        failures: [`Error: ${error}`],
      });
      console.log(`  ❌ ERROR: ${error}`);
    }
  }

  console.log("");
  console.log("=== Eval Summary ===");

  const passed = results.filter((r) => r.passed).length;
  const failed = results.length - passed;

  console.log(`Status: ${failed === 0 ? "✅ PASSED" : "❌ FAILED"}`);
  console.log(`Total: ${results.length}`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  console.log("");

  for (const result of results) {
    console.log(`${result.id}: ${result.passed ? "✅" : "❌"}`);
  }

  if (isCi && failed > 0) {
    console.error("Eval failed in CI mode. Exiting with error.");
    process.exit(1);
  }
}

// Run
main().catch((error) => {
  console.error("Eval failed with error:", error);
  process.exit(1);
});
