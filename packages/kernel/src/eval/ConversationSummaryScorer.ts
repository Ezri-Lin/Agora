/**
 * ConversationSummaryScorer — 计算 ConversationSummaryV1 的 metrics
 */

import type { ConversationSummaryV1 } from "../context/ConversationSummary.js";
import type { ContextEvalMetrics, EvalFailure } from "./EvalRunner.js";
import { EVAL_THRESHOLDS } from "./EvalRunner.js";

export function scoreConversationSummary(
  produced: ConversationSummaryV1,
  expected: ConversationSummaryV1
): ContextEvalMetrics {
  return {
    compressionDecisionRetentionRate: calculateDecisionRetention(produced, expected),
    actionItemRetentionRate: calculateActionItemRetention(produced, expected),
    openQuestionRetentionRate: calculateOpenQuestionRetention(produced, expected),
    roleStanceConsistencyScore: calculateRoleStanceConsistency(produced, expected),
    summaryTokenReductionRatio: calculateTokenReduction(produced, expected),
    rawTranscriptReferenceCoverage: calculateReferenceCoverage(produced, expected),
  };
}

export function checkMetrics(metrics: ContextEvalMetrics): EvalFailure[] {
  const failures: EvalFailure[] = [];

  if (metrics.compressionDecisionRetentionRate < EVAL_THRESHOLDS.compressionDecisionRetentionRate) {
    failures.push({
      metric: "compressionDecisionRetentionRate",
      expected: EVAL_THRESHOLDS.compressionDecisionRetentionRate,
      actual: metrics.compressionDecisionRetentionRate,
      message: `Decision retention rate ${metrics.compressionDecisionRetentionRate.toFixed(2)} below threshold ${EVAL_THRESHOLDS.compressionDecisionRetentionRate}`,
    });
  }

  if (metrics.actionItemRetentionRate < EVAL_THRESHOLDS.actionItemRetentionRate) {
    failures.push({
      metric: "actionItemRetentionRate",
      expected: EVAL_THRESHOLDS.actionItemRetentionRate,
      actual: metrics.actionItemRetentionRate,
      message: `Action item retention rate ${metrics.actionItemRetentionRate.toFixed(2)} below threshold ${EVAL_THRESHOLDS.actionItemRetentionRate}`,
    });
  }

  if (metrics.openQuestionRetentionRate < EVAL_THRESHOLDS.openQuestionRetentionRate) {
    failures.push({
      metric: "openQuestionRetentionRate",
      expected: EVAL_THRESHOLDS.openQuestionRetentionRate,
      actual: metrics.openQuestionRetentionRate,
      message: `Open question retention rate ${metrics.openQuestionRetentionRate.toFixed(2)} below threshold ${EVAL_THRESHOLDS.openQuestionRetentionRate}`,
    });
  }

  if (metrics.roleStanceConsistencyScore < EVAL_THRESHOLDS.roleStanceConsistencyScore) {
    failures.push({
      metric: "roleStanceConsistencyScore",
      expected: EVAL_THRESHOLDS.roleStanceConsistencyScore,
      actual: metrics.roleStanceConsistencyScore,
      message: `Role stance consistency score ${metrics.roleStanceConsistencyScore.toFixed(2)} below threshold ${EVAL_THRESHOLDS.roleStanceConsistencyScore}`,
    });
  }

  if (metrics.rawTranscriptReferenceCoverage < EVAL_THRESHOLDS.rawTranscriptReferenceCoverage) {
    failures.push({
      metric: "rawTranscriptReferenceCoverage",
      expected: EVAL_THRESHOLDS.rawTranscriptReferenceCoverage,
      actual: metrics.rawTranscriptReferenceCoverage,
      message: `Reference coverage ${metrics.rawTranscriptReferenceCoverage.toFixed(2)} below threshold ${EVAL_THRESHOLDS.rawTranscriptReferenceCoverage}`,
    });
  }

  return failures;
}

// === Internal Scoring Functions ===

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

  const stanceConsistent =
    normalizedProduced.includes(normalizedExpected) ||
    normalizedExpected.includes(normalizedProduced);

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

function calculateTokenReduction(
  produced: ConversationSummaryV1,
  expected: ConversationSummaryV1
): number {
  const producedLength = produced.summaryText.length;
  const expectedLength = expected.summaryText.length;

  if (expectedLength === 0) return 1.0;

  return 1 - (producedLength / expectedLength);
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

function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[.,!?;:'"]/g, "")
    .replace(/\s+/g, " ");
}
