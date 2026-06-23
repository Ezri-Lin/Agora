/**
 * MemoryCandidateValidator — 验证 MemoryCandidate
 *
 * Hard gates:
 * - MUST have source.messageIds
 * - MUST have confidence between 0 and 1
 * - MUST have scope
 * - MUST have type
 * - MUST NOT be accepted if unsupported by source
 * - Fact candidate SHOULD have evidenceRefs
 * - Preference candidate MUST NOT be inferred from weak signals
 * - Raw chat MUST NOT be persisted as memory content
 */

import type {
  MemoryCandidate,
  MemoryScope,
  MemoryType,
  MemoryStatus,
} from "./MemoryCandidate.js";

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export class MemoryCandidateValidator {
  validate(candidate: MemoryCandidate): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Required fields
    if (!candidate.id) {
      errors.push("Missing required field: id");
    }

    if (!candidate.scope) {
      errors.push("Missing required field: scope");
    }

    if (!candidate.type) {
      errors.push("Missing required field: type");
    }

    if (!candidate.content) {
      errors.push("Missing required field: content");
    }

    if (!candidate.source) {
      errors.push("Missing required field: source");
    }

    if (candidate.confidence === undefined || candidate.confidence === null) {
      errors.push("Missing required field: confidence");
    }

    if (!candidate.status) {
      errors.push("Missing required field: status");
    }

    if (!candidate.createdAt) {
      errors.push("Missing required field: createdAt");
    }

    // Source validation
    if (candidate.source) {
      if (!candidate.source.sessionId) {
        errors.push("Missing source.sessionId");
      }

      if (!Array.isArray(candidate.source.messageIds)) {
        errors.push("source.messageIds must be an array");
      } else if (candidate.source.messageIds.length === 0) {
        errors.push("source.messageIds must not be empty");
      }
    }

    // Confidence validation
    if (
      candidate.confidence !== undefined &&
      (candidate.confidence < 0 || candidate.confidence > 1)
    ) {
      errors.push("confidence must be between 0 and 1");
    }

    // Type-specific validation
    if (candidate.type) {
      const typeValidation = this.validateType(candidate);
      errors.push(...typeValidation.errors);
      warnings.push(...typeValidation.warnings);
    }

    // Scope validation
    if (candidate.scope) {
      const validScopes: MemoryScope[] = [
        "global",
        "domain",
        "project",
        "session",
        "role_usage",
      ];
      if (!validScopes.includes(candidate.scope)) {
        errors.push(`Invalid scope: ${candidate.scope}`);
      }
    }

    // Status validation
    if (candidate.status) {
      const validStatuses: MemoryStatus[] = [
        "candidate",
        "accepted",
        "rejected",
        "superseded",
        "expired",
        "contradicted",
      ];
      if (!validStatuses.includes(candidate.status)) {
        errors.push(`Invalid status: ${candidate.status}`);
      }
    }

    // Content validation
    if (candidate.content) {
      // Check for raw chat patterns
      if (this.isRawChat(candidate.content)) {
        errors.push("Raw chat MUST NOT be persisted as memory content");
      }

      // Check minimum length
      if (candidate.content.length < 10) {
        warnings.push("Content is very short, may not be useful");
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  private validateType(
    candidate: MemoryCandidate
  ): { errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];

    switch (candidate.type) {
      case "fact":
        // Fact MUST have evidenceRefs
        if (
          !candidate.source.evidenceRefs ||
          candidate.source.evidenceRefs.length === 0
        ) {
          warnings.push(
            "Fact candidate SHOULD have evidenceRefs"
          );
        }
        break;

      case "preference":
        // Preference MUST NOT be inferred from weak signals
        if (candidate.confidence < 0.8) {
          errors.push(
            "Preference candidate MUST NOT be inferred from weak signals (confidence < 0.8)"
          );
        }
        break;

      case "decision":
        // Decision should have reasonable confidence
        if (candidate.confidence < 0.6) {
          warnings.push(
            "Decision candidate has low confidence, may need review"
          );
        }
        break;

      case "role_usage":
        // Role usage should only affect routing
        if (candidate.scope !== "role_usage") {
          warnings.push(
            "Role usage candidate should have scope=role_usage"
          );
        }
        break;
    }

    return { errors, warnings };
  }

  private isRawChat(content: string): boolean {
    // Check for common raw chat patterns
    const rawChatPatterns = [
      /^\[user\/.+\]:/m,
      /^\[moderator\/.+\]:/m,
      /^\[role\/.+\]:/m,
      /^\[system\/.+\]:/m,
    ];

    return rawChatPatterns.some((pattern) => pattern.test(content));
  }

  /**
   * Check if candidate can be auto-accepted
   */
  canAutoAccept(candidate: MemoryCandidate): boolean {
    // Only candidate status can be auto-accepted
    if (candidate.status !== "candidate") {
      return false;
    }

    // Type-specific rules
    switch (candidate.type) {
      case "decision":
        // Can auto-accept project-scope accepted decisions
        return (
          candidate.scope === "project" &&
          candidate.confidence >= 0.9
        );

      case "constraint":
        // Can auto-accept high-confidence constraints
        return candidate.confidence >= 0.9;

      case "insight":
        // Can auto-accept high-confidence insights
        return candidate.confidence >= 0.95;

      default:
        // Other types need review
        return false;
    }
  }

  /**
   * Get default status for a new candidate
   */
  getDefaultStatus(candidate: MemoryCandidate): MemoryStatus {
    if (this.canAutoAccept(candidate)) {
      return "accepted";
    }

    return "candidate";
  }
}
