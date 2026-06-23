/**
 * ConversationSummary — 会话摘要类型定义
 *
 * 基于 contracts-v1.md 冻结的 schema
 */

export interface ConversationSummaryV1 {
  sessionId: string;
  compressedAt: string;
  summaryText: string;
  decisions: DecisionRecord[];
  actionItems: ActionItem[];
  openQuestions: OpenQuestion[];
  keyInsights: KeyInsight[];
  roleStances: RoleStanceSnapshot[];
  evidenceRefs: string[];
  rawTranscriptRefs: string[];
}

export interface DecisionRecord {
  id: string;
  statement: string;
  rationale?: string;
  decidedBy: "user" | "moderator" | "council";
  status: "proposed" | "accepted" | "rejected" | "superseded";
  sourceMessageIds: string[];
}

export interface ActionItem {
  id: string;
  text: string;
  owner?: string;
  status: "open" | "in_progress" | "done" | "blocked";
  sourceMessageIds: string[];
}

export interface OpenQuestion {
  id: string;
  question: string;
  blocking: boolean;
  sourceMessageIds: string[];
}

export interface KeyInsight {
  id: string;
  insight: string;
  confidence: "low" | "medium" | "high";
  sourceMessageIds: string[];
}

export interface RoleStanceSnapshot {
  roleId: string;
  roleName: string;
  stance: string;
  confidence: "low" | "medium" | "high";
  unresolvedConcerns: string[];
  sourceMessageIds: string[];
}
