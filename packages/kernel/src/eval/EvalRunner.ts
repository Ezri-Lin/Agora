/**
 * EvalRunner — 评估 Context Compressor 的质量
 *
 * 读取 golden transcript + expected output，计算 metrics，生成 report
 */

import type { ConversationSummaryV1 } from "../context/ConversationSummary.js";

// === Core Interfaces ===

export interface GoldenEvalCase {
  id: string;
  transcriptPath: string;
  expectedPath: string;
}

export type EvalMode = "contract" | "compression";

export interface EvalRunnerInput {
  cases: GoldenEvalCase[];
  compressor: ConversationCompressor;
  mode?: EvalMode;
}

export interface ConversationCompressor {
  compress(input: {
    sessionId: string;
    transcript: string;
  }): Promise<ConversationSummaryV1>;
}

// Re-export for compatibility
export type { ContextCompressor, ContextCompressionInput, ContextCompressionResult, CompressionTrace } from "../context/ContextCompressor.js";

export interface EvalRunnerResult {
  cases: EvalCaseResult[];
  aggregate: EvalAggregateResult;
  passed: boolean;
}

export interface EvalCaseResult {
  id: string;
  contractPassed: boolean;
  compressionPassed: boolean;
  passed: boolean;
  metrics: ContextEvalMetrics;
  failures: EvalFailure[];
  tokenReductionApplicable: boolean;
}

export interface ContextEvalMetrics {
  compressionDecisionRetentionRate: number;
  actionItemRetentionRate: number;
  openQuestionRetentionRate: number;
  roleStanceConsistencyScore: number;
  summaryTokenReductionRatio: number;
  rawTranscriptReferenceCoverage: number;
  tokenReductionApplicable: boolean;
  tokenReductionReason?: string;
}

export interface EvalAggregateResult {
  avgDecisionRetention: number;
  avgActionItemRetention: number;
  avgOpenQuestionRetention: number;
  avgRoleStanceConsistency: number;
  avgTokenReduction: number;
  avgReferenceCoverage: number;
  totalCases: number;
  passedCases: number;
  failedCases: number;
}

export interface EvalFailure {
  metric: string;
  expected: string | number;
  actual: string | number;
  message: string;
}

// === Thresholds ===

export const EVAL_THRESHOLDS = {
  compressionDecisionRetentionRate: 0.95,
  actionItemRetentionRate: 0.90,
  openQuestionRetentionRate: 0.90,
  roleStanceConsistencyScore: 0.85,
  summaryTokenReductionRatio: 0.50,
  rawTranscriptReferenceCoverage: 1.0,
} as const;

export interface TokenReductionPolicy {
  minTranscriptTokensForCompressionGate: number; // e.g. 800
  requiredReductionRatio: number;               // e.g. 0.5
}

export const DEFAULT_TOKEN_REDUCTION_POLICY: TokenReductionPolicy = {
  minTranscriptTokensForCompressionGate: 800,
  requiredReductionRatio: 0.5,
};

// === EvalRunner ===

export async function runEval(input: EvalRunnerInput): Promise<EvalRunnerResult> {
  const { cases, compressor, mode = "contract" } = input;
  const caseResults: EvalCaseResult[] = [];

  for (const evalCase of cases) {
    const result = await runSingleCase(evalCase, compressor, mode);
    caseResults.push(result);
  }

  const aggregate = computeAggregate(caseResults);
  const passed = aggregate.failedCases === 0;

  return { cases: caseResults, aggregate, passed };
}

async function runSingleCase(
  evalCase: GoldenEvalCase,
  compressor: ConversationCompressor,
  mode: EvalMode
): Promise<EvalCaseResult> {
  // 1. Load transcript
  const transcript = await loadTranscript(evalCase.transcriptPath);

  // 2. Load expected output
  const expected = await loadExpectedOutput(evalCase.expectedPath);

  // 3. Run compressor
  const produced = await compressor.compress({
    sessionId: evalCase.id,
    transcript,
  });

  // 4. Calculate metrics
  const metrics = calculateMetrics(produced, expected, transcript);

  // 5. Check thresholds
  const { failures, contractFailures, compressionFailures } = checkThresholds(metrics, mode);

  return {
    id: evalCase.id,
    contractPassed: contractFailures.length === 0,
    compressionPassed: compressionFailures.length === 0,
    passed: failures.length === 0,
    metrics,
    failures,
    tokenReductionApplicable: metrics.tokenReductionApplicable,
  };
}

// === Metrics Calculation ===

function calculateMetrics(
  produced: ConversationSummaryV1,
  expected: ConversationSummaryV1,
  transcript: string
): ContextEvalMetrics {
  const tokenReduction = calculateTokenReduction(produced, transcript);

  return {
    compressionDecisionRetentionRate: calculateDecisionRetention(produced, expected),
    actionItemRetentionRate: calculateActionItemRetention(produced, expected),
    openQuestionRetentionRate: calculateOpenQuestionRetention(produced, expected),
    roleStanceConsistencyScore: calculateRoleStanceConsistency(produced, expected),
    summaryTokenReductionRatio: tokenReduction.value,
    rawTranscriptReferenceCoverage: calculateReferenceCoverage(produced, expected),
    tokenReductionApplicable: tokenReduction.applicable,
    tokenReductionReason: tokenReduction.reason,
  };
}

function calculateDecisionRetention(
  produced: ConversationSummaryV1,
  expected: ConversationSummaryV1
): number {
  if (expected.decisions.length === 0) return 1.0;

  let matched = 0;
  for (const expectedDecision of expected.decisions) {
    const found = produced.decisions.some((d) =>
      matchDecision(d, expectedDecision)
    );
    if (found) matched++;
  }

  return matched / expected.decisions.length;
}

function matchDecision(
  produced: { statement: string; status: string },
  expected: { statement: string; status: string }
): boolean {
  // v0.1: deterministic match
  const normalizedProduced = normalizeText(produced.statement);
  const normalizedExpected = normalizeText(expected.statement);

  return (
    normalizedProduced.includes(normalizedExpected) ||
    normalizedExpected.includes(normalizedProduced)
  ) && produced.status === expected.status;
}

function calculateActionItemRetention(
  produced: ConversationSummaryV1,
  expected: ConversationSummaryV1
): number {
  if (expected.actionItems.length === 0) return 1.0;

  let matched = 0;
  for (const expectedItem of expected.actionItems) {
    const found = produced.actionItems.some((item) =>
      matchActionItem(item, expectedItem)
    );
    if (found) matched++;
  }

  return matched / expected.actionItems.length;
}

function matchActionItem(
  produced: { text: string; status: string },
  expected: { text: string; status: string }
): boolean {
  const normalizedProduced = normalizeText(produced.text);
  const normalizedExpected = normalizeText(expected.text);

  return normalizedProduced.includes(normalizedExpected) ||
    normalizedExpected.includes(normalizedProduced);
}

function calculateOpenQuestionRetention(
  produced: ConversationSummaryV1,
  expected: ConversationSummaryV1
): number {
  if (expected.openQuestions.length === 0) return 1.0;

  // Blocking questions MUST be retained
  const blockingQuestions = expected.openQuestions.filter((q) => q.blocking);
  const nonBlockingQuestions = expected.openQuestions.filter((q) => !q.blocking);

  let blockingMatched = 0;
  for (const question of blockingQuestions) {
    const found = produced.openQuestions.some((q) =>
      matchQuestion(q, question)
    );
    if (found) blockingMatched++;
  }

  let nonBlockingMatched = 0;
  for (const question of nonBlockingQuestions) {
    const found = produced.openQuestions.some((q) =>
      matchQuestion(q, question)
    );
    if (found) nonBlockingMatched++;
  }

  // Blocking questions must be 100% retained
  if (blockingQuestions.length > 0 && blockingMatched < blockingQuestions.length) {
    return blockingMatched / expected.openQuestions.length;
  }

  return (blockingMatched + nonBlockingMatched) / expected.openQuestions.length;
}

function matchQuestion(
  produced: { question: string; blocking: boolean },
  expected: { question: string; blocking: boolean }
): boolean {
  const normalizedProduced = normalizeText(produced.question);
  const normalizedExpected = normalizeText(expected.question);

  return (
    normalizedProduced.includes(normalizedExpected) ||
    normalizedExpected.includes(normalizedProduced)
  ) && produced.blocking === expected.blocking;
}

function calculateRoleStanceConsistency(
  produced: ConversationSummaryV1,
  expected: ConversationSummaryV1
): number {
  if (expected.roleStances.length === 0) return 1.0;

  let totalScore = 0;
  for (const expectedStance of expected.roleStances) {
    const producedStance = produced.roleStances.find(
      (s) => s.roleId === expectedStance.roleId
    );

    if (!producedStance) {
      totalScore += 0;
      continue;
    }

    // v0.1: simple keyword match
    const score = calculateStanceMatchScore(producedStance, expectedStance);
    totalScore += score;
  }

  return totalScore / expected.roleStances.length;
}

function calculateStanceMatchScore(
  produced: { stance: string; unresolvedConcerns: string[] },
  expected: { stance: string; unresolvedConcerns: string[] }
): number {
  const normalizedProduced = normalizeText(produced.stance);
  const normalizedExpected = normalizeText(expected.stance);

  // Check if stance is consistent
  const stanceConsistent =
    normalizedProduced.includes(normalizedExpected) ||
    normalizedExpected.includes(normalizedProduced);

  // Check if unresolved concerns are preserved
  let concernsPreserved = 0;
  for (const concern of expected.unresolvedConcerns) {
    const found = produced.unresolvedConcerns.some((c) =>
      normalizeText(c).includes(normalizeText(concern))
    );
    if (found) concernsPreserved++;
  }

  const concernScore = expected.unresolvedConcerns.length > 0
    ? concernsPreserved / expected.unresolvedConcerns.length
    : 1.0;

  return stanceConsistent ? (0.7 + 0.3 * concernScore) : concernScore * 0.5;
}

interface TokenReductionResult {
  value: number;
  applicable: boolean;
  reason?: string;
}

function calculateTokenReduction(
  produced: ConversationSummaryV1,
  transcript: string
): TokenReductionResult {
  // Calculate token reduction ratio
  // summaryTokenReductionRatio = 1 - producedSummaryTokenCount / originalTranscriptTokenCount
  const transcriptTokens = estimateTokens(transcript);
  const summaryTokens = estimateSummaryTokens(produced);

  if (transcriptTokens === 0) {
    return {
      value: 1.0,
      applicable: false,
      reason: "Empty transcript",
    };
  }

  const ratio = 1 - (summaryTokens / transcriptTokens);

  // Check if transcript is below compression gate threshold
  if (transcriptTokens < DEFAULT_TOKEN_REDUCTION_POLICY.minTranscriptTokensForCompressionGate) {
    return {
      value: Math.max(-10, Math.min(1, ratio)),
      applicable: false,
      reason: `Transcript below ${DEFAULT_TOKEN_REDUCTION_POLICY.minTranscriptTokensForCompressionGate}-token compression gate`,
    };
  }

  return {
    value: Math.max(-10, Math.min(1, ratio)),
    applicable: true,
  };
}

function calculateReferenceCoverage(
  produced: ConversationSummaryV1,
  expected: ConversationSummaryV1
): number {
  if (expected.rawTranscriptRefs.length === 0) return 1.0;

  let matched = 0;
  for (const ref of expected.rawTranscriptRefs) {
    const found = produced.rawTranscriptRefs.some((r) => r === ref);
    if (found) matched++;
  }

  return matched / expected.rawTranscriptRefs.length;
}

// === Threshold Checking ===

interface ThresholdCheckResult {
  failures: EvalFailure[];
  contractFailures: EvalFailure[];
  compressionFailures: EvalFailure[];
}

function checkThresholds(metrics: ContextEvalMetrics, mode: EvalMode): ThresholdCheckResult {
  const contractFailures: EvalFailure[] = [];
  const compressionFailures: EvalFailure[] = [];

  // Contract metrics (always checked)
  if (metrics.compressionDecisionRetentionRate < EVAL_THRESHOLDS.compressionDecisionRetentionRate) {
    const failure: EvalFailure = {
      metric: "compressionDecisionRetentionRate",
      expected: EVAL_THRESHOLDS.compressionDecisionRetentionRate,
      actual: metrics.compressionDecisionRetentionRate,
      message: `Decision retention rate ${metrics.compressionDecisionRetentionRate.toFixed(2)} below threshold ${EVAL_THRESHOLDS.compressionDecisionRetentionRate}`,
    };
    contractFailures.push(failure);
  }

  if (metrics.actionItemRetentionRate < EVAL_THRESHOLDS.actionItemRetentionRate) {
    const failure: EvalFailure = {
      metric: "actionItemRetentionRate",
      expected: EVAL_THRESHOLDS.actionItemRetentionRate,
      actual: metrics.actionItemRetentionRate,
      message: `Action item retention rate ${metrics.actionItemRetentionRate.toFixed(2)} below threshold ${EVAL_THRESHOLDS.actionItemRetentionRate}`,
    };
    contractFailures.push(failure);
  }

  if (metrics.openQuestionRetentionRate < EVAL_THRESHOLDS.openQuestionRetentionRate) {
    const failure: EvalFailure = {
      metric: "openQuestionRetentionRate",
      expected: EVAL_THRESHOLDS.openQuestionRetentionRate,
      actual: metrics.openQuestionRetentionRate,
      message: `Open question retention rate ${metrics.openQuestionRetentionRate.toFixed(2)} below threshold ${EVAL_THRESHOLDS.openQuestionRetentionRate}`,
    };
    contractFailures.push(failure);
  }

  if (metrics.roleStanceConsistencyScore < EVAL_THRESHOLDS.roleStanceConsistencyScore) {
    const failure: EvalFailure = {
      metric: "roleStanceConsistencyScore",
      expected: EVAL_THRESHOLDS.roleStanceConsistencyScore,
      actual: metrics.roleStanceConsistencyScore,
      message: `Role stance consistency score ${metrics.roleStanceConsistencyScore.toFixed(2)} below threshold ${EVAL_THRESHOLDS.roleStanceConsistencyScore}`,
    };
    contractFailures.push(failure);
  }

  if (metrics.rawTranscriptReferenceCoverage < EVAL_THRESHOLDS.rawTranscriptReferenceCoverage) {
    const failure: EvalFailure = {
      metric: "rawTranscriptReferenceCoverage",
      expected: EVAL_THRESHOLDS.rawTranscriptReferenceCoverage,
      actual: metrics.rawTranscriptReferenceCoverage,
      message: `Reference coverage ${metrics.rawTranscriptReferenceCoverage.toFixed(2)} below threshold ${EVAL_THRESHOLDS.rawTranscriptReferenceCoverage}`,
    };
    contractFailures.push(failure);
  }

  // Compression metrics (only checked in compression mode)
  if (mode === "compression" && metrics.tokenReductionApplicable) {
    if (metrics.summaryTokenReductionRatio < EVAL_THRESHOLDS.summaryTokenReductionRatio) {
      const failure: EvalFailure = {
        metric: "summaryTokenReductionRatio",
        expected: EVAL_THRESHOLDS.summaryTokenReductionRatio,
        actual: metrics.summaryTokenReductionRatio,
        message: `Token reduction ratio ${metrics.summaryTokenReductionRatio.toFixed(2)} below threshold ${EVAL_THRESHOLDS.summaryTokenReductionRatio}`,
      };
      compressionFailures.push(failure);
    }
  }

  return {
    failures: [...contractFailures, ...compressionFailures],
    contractFailures,
    compressionFailures,
  };
}

// === Aggregate ===

function computeAggregate(results: EvalCaseResult[]): EvalAggregateResult {
  const totalCases = results.length;
  const passedCases = results.filter((r) => r.passed).length;
  const failedCases = totalCases - passedCases;

  const avg = (fn: (r: EvalCaseResult) => number) =>
    results.reduce((sum, r) => sum + fn(r), 0) / totalCases;

  // Only average token reduction for applicable cases
  const applicableCases = results.filter((r) => r.tokenReductionApplicable);
  const avgTokenReduction = applicableCases.length > 0
    ? applicableCases.reduce((sum, r) => sum + r.metrics.summaryTokenReductionRatio, 0) / applicableCases.length
    : 0;

  return {
    avgDecisionRetention: avg((r) => r.metrics.compressionDecisionRetentionRate),
    avgActionItemRetention: avg((r) => r.metrics.actionItemRetentionRate),
    avgOpenQuestionRetention: avg((r) => r.metrics.openQuestionRetentionRate),
    avgRoleStanceConsistency: avg((r) => r.metrics.roleStanceConsistencyScore),
    avgTokenReduction,
    avgReferenceCoverage: avg((r) => r.metrics.rawTranscriptReferenceCoverage),
    totalCases,
    passedCases,
    failedCases,
  };
}

// === Utilities ===

function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[.,!?;:'"]/g, "")
    .replace(/\s+/g, " ");
}

function estimateTokens(text: string): number {
  // v0.1: simple word count estimation
  // Real implementation should use tokenizer
  return text.split(/\s+/).filter(Boolean).length;
}

function estimateSummaryTokens(summary: ConversationSummaryV1): number {
  // Calculate tokens for fields that would be injected into prompt
  const promptText = [
    summary.summaryText,
    ...summary.decisions.map((d) => d.statement),
    ...summary.actionItems.map((a) => a.text),
    ...summary.openQuestions.map((q) => q.question),
    ...summary.keyInsights.map((i) => i.insight),
    ...summary.roleStances.map((s) => s.stance),
  ].join("\n");

  return estimateTokens(promptText);
}

async function loadTranscript(path: string): Promise<string> {
  const { readFile } = await import("fs/promises");
  return await readFile(path, "utf-8");
}

async function loadExpectedOutput(path: string): Promise<ConversationSummaryV1> {
  // v0.1: stub - will be implemented with file system
  return {
    sessionId: "stub",
    compressedAt: new Date().toISOString(),
    summaryText: "stub",
    decisions: [],
    actionItems: [],
    openQuestions: [],
    keyInsights: [],
    roleStances: [],
    evidenceRefs: [],
    rawTranscriptRefs: [],
  };
}
