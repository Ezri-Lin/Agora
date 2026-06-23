/**
 * validateMemoryCandidate — 验证单个 MemoryCandidate
 *
 * 用于 LLM extraction 后的 validation pipeline
 */

import type { MemoryCandidate, MemoryScope, MemoryType, MemoryStatus } from "./MemoryCandidate.js";

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export function validateMemoryCandidate(data: unknown): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (typeof data !== "object" || data === null) {
    return { valid: false, errors: ["Input must be an object"], warnings: [] };
  }

  const obj = data as Record<string, unknown>;

  // Required fields
  if (typeof obj.id !== "string") {
    errors.push("id must be a string");
  }

  if (typeof obj.scope !== "string") {
    errors.push("scope must be a string");
  } else {
    const validScopes: MemoryScope[] = ["global", "domain", "project", "session", "role_usage"];
    if (!validScopes.includes(obj.scope as MemoryScope)) {
      errors.push(`Invalid scope: ${obj.scope}`);
    }
  }

  if (typeof obj.type !== "string") {
    errors.push("type must be a string");
  } else {
    const validTypes: MemoryType[] = ["preference", "decision", "insight", "constraint", "fact", "anti_pattern", "role_usage"];
    if (!validTypes.includes(obj.type as MemoryType)) {
      errors.push(`Invalid type: ${obj.type}`);
    }
  }

  if (typeof obj.content !== "string") {
    errors.push("content must be a string");
  }

  if (typeof obj.confidence !== "number") {
    errors.push("confidence must be a number");
  } else if (obj.confidence < 0 || obj.confidence > 1) {
    errors.push("confidence must be between 0 and 1");
  }

  if (typeof obj.status !== "string") {
    errors.push("status must be a string");
  } else {
    const validStatuses: MemoryStatus[] = ["candidate", "accepted", "rejected", "superseded", "expired", "contradicted"];
    if (!validStatuses.includes(obj.status as MemoryStatus)) {
      errors.push(`Invalid status: ${obj.status}`);
    }
  }

  if (!Array.isArray(obj.tags)) {
    errors.push("tags must be an array");
  }

  if (typeof obj.createdAt !== "string") {
    errors.push("createdAt must be a string");
  }

  // Source validation
  if (typeof obj.source !== "object" || obj.source === null) {
    errors.push("source must be an object");
  } else {
    const source = obj.source as Record<string, unknown>;

    if (typeof source.sessionId !== "string") {
      errors.push("source.sessionId must be a string");
    }

    if (!Array.isArray(source.messageIds)) {
      errors.push("source.messageIds must be an array");
    } else if (source.messageIds.length === 0) {
      errors.push("source.messageIds must not be empty");
    }
  }

  // Type-specific validation
  if (obj.type && obj.source) {
    const type = obj.type as MemoryType;
    const source = obj.source as Record<string, unknown>;

    switch (type) {
      case "fact":
        // Fact MUST have evidenceRefs
        if (!source.evidenceRefs || (Array.isArray(source.evidenceRefs) && source.evidenceRefs.length === 0)) {
          warnings.push("Fact candidate SHOULD have evidenceRefs");
        }
        break;

      case "preference":
        // Preference MUST NOT be inferred from weak signals
        if (typeof obj.confidence === "number" && obj.confidence < 0.8) {
          errors.push("Preference candidate MUST NOT be inferred from weak signals (confidence < 0.8)");
        }
        break;

      case "role_usage":
        // Role usage should only affect routing
        if (obj.scope !== "role_usage") {
          warnings.push("Role usage candidate should have scope=role_usage");
        }
        break;
    }
  }

  // Content validation
  if (typeof obj.content === "string") {
    // Check for raw chat patterns
    if (isRawChat(obj.content)) {
      errors.push("Raw chat MUST NOT be persisted as memory content");
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

function isRawChat(content: string): boolean {
  // Check for common raw chat patterns
  const rawChatPatterns = [
    /^\[user\/.+\]:/m,
    /^\[moderator\/.+\]:/m,
    /^\[role\/.+\]:/m,
    /^\[system\/.+\]:/m,
    // Common chat format patterns
    /^User:\s/m,
    /^Assistant:\s/m,
    /^AI:\s/m,
    /^Bot:\s/m,
    // Transcript patterns
    /\nUser:.*\nAssistant:/,
    /\nHuman:.*\nAssistant:/,
  ];

  // Also check for high density of message markers (indicating raw transcript)
  const messageMarkers = (content.match(/^(User|Assistant|Human|AI|Bot):/gm) || []).length;
  if (messageMarkers >= 3) {
    return true;
  }

  return rawChatPatterns.some((pattern) => pattern.test(content));
}
