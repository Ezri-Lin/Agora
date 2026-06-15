/**
 * TaskFrame — task analysis + document context + constraints + briefs.
 */

import type { SourceRef } from "../types.js";

export type TaskType =
  | "design_discussion"
  | "architecture_decision"
  | "spec_draft"
  | "doc_review"
  | "research"
  | "writing"
  | "memory_review"
  | "implementation_planning"
  | "other";

export interface TaskFrame {
  taskId: string;
  userMessageId: string;
  taskType: TaskType;
  userGoal: string;
  problemStatement: string;

  selectedDocs: Array<{
    docId: string;
    title: string;
    usage: "primary_context" | "reference" | "background";
  }>;

  retrievedContext: Array<{
    sourceId: string;
    title: string;
    excerptSummary: string;
    relevanceReason: string;
  }>;

  constraints: string[];
  openQuestions: string[];
  taskBriefForHost: string;
  taskBriefForRoles: string;

  evidencePolicy: {
    enoughContext: boolean;
    missingEvidence: string[];
    shouldSearchMore: boolean;
  };
}
