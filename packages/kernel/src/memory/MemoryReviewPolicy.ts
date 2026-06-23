/**
 * MemoryReviewPolicy — 记忆审查策略
 *
 * 根据 type 和 confidence 决定 review policy
 */

import type {
  MemoryCandidate,
  MemoryType,
  MemoryScope,
  MemoryStatus,
} from "./MemoryCandidate.js";

export interface ReviewDecision {
  status: MemoryStatus;
  reason: string;
  autoAccepted: boolean;
}

export class MemoryReviewPolicy {
  /**
   * Review a candidate and decide its status
   */
  review(candidate: MemoryCandidate): ReviewDecision {
    // Check if already reviewed
    if (candidate.status !== "candidate") {
      return {
        status: candidate.status,
        reason: `Already ${candidate.status}`,
        autoAccepted: false,
      };
    }

    // Type-specific review
    switch (candidate.type) {
      case "decision":
        return this.reviewDecision(candidate);

      case "insight":
        return this.reviewInsight(candidate);

      case "constraint":
        return this.reviewConstraint(candidate);

      case "preference":
        return this.reviewPreference(candidate);

      case "fact":
        return this.reviewFact(candidate);

      case "anti_pattern":
        return this.reviewAntiPattern(candidate);

      default:
        return {
          status: "candidate",
          reason: "Unknown type, needs manual review",
          autoAccepted: false,
        };
    }
  }

  private reviewDecision(candidate: MemoryCandidate): ReviewDecision {
    // Project-scope accepted decisions with high confidence can be auto-accepted
    if (
      candidate.scope === "project" &&
      candidate.confidence >= 0.9
    ) {
      return {
        status: "accepted",
        reason: "High-confidence project decision",
        autoAccepted: true,
      };
    }

    // Other decisions need review
    return {
      status: "candidate",
      reason: "Decision needs review",
      autoAccepted: false,
    };
  }

  private reviewInsight(candidate: MemoryCandidate): ReviewDecision {
    // High-confidence insights can be auto-accepted
    if (candidate.confidence >= 0.95) {
      return {
        status: "accepted",
        reason: "High-confidence insight",
        autoAccepted: true,
      };
    }

    return {
      status: "candidate",
      reason: "Insight needs review",
      autoAccepted: false,
    };
  }

  private reviewConstraint(candidate: MemoryCandidate): ReviewDecision {
    // High-confidence constraints can be auto-accepted
    if (candidate.confidence >= 0.9) {
      return {
        status: "accepted",
        reason: "High-confidence constraint",
        autoAccepted: true,
      };
    }

    return {
      status: "candidate",
      reason: "Constraint needs review",
      autoAccepted: false,
    };
  }

  private reviewPreference(candidate: MemoryCandidate): ReviewDecision {
    // Preferences need user confirmation unless explicitly stated
    // Low confidence preferences should be rejected
    if (candidate.confidence < 0.8) {
      return {
        status: "rejected",
        reason: "Preference inferred from weak signals",
        autoAccepted: false,
      };
    }

    return {
      status: "candidate",
      reason: "Preference needs user confirmation",
      autoAccepted: false,
    };
  }

  private reviewFact(candidate: MemoryCandidate): ReviewDecision {
    // Facts must have evidence
    if (
      !candidate.source.evidenceRefs ||
      candidate.source.evidenceRefs.length === 0
    ) {
      return {
        status: "rejected",
        reason: "Fact without evidence",
        autoAccepted: false,
      };
    }

    // High-confidence facts with evidence can be auto-accepted
    if (candidate.confidence >= 0.95) {
      return {
        status: "accepted",
        reason: "High-confidence fact with evidence",
        autoAccepted: true,
      };
    }

    return {
      status: "candidate",
      reason: "Fact needs review",
      autoAccepted: false,
    };
  }

  private reviewAntiPattern(candidate: MemoryCandidate): ReviewDecision {
    // Anti-patterns are usually candidates
    return {
      status: "candidate",
      reason: "Anti-pattern needs review",
      autoAccepted: false,
    };
  }

  /**
   * Get review policy summary for a type
   */
  getPolicySummary(type: MemoryType): string {
    switch (type) {
      case "decision":
        return "Auto-accept project-scope with confidence >= 0.9";
      case "insight":
        return "Auto-accept with confidence >= 0.95";
      case "constraint":
        return "Auto-accept with confidence >= 0.9";
      case "preference":
        return "Reject if confidence < 0.8, otherwise needs user confirmation";
      case "fact":
        return "Reject without evidence, auto-accept with confidence >= 0.95";
      case "anti_pattern":
        return "Always needs review";
      default:
        return "Unknown type";
    }
  }
}
