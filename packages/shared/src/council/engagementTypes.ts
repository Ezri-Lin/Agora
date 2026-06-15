/**
 * EngagementDecision — direct / invite / clarify with reason.
 */

export interface EngagementRecommendation {
  suggestedMode: "direct" | "invite" | "clarify";
  confidence: number;
  reason: string;
  desiredPerspectives?: string[];
  directReplyDraft?: string;
}

export type EngagementDecision =
  | { mode: "direct"; reason: string; directReplyDraft?: string }
  | { mode: "invite"; reason: string; desiredPerspectives: string[]; dispatchRisk: "low" | "medium" | "high" }
  | { mode: "clarify"; question: string };
