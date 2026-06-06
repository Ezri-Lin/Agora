#!/usr/bin/env node

/**
 * Agora Eval CLI
 *
 * Usage:
 *   npx tsx packages/kernel/src/eval/cli.ts \
 *     --workspace /path/to/workspace \
 *     --topic "Your question here" \
 *     --docs /path/to/doc1.md /path/to/doc2.md \
 *     --provider openai_compatible \
 *     --model gpt-4o-mini \
 *     --api-key-env OPENAI_API_KEY \
 *     --base-url https://api.openai.com/v1
 */

import { runEval } from "./runEval.js";
import { OpenAICompatibleProvider } from "../llm/OpenAICompatibleProvider.js";
import { MockMultiCallProvider } from "../llm/MockMultiCallProvider.js";
import type { LLMConfig, LLMProviderKind, RoleCard } from "@agora/shared";
import type { LLMProvider } from "../types/index.js";

// Default roles for eval (inline to avoid @agora/roles dependency)
const EVAL_ROLES: RoleCard[] = [
  {
    id: "skeptic_critic",
    name: "Skeptic Critic",
    nameCN: "反驳者",
    subtitle: "质疑前提、找反例、压力测试",
    type: "critic",
    systemPrompt: "You are a rigorous skeptic. Challenge assumptions, find counter-examples, and stress-test ideas.",
    tags: ["critic", "risk"],
  },
  {
    id: "historian",
    name: "Historian",
    nameCN: "历史视角",
    subtitle: "周期视角与历史先例",
    type: "historian",
    systemPrompt: "You are a historian. Provide historical parallels, cyclical patterns, and lessons from the past.",
    tags: ["history", "patterns"],
  },
  {
    id: "product_strategist",
    name: "Product Strategist",
    nameCN: "产品策略",
    subtitle: "落地路径与行动建议",
    type: "strategist",
    systemPrompt: "You are a product strategist. Focus on actionable recommendations, go-to-market, and execution.",
    tags: ["strategy", "action"],
  },
];

function parseArgs(argv: string[]) {
  const args: Record<string, string | string[]> = {};
  let i = 2;
  while (i < argv.length) {
    const arg = argv[i];
    if (arg === "--docs") {
      const docs: string[] = [];
      i++;
      while (i < argv.length && !argv[i].startsWith("--")) {
        docs.push(argv[i]!);
        i++;
      }
      args.docs = docs;
    } else if (arg.startsWith("--") && i + 1 < argv.length) {
      args[arg.slice(2)] = argv[i + 1]!;
      i += 2;
    } else {
      i++;
    }
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv);

  const workspace = args.workspace as string;
  const topic = args.topic as string;
  const docs = (args.docs as string[]) ?? [];
  const providerKind = (args.provider as string) ?? "mock";
  const model = (args.model as string) ?? "mock";
  const apiKeyEnv = (args["api-key-env"] as string) ?? "OPENAI_API_KEY";
  const baseUrl = args["base-url"] as string | undefined;

  if (!workspace || !topic) {
    console.error("Usage: cli.ts --workspace <path> --topic <question> [--docs file1.md file2.md]");
    process.exit(1);
  }

  const config: LLMConfig = {
    provider: providerKind as LLMProviderKind,
    model,
    apiKeyEnv,
    baseUrl,
  };

  const providerFactory = (cfg: LLMConfig): LLMProvider => {
    if (cfg.provider === "mock") return new MockMultiCallProvider();
    return new OpenAICompatibleProvider(cfg);
  };

  console.log(`[eval] Provider: ${config.provider} / ${config.model}`);
  console.log(`[eval] Topic: ${topic}`);
  console.log(`[eval] Docs: ${docs.length}`);

  const result = await runEval({
    workspacePath: workspace,
    topic,
    docPaths: docs,
    providerConfig: config,
    providerFactory,
    availableRoles: EVAL_ROLES,
  });

  console.log(`\n[eval] Done! Output: ${result.outputDir}`);
  console.log("[eval] Files:");
  console.log("  - baseline.md");
  console.log("  - agora-council-session.md");
  console.log("  - comparison.md");
  console.log("  - metrics.json");
}

main().catch((err) => {
  console.error("[eval] Fatal:", err);
  process.exit(1);
});
