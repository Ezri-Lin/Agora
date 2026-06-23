/**
 * run-tool-runtime-eval — Tool Runtime eval 入口
 *
 * 用法：
 *   tsx eval/run-tool-runtime-eval.ts
 *   tsx eval/run-tool-runtime-eval.ts --ci
 */

import { resolve, join } from "path";
import { readFile, rm } from "fs/promises";
import { existsSync } from "fs";
import { LocalToolRuntime } from "../packages/kernel/src/tools/LocalToolRuntime.js";
import type {
  ToolManifest,
  ToolExecutor,
  ToolRequester,
} from "../packages/kernel/src/tools/ToolRuntimeTypes.js";

// === Paths ===

const ROOT_DIR = resolve(import.meta.dirname, "..");
const INPUTS_DIR = join(ROOT_DIR, "eval", "golden-inputs", "tool-runtime");
const EXPECTED_DIR = join(ROOT_DIR, "eval", "expected", "tool-runtime");
const TEST_WORKSPACE = join(ROOT_DIR, ".test-tool-runtime");

// === Parse Args ===

function parseArgs(): { isCi: boolean } {
  const args = process.argv.slice(2);
  let isCi = false;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--ci") {
      isCi = true;
    }
  }

  return { isCi };
}

// === Test Cases ===

interface TestCase {
  id: string;
  run: () => Promise<Record<string, unknown>>;
}

async function loadInput(testId: string): Promise<Record<string, unknown>> {
  const path = join(INPUTS_DIR, `${testId}.json`);
  const content = await readFile(path, "utf-8");
  return JSON.parse(content);
}

async function loadExpected(testId: string): Promise<Record<string, unknown>> {
  const path = join(EXPECTED_DIR, `${testId}.expected.json`);
  const content = await readFile(path, "utf-8");
  return JSON.parse(content);
}

function createTestCases(): TestCase[] {
  return [
    {
      id: "tool-001",
      run: async () => {
        const input = await loadInput("tool-001-read-only-allowed");
        const toolData = input.tool as { manifest: ToolManifest; executor: string };
        const invocation = input.invocation as {
          toolName: string;
          args: unknown;
          reason: string;
          requestedBy: ToolRequester;
        };

        const runtime = new LocalToolRuntime(TEST_WORKSPACE);

        // Register tool
        const executor = new Function(`return ${toolData.executor}`)() as ToolExecutor;
        runtime.register(toolData.manifest, executor);

        // Create plan and invoke
        const plan = runtime.createPlan(invocation);
        const result = await runtime.invoke(plan);

        // Get audit log
        const auditLog = await runtime.getAuditLog(plan.id);

        return {
          testId: "tool-001",
          status: result.status,
          output: result.output,
          auditEventCount: auditLog.length,
          auditStatuses: auditLog.map((e) => e.status),
        };
      },
    },
    {
      id: "tool-002",
      run: async () => {
        const input = await loadInput("tool-002-unknown-tool-denied");
        const invocation = input.invocation as {
          toolName: string;
          args: unknown;
          reason: string;
          requestedBy: ToolRequester;
        };

        const runtime = new LocalToolRuntime(TEST_WORKSPACE);

        // Don't register any tool (unknown tool)

        // Create plan and invoke
        const plan = runtime.createPlan(invocation);
        const result = await runtime.invoke(plan);

        // Get audit log
        const auditLog = await runtime.getAuditLog(plan.id);

        return {
          testId: "tool-002",
          status: result.status,
          error: result.error,
          auditEventCount: auditLog.length,
          auditStatuses: auditLog.map((e) => e.status),
        };
      },
    },
    {
      id: "tool-003",
      run: async () => {
        const input = await loadInput("tool-003-command-denied");
        const toolData = input.tool as { manifest: ToolManifest; executor: string };
        const invocation = input.invocation as {
          toolName: string;
          args: unknown;
          reason: string;
          requestedBy: ToolRequester;
        };

        const runtime = new LocalToolRuntime(TEST_WORKSPACE);

        // Register tool
        const executor = new Function(`return ${toolData.executor}`)() as ToolExecutor;
        runtime.register(toolData.manifest, executor);

        // Create plan and invoke
        const plan = runtime.createPlan(invocation);
        const result = await runtime.invoke(plan);

        // Get audit log
        const auditLog = await runtime.getAuditLog(plan.id);

        return {
          testId: "tool-003",
          status: result.status,
          error: result.error,
          auditEventCount: auditLog.length,
          auditStatuses: auditLog.map((e) => e.status),
        };
      },
    },
    {
      id: "tool-004",
      run: async () => {
        const input = await loadInput("tool-004-write-requires-approval");
        const toolData = input.tool as { manifest: ToolManifest; executor: string };
        const invocation = input.invocation as {
          toolName: string;
          args: unknown;
          reason: string;
          requestedBy: ToolRequester;
        };

        const runtime = new LocalToolRuntime(TEST_WORKSPACE);

        // Register tool
        const executor = new Function(`return ${toolData.executor}`)() as ToolExecutor;
        runtime.register(toolData.manifest, executor);

        // Create plan and invoke
        const plan = runtime.createPlan(invocation);
        const result = await runtime.invoke(plan);

        // Get audit log
        const auditLog = await runtime.getAuditLog(plan.id);

        return {
          testId: "tool-004",
          status: result.status,
          error: result.error,
          auditEventCount: auditLog.length,
          auditStatuses: auditLog.map((e) => e.status),
        };
      },
    },
    {
      id: "tool-005",
      run: async () => {
        const input = await loadInput("tool-005-audit-log-written");
        const toolData = input.tool as { manifest: ToolManifest; executor: string };
        const invocation = input.invocation as {
          toolName: string;
          args: unknown;
          reason: string;
          requestedBy: ToolRequester;
        };

        const runtime = new LocalToolRuntime(TEST_WORKSPACE);

        // Register tool
        const executor = new Function(`return ${toolData.executor}`)() as ToolExecutor;
        runtime.register(toolData.manifest, executor);

        // Create plan and invoke
        const plan = runtime.createPlan(invocation);
        const result = await runtime.invoke(plan);

        // Get audit log
        const auditLog = await runtime.getAuditLog(plan.id);

        return {
          testId: "tool-005",
          status: result.status,
          output: result.output,
          auditEventCount: auditLog.length,
          auditStatuses: auditLog.map((e) => e.status),
        };
      },
    },
  ];
}

// === Main ===

async function main() {
  const { isCi } = parseArgs();

  console.log("Starting Tool Runtime eval...");
  console.log(`CI: ${isCi}`);
  console.log("");

  // Clean up test workspace
  if (existsSync(TEST_WORKSPACE)) {
    await rm(TEST_WORKSPACE, { recursive: true });
  }

  const testCases = createTestCases();
  const results: Array<{
    id: string;
    passed: boolean;
    failures: string[];
  }> = [];

  for (const testCase of testCases) {
    console.log(`Running ${testCase.id}...`);

    // Clean up test workspace before each test
    if (existsSync(TEST_WORKSPACE)) {
      await rm(TEST_WORKSPACE, { recursive: true });
    }

    try {
      const actual = await testCase.run();
      const expected = await loadExpected(testCase.id);

      // Compare results
      const failures: string[] = [];
      for (const key of Object.keys(expected)) {
        if (key === "testId" || key === "description") continue;
        if (JSON.stringify(actual[key]) !== JSON.stringify(expected[key])) {
          failures.push(
            `${key}: expected ${JSON.stringify(expected[key])}, got ${JSON.stringify(actual[key])}`
          );
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

  // Clean up test workspace
  if (existsSync(TEST_WORKSPACE)) {
    await rm(TEST_WORKSPACE, { recursive: true });
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
