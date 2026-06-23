/**
 * ExpectedOutputLoader — 加载并验证 expected output 文件
 */

import { readFile } from "fs/promises";
import type { ConversationSummaryV1 } from "../context/ConversationSummary.js";

export async function loadExpectedOutput(
  expectedPath: string
): Promise<ConversationSummaryV1> {
  const content = await readFile(expectedPath, "utf-8");
  const parsed = JSON.parse(content);

  // Validate schema
  validateExpectedOutput(parsed);

  return parsed as ConversationSummaryV1;
}

function validateExpectedOutput(data: unknown): void {
  if (typeof data !== "object" || data === null) {
    throw new Error("Expected output must be an object");
  }

  const obj = data as Record<string, unknown>;

  // Required fields
  const requiredFields = [
    "sessionId",
    "compressedAt",
    "summaryText",
    "decisions",
    "actionItems",
    "openQuestions",
    "keyInsights",
    "roleStances",
    "evidenceRefs",
    "rawTranscriptRefs",
  ];

  for (const field of requiredFields) {
    if (!(field in obj)) {
      throw new Error(`Missing required field: ${field}`);
    }
  }

  // Type checks
  if (typeof obj.sessionId !== "string") {
    throw new Error("sessionId must be a string");
  }

  if (typeof obj.compressedAt !== "string") {
    throw new Error("compressedAt must be a string");
  }

  if (typeof obj.summaryText !== "string") {
    throw new Error("summaryText must be a string");
  }

  if (!Array.isArray(obj.decisions)) {
    throw new Error("decisions must be an array");
  }

  if (!Array.isArray(obj.actionItems)) {
    throw new Error("actionItems must be an array");
  }

  if (!Array.isArray(obj.openQuestions)) {
    throw new Error("openQuestions must be an array");
  }

  if (!Array.isArray(obj.keyInsights)) {
    throw new Error("keyInsights must be an array");
  }

  if (!Array.isArray(obj.roleStances)) {
    throw new Error("roleStances must be an array");
  }

  if (!Array.isArray(obj.evidenceRefs)) {
    throw new Error("evidenceRefs must be an array");
  }

  if (!Array.isArray(obj.rawTranscriptRefs)) {
    throw new Error("rawTranscriptRefs must be an array");
  }

  // Validate decisions
  for (const decision of obj.decisions) {
    validateDecision(decision);
  }

  // Validate actionItems
  for (const item of obj.actionItems) {
    validateActionItem(item);
  }

  // Validate openQuestions
  for (const question of obj.openQuestions) {
    validateOpenQuestion(question);
  }

  // Validate keyInsights
  for (const insight of obj.keyInsights) {
    validateKeyInsight(insight);
  }

  // Validate roleStances
  for (const stance of obj.roleStances) {
    validateRoleStance(stance);
  }
}

function validateDecision(data: unknown): void {
  if (typeof data !== "object" || data === null) {
    throw new Error("Decision must be an object");
  }

  const obj = data as Record<string, unknown>;

  if (typeof obj.id !== "string") {
    throw new Error("Decision.id must be a string");
  }

  if (typeof obj.statement !== "string") {
    throw new Error("Decision.statement must be a string");
  }

  if (typeof obj.decidedBy !== "string") {
    throw new Error("Decision.decidedBy must be a string");
  }

  if (typeof obj.status !== "string") {
    throw new Error("Decision.status must be a string");
  }

  if (!Array.isArray(obj.sourceMessageIds)) {
    throw new Error("Decision.sourceMessageIds must be an array");
  }
}

function validateActionItem(data: unknown): void {
  if (typeof data !== "object" || data === null) {
    throw new Error("ActionItem must be an object");
  }

  const obj = data as Record<string, unknown>;

  if (typeof obj.id !== "string") {
    throw new Error("ActionItem.id must be a string");
  }

  if (typeof obj.text !== "string") {
    throw new Error("ActionItem.text must be a string");
  }

  if (typeof obj.status !== "string") {
    throw new Error("ActionItem.status must be a string");
  }

  if (!Array.isArray(obj.sourceMessageIds)) {
    throw new Error("ActionItem.sourceMessageIds must be an array");
  }
}

function validateOpenQuestion(data: unknown): void {
  if (typeof data !== "object" || data === null) {
    throw new Error("OpenQuestion must be an object");
  }

  const obj = data as Record<string, unknown>;

  if (typeof obj.id !== "string") {
    throw new Error("OpenQuestion.id must be a string");
  }

  if (typeof obj.question !== "string") {
    throw new Error("OpenQuestion.question must be a string");
  }

  if (typeof obj.blocking !== "boolean") {
    throw new Error("OpenQuestion.blocking must be a boolean");
  }

  if (!Array.isArray(obj.sourceMessageIds)) {
    throw new Error("OpenQuestion.sourceMessageIds must be an array");
  }
}

function validateKeyInsight(data: unknown): void {
  if (typeof data !== "object" || data === null) {
    throw new Error("KeyInsight must be an object");
  }

  const obj = data as Record<string, unknown>;

  if (typeof obj.id !== "string") {
    throw new Error("KeyInsight.id must be a string");
  }

  if (typeof obj.insight !== "string") {
    throw new Error("KeyInsight.insight must be a string");
  }

  if (typeof obj.confidence !== "string") {
    throw new Error("KeyInsight.confidence must be a string");
  }

  if (!Array.isArray(obj.sourceMessageIds)) {
    throw new Error("KeyInsight.sourceMessageIds must be an array");
  }
}

function validateRoleStance(data: unknown): void {
  if (typeof data !== "object" || data === null) {
    throw new Error("RoleStance must be an object");
  }

  const obj = data as Record<string, unknown>;

  if (typeof obj.roleId !== "string") {
    throw new Error("RoleStance.roleId must be a string");
  }

  if (typeof obj.roleName !== "string") {
    throw new Error("RoleStance.roleName must be a string");
  }

  if (typeof obj.stance !== "string") {
    throw new Error("RoleStance.stance must be a string");
  }

  if (typeof obj.confidence !== "string") {
    throw new Error("RoleStance.confidence must be a string");
  }

  if (!Array.isArray(obj.unresolvedConcerns)) {
    throw new Error("RoleStance.unresolvedConcerns must be an array");
  }

  if (!Array.isArray(obj.sourceMessageIds)) {
    throw new Error("RoleStance.sourceMessageIds must be an array");
  }
}

export async function loadAllExpectedOutputs(
  expectedDir: string
): Promise<Map<string, ConversationSummaryV1>> {
  const { readdir } = await import("fs/promises");
  const { join } = await import("path");
  const files = await readdir(expectedDir);

  const outputs = new Map<string, ConversationSummaryV1>();

  for (const file of files) {
    if (file.endsWith(".expected.json")) {
      const expectedPath = join(expectedDir, file);
      const output = await loadExpectedOutput(expectedPath);
      outputs.set(output.sessionId, output);
    }
  }

  return outputs;
}
