/**
 * EvalReport — 生成评估报告
 */

import { writeFile, mkdir } from "fs/promises";
import { join, dirname } from "path";
import type { EvalRunnerResult, EvalCaseResult, EvalAggregateResult } from "./EvalRunner.js";

export interface EvalReportOptions {
  outputDir: string;
  format: "json" | "markdown" | "both";
  ci?: boolean;
}

export async function generateReport(
  result: EvalRunnerResult,
  options: EvalReportOptions
): Promise<void> {
  const { outputDir, format, ci } = options;

  // Ensure output directory exists
  await mkdir(outputDir, { recursive: true });

  // Generate JSON report
  if (format === "json" || format === "both") {
    const jsonPath = join(outputDir, "latest.json");
    await writeJsonReport(result, jsonPath);
  }

  // Generate Markdown report
  if (format === "markdown" || format === "both") {
    const mdPath = join(outputDir, "latest.md");
    await writeMarkdownReport(result, mdPath);
  }

  // CI mode: exit with error if failed
  if (ci && !result.passed) {
    console.error("Eval failed. See report for details.");
    process.exit(1);
  }
}

async function writeJsonReport(
  result: EvalRunnerResult,
  outputPath: string
): Promise<void> {
  const report = {
    timestamp: new Date().toISOString(),
    passed: result.passed,
    aggregate: result.aggregate,
    cases: result.cases,
  };

  await writeFile(outputPath, JSON.stringify(report, null, 2), "utf-8");
  console.log(`JSON report written to ${outputPath}`);
}

async function writeMarkdownReport(
  result: EvalRunnerResult,
  outputPath: string
): Promise<void> {
  const lines: string[] = [];

  // Header
  lines.push("# Context Substrate Eval Report");
  lines.push("");
  lines.push(`**Timestamp**: ${new Date().toISOString()}`);
  lines.push(`**Status**: ${result.passed ? "✅ PASSED" : "❌ FAILED"}`);
  lines.push("");

  // Aggregate
  lines.push("## Aggregate Results");
  lines.push("");
  lines.push(`| Metric | Value | Threshold | Status |`);
  lines.push(`|--------|-------|-----------|--------|`);
  lines.push(`| Decision Retention | ${formatPercent(result.aggregate.avgDecisionRetention)} | 95% | ${result.aggregate.avgDecisionRetention >= 0.95 ? "✅" : "❌"} |`);
  lines.push(`| Action Item Retention | ${formatPercent(result.aggregate.avgActionItemRetention)} | 90% | ${result.aggregate.avgActionItemRetention >= 0.90 ? "✅" : "❌"} |`);
  lines.push(`| Open Question Retention | ${formatPercent(result.aggregate.avgOpenQuestionRetention)} | 90% | ${result.aggregate.avgOpenQuestionRetention >= 0.90 ? "✅" : "❌"} |`);
  lines.push(`| Role Stance Consistency | ${formatPercent(result.aggregate.avgRoleStanceConsistency)} | 85% | ${result.aggregate.avgRoleStanceConsistency >= 0.85 ? "✅" : "❌"} |`);

  // Token reduction - show N/A if not applicable
  const tokenReductionApplicable = result.cases.some((c) => c.tokenReductionApplicable);
  if (tokenReductionApplicable) {
    lines.push(`| Token Reduction | ${formatPercent(result.aggregate.avgTokenReduction)} | 50% | ${result.aggregate.avgTokenReduction >= 0.50 ? "✅" : "❌"} |`);
  } else {
    lines.push(`| Token Reduction | N/A | 50% | ⏭️ skipped |`);
  }

  lines.push(`| Reference Coverage | ${formatPercent(result.aggregate.avgReferenceCoverage)} | 100% | ${result.aggregate.avgReferenceCoverage >= 1.0 ? "✅" : "❌"} |`);
  lines.push("");

  // Cases
  lines.push("## Case Results");
  lines.push("");

  for (const caseResult of result.cases) {
    lines.push(`### ${caseResult.id}`);
    lines.push("");
    lines.push(`**Status**: ${caseResult.passed ? "✅ PASSED" : "❌ FAILED"}`);
    lines.push(`**Contract**: ${caseResult.contractPassed ? "✅" : "❌"}`);
    lines.push(`**Compression**: ${caseResult.compressionPassed ? "✅" : "❌"}`);
    lines.push("");

    if (caseResult.failures.length > 0) {
      lines.push("**Failures**:");
      lines.push("");
      for (const failure of caseResult.failures) {
        lines.push(`- ${failure.message}`);
      }
      lines.push("");
    }

    lines.push("**Metrics**:");
    lines.push("");
    lines.push(`| Metric | Value |`);
    lines.push(`|--------|-------|`);
    lines.push(`| Decision Retention | ${formatPercent(caseResult.metrics.compressionDecisionRetentionRate)} |`);
    lines.push(`| Action Item Retention | ${formatPercent(caseResult.metrics.actionItemRetentionRate)} |`);
    lines.push(`| Open Question Retention | ${formatPercent(caseResult.metrics.openQuestionRetentionRate)} |`);
    lines.push(`| Role Stance Consistency | ${formatPercent(caseResult.metrics.roleStanceConsistencyScore)} |`);

    // Token reduction - show N/A if not applicable
    if (caseResult.tokenReductionApplicable) {
      lines.push(`| Token Reduction | ${formatPercent(caseResult.metrics.summaryTokenReductionRatio)} |`);
    } else {
      const reason = caseResult.metrics.tokenReductionReason || "Not applicable";
      lines.push(`| Token Reduction | N/A (${reason}) |`);
    }

    lines.push(`| Reference Coverage | ${formatPercent(caseResult.metrics.rawTranscriptReferenceCoverage)} |`);
    lines.push("");
  }

  // Summary
  lines.push("## Summary");
  lines.push("");
  lines.push(`- **Total Cases**: ${result.aggregate.totalCases}`);
  lines.push(`- **Passed Cases**: ${result.aggregate.passedCases}`);
  lines.push(`- **Failed Cases**: ${result.aggregate.failedCases}`);
  lines.push("");

  await writeFile(outputPath, lines.join("\n"), "utf-8");
  console.log(`Markdown report written to ${outputPath}`);
}

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

export async function loadLatestReport(
  reportDir: string
): Promise<EvalRunnerResult | null> {
  try {
    const { readFile } = await import("fs/promises");
    const jsonPath = join(reportDir, "latest.json");
    const content = await readFile(jsonPath, "utf-8");
    return JSON.parse(content);
  } catch {
    return null;
  }
}
