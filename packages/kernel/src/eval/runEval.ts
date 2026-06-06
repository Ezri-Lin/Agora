import { writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import type { CouncilRoom, CouncilMessage, LLMConfig, RoleCard } from "@agora/shared";
import { generateId, nowISO } from "@agora/shared";
import { runCouncilRound, type CouncilRunResult } from "../council/CouncilRunner.js";
import { buildModeratorContextPack } from "../context/ModeratorContextPack.js";
import type { LLMProvider } from "../types/index.js";

export interface EvalInput {
  workspacePath: string;
  topic: string;
  docPaths: string[];
  providerConfig: LLMConfig;
  providerFactory: (config: LLMConfig) => LLMProvider;
  availableRoles: RoleCard[];
  /** How many eval rounds to run (default 1) */
  rounds?: number;
}

export interface EvalMetrics {
  moderator_understanding: number;  // 1-5, human scored
  skeptic_value: number;
  historian_value: number;
  product_strategy_value: number;
  synthesis_quality: number;
  note_seed_quality: number;
  overall_gain_vs_baseline: number; // 1-5
  notes: string;
}

export interface EvalResult {
  outputDir: string;
  baselineContent: string;
  sessionContent: string;
  comparisonTemplate: string;
  metricsTemplate: string;
}

/**
 * Run a single baseline call (single-assistant, full context, no multi-role).
 */
async function runBaseline(
  topic: string,
  modContext: string,
  llm: LLMProvider,
): Promise<string> {
  return llm.callModerator({
    roomId: "eval_baseline",
    task: "analyze",
    context: [
      modContext,
      "",
      "## Task",
      "",
      "You are a knowledgeable assistant. Answer the user's question comprehensively.",
      "Consider the reference documents provided.",
      "Provide analysis, potential concerns, historical context, and actionable recommendations.",
      "Respond in the same language as the user's message.",
      "",
      `Question: ${topic}`,
    ].join("\n"),
  });
}

/**
 * Build a room object for eval.
 */
function buildEvalRoom(topic: string, docPaths: string[]): CouncilRoom {
  return {
    id: `eval_${Date.now()}`,
    title: `[Eval] ${topic.slice(0, 60)}`,
    workspaceId: "eval",
    sourceRefs: docPaths.map((p) => ({
      type: "file" as const,
      path: p,
      label: p.split("/").pop() ?? p,
      importance: "primary" as const,
    })),
    participants: [],
    settings: {
      roleCount: 3,
      maxMessagesPerRoleBeforeUserReply: 2,
      allowAutoDocs: true,
      allowCrossExamination: true,
      generationMode: "multi_call_cached" as const,
      contextMode: "standard" as const,
    },
    visibility: "private" as const,
    createdAt: nowISO(),
    updatedAt: nowISO(),
  };
}

/**
 * Format council session as markdown.
 */
function formatSession(room: CouncilRoom, topic: string, result: CouncilRunResult): string {
  const lines = [
    `# Agora Council Session`,
    "",
    `**Topic:** ${topic}`,
    `**Date:** ${new Date().toISOString()}`,
    `**Room:** ${room.title}`,
    "",
    "---",
    "",
    "## Context Debug",
    "",
    `- Moderator: ${result.contextDebug.moderatorHasOverflow ? "OVERFLOW" : "Full context"}`,
    `- Moderator docs: ${result.contextDebug.moderatorIncludedDocCount}`,
    `- Moderator chars: ${result.contextDebug.moderatorTotalChars.toLocaleString()}`,
    `- Role mode: ${result.contextDebug.roleContextMode}`,
    `- Role truncated docs: ${result.contextDebug.roleTruncatedDocs}`,
    `- Role total chars: ${result.contextDebug.roleTotalChars.toLocaleString()}`,
    "",
    "---",
    "",
    "## Moderator Analysis",
    "",
    result.moderatorAnalysis,
    "",
    "---",
    "",
    "## Role Responses",
    "",
  ];

  for (const msg of result.roleMessages) {
    if (msg.status === "error") {
      lines.push(`### [ERROR] ${msg.targetRoleId}`);
      lines.push(`Code: ${msg.errorCode}`);
      lines.push(msg.errorMessage ?? msg.content);
    } else {
      lines.push(`### ${msg.senderId}`);
      lines.push(msg.content);
    }
    lines.push("");
  }

  lines.push("---", "", "## Moderator Summary", "", result.summary);
  return lines.join("\n");
}

/**
 * Run an evaluation: baseline + council + comparison template.
 */
export async function runEval(input: EvalInput): Promise<EvalResult> {
  const {
    workspacePath,
    topic,
    docPaths,
    providerConfig,
    providerFactory,
    availableRoles,
    rounds = 1,
  } = input;

  const llm = providerFactory(providerConfig);

  // Load doc contents
  const { readFile } = await import("node:fs/promises");
  const docContents = new Map<string, string>();
  for (const p of docPaths) {
    try {
      const content = await readFile(p, "utf-8");
      docContents.set(p, content);
    } catch {
      console.warn(`[eval] Could not read doc: ${p}`);
    }
  }

  const room = buildEvalRoom(topic, docPaths);
  const userMsg: CouncilMessage = {
    id: generateId("msg"),
    roomId: room.id,
    senderType: "user",
    senderId: "user",
    content: topic,
    createdAt: nowISO(),
  };

  // Build moderator context pack (same as council would)
  const modPack = buildModeratorContextPack(room, topic, [userMsg], docContents);

  // Run baseline
  console.log("[eval] Running baseline...");
  const baselineContent = await runBaseline(topic, modPack.sharedPrefix, llm);

  // Run council
  console.log("[eval] Running council...");
  const councilResult = await runCouncilRound(
    room,
    topic,
    userMsg,
    availableRoles,
    llm,
    [],
    docContents,
  );

  const sessionContent = formatSession(room, topic, councilResult);

  // Build comparison template
  const comparisonTemplate = [
    `# Comparison: Baseline vs Agora Council`,
    "",
    `**Topic:** ${topic}`,
    `**Date:** ${new Date().toISOString()}`,
    "",
    "---",
    "",
    "## Baseline (Single Assistant)",
    "",
    baselineContent,
    "",
    "---",
    "",
    "## Agora Council Session",
    "",
    sessionContent,
    "",
    "---",
    "",
    "## Manual Comparison",
    "",
    "### Points baseline missed",
    "<!-- Which perspectives did the council provide that the baseline didn't? -->",
    "",
    "### More valuable counter-arguments",
    "<!-- Did the skeptic/critic provide better pushback than baseline? -->",
    "",
    "### Actionable recommendations",
    "<!-- Which recommendations are actually actionable? -->",
    "",
    "### Filler / low-value content",
    "<!-- What felt like noise or generic filler? -->",
    "",
    "### Verdict",
    "<!-- Is the council worth the extra cost vs single assistant? -->",
    "",
  ].join("\n");

  // Build metrics template
  const metricsTemplate = JSON.stringify(
    {
      topic,
      date: new Date().toISOString(),
      provider: providerConfig.provider,
      model: providerConfig.model,
      docCount: docPaths.length,
      metrics: {
        moderator_understanding: 0,
        skeptic_value: 0,
        historian_value: 0,
        product_strategy_value: 0,
        synthesis_quality: 0,
        note_seed_quality: 0,
        overall_gain_vs_baseline: 0,
        notes: "",
      },
    },
    null,
    2,
  );

  // Write output files
  const outputDir = join(workspacePath, ".agora", "eval", `eval_${Date.now()}`);
  await mkdir(outputDir, { recursive: true });

  await writeFile(join(outputDir, "baseline.md"), baselineContent);
  await writeFile(join(outputDir, "agora-council-session.md"), sessionContent);
  await writeFile(join(outputDir, "comparison.md"), comparisonTemplate);
  await writeFile(join(outputDir, "metrics.json"), metricsTemplate);

  console.log(`[eval] Output written to: ${outputDir}`);

  return {
    outputDir,
    baselineContent,
    sessionContent,
    comparisonTemplate,
    metricsTemplate,
  };
}
