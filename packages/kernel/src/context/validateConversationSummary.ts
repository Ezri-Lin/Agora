/**
 * validateConversationSummary — 验证 ConversationSummaryV1
 */

import type { ConversationSummaryV1 } from "./ConversationSummary.js";

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export function validateConversationSummary(
  data: unknown,
  transcript?: string
): ValidationResult {
  const errors: string[] = [];

  if (typeof data !== "object" || data === null) {
    return { valid: false, errors: ["Input must be an object"] };
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
      errors.push(`Missing required field: ${field}`);
    }
  }

  // Type checks
  if (typeof obj.sessionId !== "string") {
    errors.push("sessionId must be a string");
  }

  if (typeof obj.compressedAt !== "string") {
    errors.push("compressedAt must be a string");
  }

  if (typeof obj.summaryText !== "string") {
    errors.push("summaryText must be a string");
  }

  if (!Array.isArray(obj.decisions)) {
    errors.push("decisions must be an array");
  }

  if (!Array.isArray(obj.actionItems)) {
    errors.push("actionItems must be an array");
  }

  if (!Array.isArray(obj.openQuestions)) {
    errors.push("openQuestions must be an array");
  }

  if (!Array.isArray(obj.keyInsights)) {
    errors.push("keyInsights must be an array");
  }

  if (!Array.isArray(obj.roleStances)) {
    errors.push("roleStances must be an array");
  }

  if (!Array.isArray(obj.evidenceRefs)) {
    errors.push("evidenceRefs must be an array");
  }

  if (!Array.isArray(obj.rawTranscriptRefs)) {
    errors.push("rawTranscriptRefs must be an array");
  }

  // Validate decisions
  if (Array.isArray(obj.decisions)) {
    for (let i = 0; i < obj.decisions.length; i++) {
      const decision = obj.decisions[i];
      const decisionErrors = validateDecision(decision, i);
      errors.push(...decisionErrors);
    }
  }

  // Validate actionItems
  if (Array.isArray(obj.actionItems)) {
    for (let i = 0; i < obj.actionItems.length; i++) {
      const item = obj.actionItems[i];
      const itemErrors = validateActionItem(item, i);
      errors.push(...itemErrors);
    }
  }

  // Validate openQuestions
  if (Array.isArray(obj.openQuestions)) {
    for (let i = 0; i < obj.openQuestions.length; i++) {
      const question = obj.openQuestions[i];
      const questionErrors = validateOpenQuestion(question, i);
      errors.push(...questionErrors);
    }
  }

  // Validate keyInsights
  if (Array.isArray(obj.keyInsights)) {
    for (let i = 0; i < obj.keyInsights.length; i++) {
      const insight = obj.keyInsights[i];
      const insightErrors = validateKeyInsight(insight, i);
      errors.push(...insightErrors);
    }
  }

  // Validate roleStances
  if (Array.isArray(obj.roleStances)) {
    for (let i = 0; i < obj.roleStances.length; i++) {
      const stance = obj.roleStances[i];
      const stanceErrors = validateRoleStance(stance, i);
      errors.push(...stanceErrors);
    }
  }

  // Validate source refs against transcript
  if (transcript) {
    const sourceErrors = validateSourceRefs(obj as ConversationSummaryV1, transcript);
    errors.push(...sourceErrors);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

function validateDecision(data: unknown, index: number): string[] {
  const errors: string[] = [];
  const prefix = `decisions[${index}]`;

  if (typeof data !== "object" || data === null) {
    errors.push(`${prefix} must be an object`);
    return errors;
  }

  const obj = data as Record<string, unknown>;

  if (typeof obj.id !== "string") {
    errors.push(`${prefix}.id must be a string`);
  }

  if (typeof obj.statement !== "string") {
    errors.push(`${prefix}.statement must be a string`);
  }

  if (typeof obj.decidedBy !== "string") {
    errors.push(`${prefix}.decidedBy must be a string`);
  }

  if (typeof obj.status !== "string") {
    errors.push(`${prefix}.status must be a string`);
  }

  if (!Array.isArray(obj.sourceMessageIds)) {
    errors.push(`${prefix}.sourceMessageIds must be an array`);
  } else if (obj.sourceMessageIds.length === 0) {
    errors.push(`${prefix}.sourceMessageIds must not be empty`);
  }

  return errors;
}

function validateActionItem(data: unknown, index: number): string[] {
  const errors: string[] = [];
  const prefix = `actionItems[${index}]`;

  if (typeof data !== "object" || data === null) {
    errors.push(`${prefix} must be an object`);
    return errors;
  }

  const obj = data as Record<string, unknown>;

  if (typeof obj.id !== "string") {
    errors.push(`${prefix}.id must be a string`);
  }

  if (typeof obj.text !== "string") {
    errors.push(`${prefix}.text must be a string`);
  }

  if (typeof obj.status !== "string") {
    errors.push(`${prefix}.status must be a string`);
  }

  if (!Array.isArray(obj.sourceMessageIds)) {
    errors.push(`${prefix}.sourceMessageIds must be an array`);
  } else if (obj.sourceMessageIds.length === 0) {
    errors.push(`${prefix}.sourceMessageIds must not be empty`);
  }

  return errors;
}

function validateOpenQuestion(data: unknown, index: number): string[] {
  const errors: string[] = [];
  const prefix = `openQuestions[${index}]`;

  if (typeof data !== "object" || data === null) {
    errors.push(`${prefix} must be an object`);
    return errors;
  }

  const obj = data as Record<string, unknown>;

  if (typeof obj.id !== "string") {
    errors.push(`${prefix}.id must be a string`);
  }

  if (typeof obj.question !== "string") {
    errors.push(`${prefix}.question must be a string`);
  }

  if (typeof obj.blocking !== "boolean") {
    errors.push(`${prefix}.blocking must be a boolean`);
  }

  if (!Array.isArray(obj.sourceMessageIds)) {
    errors.push(`${prefix}.sourceMessageIds must be an array`);
  } else if (obj.sourceMessageIds.length === 0) {
    errors.push(`${prefix}.sourceMessageIds must not be empty`);
  }

  return errors;
}

function validateKeyInsight(data: unknown, index: number): string[] {
  const errors: string[] = [];
  const prefix = `keyInsights[${index}]`;

  if (typeof data !== "object" || data === null) {
    errors.push(`${prefix} must be an object`);
    return errors;
  }

  const obj = data as Record<string, unknown>;

  if (typeof obj.id !== "string") {
    errors.push(`${prefix}.id must be a string`);
  }

  if (typeof obj.insight !== "string") {
    errors.push(`${prefix}.insight must be a string`);
  }

  if (typeof obj.confidence !== "string") {
    errors.push(`${prefix}.confidence must be a string`);
  }

  if (!Array.isArray(obj.sourceMessageIds)) {
    errors.push(`${prefix}.sourceMessageIds must be an array`);
  } else if (obj.sourceMessageIds.length === 0) {
    errors.push(`${prefix}.sourceMessageIds must not be empty`);
  }

  return errors;
}

function validateRoleStance(data: unknown, index: number): string[] {
  const errors: string[] = [];
  const prefix = `roleStances[${index}]`;

  if (typeof data !== "object" || data === null) {
    errors.push(`${prefix} must be an object`);
    return errors;
  }

  const obj = data as Record<string, unknown>;

  if (typeof obj.roleId !== "string") {
    errors.push(`${prefix}.roleId must be a string`);
  }

  if (typeof obj.roleName !== "string") {
    errors.push(`${prefix}.roleName must be a string`);
  }

  if (typeof obj.stance !== "string") {
    errors.push(`${prefix}.stance must be a string`);
  }

  if (typeof obj.confidence !== "string") {
    errors.push(`${prefix}.confidence must be a string`);
  }

  if (!Array.isArray(obj.unresolvedConcerns)) {
    errors.push(`${prefix}.unresolvedConcerns must be an array`);
  }

  if (!Array.isArray(obj.sourceMessageIds)) {
    errors.push(`${prefix}.sourceMessageIds must be an array`);
  } else if (obj.sourceMessageIds.length === 0) {
    errors.push(`${prefix}.sourceMessageIds must not be empty`);
  }

  return errors;
}

function validateSourceRefs(
  summary: ConversationSummaryV1,
  transcript: string
): string[] {
  const errors: string[] = [];

  // Check that sourceMessageIds reference existing messages
  // This is a basic check - in production, you'd want to verify against actual message IDs
  const allSourceIds = new Set<string>();

  for (const decision of summary.decisions) {
    for (const id of decision.sourceMessageIds) {
      allSourceIds.add(id);
    }
  }

  for (const item of summary.actionItems) {
    for (const id of item.sourceMessageIds) {
      allSourceIds.add(id);
    }
  }

  for (const question of summary.openQuestions) {
    for (const id of question.sourceMessageIds) {
      allSourceIds.add(id);
    }
  }

  for (const insight of summary.keyInsights) {
    for (const id of insight.sourceMessageIds) {
      allSourceIds.add(id);
    }
  }

  for (const stance of summary.roleStances) {
    for (const id of stance.sourceMessageIds) {
      allSourceIds.add(id);
    }
  }

  // For now, just check that we have some source IDs
  if (allSourceIds.size === 0) {
    errors.push("No sourceMessageIds found in any extracted item");
  }

  return errors;
}
