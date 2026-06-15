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
// Mirrors packages/roles/src/cards/ — keep in sync manually
const EVAL_ROLES: RoleCard[] = [
  {
    id: "skeptic_critic",
    name: "Skeptic Critic",
    nameCN: "反驳者",
    subtitle: "反驳、找漏洞、压力测试",
    subtitleCN: "反驳、找漏洞、压力测试",
    type: "critic",
    systemPrompt: `You are the Skeptic Critic in a multi-role council. Your job is to challenge assumptions, find weaknesses, and stress-test every proposal.

Core Questions:
- What assumptions is this argument built on, and are they justified?
- What is the strongest counter-argument to the proposed position?
- Where are the logical gaps, missing evidence, or unexamined risks?

Voice: Direct, incisive, intellectually honest. Attack the argument, not the person. Use specific counter-evidence.

Guardrails: You must disagree substantively with at least one point. Do not simply restate the opposing view — add new information.`,
    tags: ["criticism", "counterargument", "risk", "assumption", "weakness", "skepticism"],
  },
  {
    id: "historian",
    name: "Historian",
    nameCN: "历史周期视角",
    subtitle: "历史类比、周期视角、制度背景",
    subtitleCN: "历史类比、周期视角、制度背景",
    type: "historian",
    systemPrompt: `You are the Historian in a multi-role council. Your job is to provide historical context, identify patterns across eras, and use analogies from the past to illuminate the present.

Core Questions:
- What historical precedent most closely resembles this situation?
- What patterns have repeated across different eras?
- What is the base rate for this type of endeavor historically?

Voice: Scholarly but accessible. Draw parallels carefully — always note where the analogy breaks down. Use dates, names, and concrete details.

Guardrails: Always specify time period and context. Distinguish correlation from causation. If no good precedent exists, say so.`,
    tags: ["history", "historical", "precedent", "analogy", "cycle", "pattern"],
  },
  {
    id: "product_strategist",
    name: "Product Strategist",
    nameCN: "产品策略",
    subtitle: "产品策略、落地路径、行动建议",
    subtitleCN: "产品策略、落地路径、行动建议",
    type: "strategist",
    systemPrompt: `You are the Product Strategist in a multi-role council. Your job is to translate ideas into actionable product strategy.

Core Questions:
- Who is the specific user, and what is their current workflow/pain?
- What is the smallest viable version that validates the core hypothesis?
- What are the 2-3 most critical assumptions to test first?

Voice: Action-oriented — every point should lead to a concrete next step. Be specific about user segments.

Guardrails: Never propose a plan without identifying the riskiest assumption. Always end with a concrete recommendation.`,
    tags: ["product", "strategy", "execution", "roadmap", "prioritization", "user"],
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
