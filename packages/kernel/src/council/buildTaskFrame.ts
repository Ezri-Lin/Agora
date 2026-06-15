/**
 * BuildTaskFrame — task analysis + document context + constraints + briefs.
 *
 * Skeleton implementation for v1:
 * - Uses providedDocContents if available (fast path)
 * - Optional contextEngine hook for extra retrieval
 * - Falls back to missingEvidence if neither available
 * - Produces TaskFrame with taskBriefForRoles + evidencePolicy
 */

import type { TaskFrame, TaskType, SourceRef, CouncilMessage } from "@agora/shared";
import { generateId } from "@agora/shared";

interface BuildTaskFrameInput {
  userMessage: string;
  selectedDocs: SourceRef[];
  providedDocContents?: Map<string, string>;
  recentMessages: CouncilMessage[];
  llm: {
    callModerator: (params: {
      roomId: string;
      task: string;
      context: string;
    }) => Promise<{ content: string }>;
  };
  roomId: string;
}

interface TaskAnalysisResult {
  taskType: TaskType;
  userGoal: string;
  problemStatement: string;
  constraints: string[];
  openQuestions: string[];
}

/**
 * Build a TaskFrame from user message + available context.
 * v1 skeleton: LLM analysis + doc context assembly.
 */
export async function buildTaskFrame(input: BuildTaskFrameInput): Promise<TaskFrame> {
  const { userMessage, selectedDocs, providedDocContents, recentMessages, llm, roomId } = input;

  // 1. Assemble document context
  const { docContext, retrievedContext } = assembleDocContext(selectedDocs, providedDocContents);

  // 2. Build recent conversation summary
  const conversationSummary = summarizeRecentMessages(recentMessages);

  // 3. LLM analysis
  const analysisPrompt = buildAnalysisPrompt(userMessage, docContext, conversationSummary);
  const analysisResponse = await llm.callModerator({
    roomId,
    task: "build_task_frame",
    context: analysisPrompt,
  });
  const analysis = parseTaskAnalysis(analysisResponse.content, userMessage);

  // 4. Determine evidence policy
  const hasDocContext = selectedDocs.length > 0 && docContext.length > 0;
  const evidencePolicy = {
    enoughContext: hasDocContext || recentMessages.length > 0,
    missingEvidence: hasDocContext ? [] : ["No document context provided"],
    shouldSearchMore: !hasDocContext && analysis.taskType !== "other",
  };

  // 5. Generate briefs
  const taskBriefForHost = buildTaskBriefForHost(analysis, docContext);
  const taskBriefForRoles = buildTaskBriefForRoles(analysis, docContext);

  return {
    taskId: generateId("task"),
    userMessageId: generateId("msg"),
    taskType: analysis.taskType,
    userGoal: analysis.userGoal,
    problemStatement: analysis.problemStatement,
    selectedDocs: selectedDocs.map((doc, i) => ({
      docId: doc.path || `doc-${i}`,
      title: doc.label || doc.path || `Document ${i + 1}`,
      usage: (doc.importance === "primary" ? "primary_context" : "reference") as "primary_context" | "reference",
    })),
    retrievedContext,
    constraints: analysis.constraints,
    openQuestions: analysis.openQuestions,
    taskBriefForHost,
    taskBriefForRoles,
    evidencePolicy,
  };
}

// === Internal helpers ===

function assembleDocContext(
  selectedDocs: SourceRef[],
  providedDocContents?: Map<string, string>,
): { docContext: string; retrievedContext: TaskFrame["retrievedContext"] } {
  if (!providedDocContents || selectedDocs.length === 0) {
    return { docContext: "", retrievedContext: [] };
  }

  const parts: string[] = [];
  const retrievedContext: TaskFrame["retrievedContext"] = [];

  for (const doc of selectedDocs) {
    const key = doc.path || doc.snippet || "";
    const content = providedDocContents.get(key);
    if (!content) continue;

    const excerpt = content.slice(0, 2000);
    parts.push(`## ${doc.label || key}\n${excerpt}`);
    retrievedContext.push({
      sourceId: key,
      title: doc.label || key,
      excerptSummary: excerpt.slice(0, 200),
      relevanceReason: "User-selected document",
    });
  }

  return { docContext: parts.join("\n\n"), retrievedContext };
}

function summarizeRecentMessages(messages: CouncilMessage[]): string {
  if (messages.length === 0) return "";
  const recent = messages.slice(-5);
  return recent
    .map((m) => `${m.senderType}: ${typeof m.content === "string" ? m.content.slice(0, 200) : "[structured]"}`)
    .join("\n");
}

function buildAnalysisPrompt(userMessage: string, docContext: string, conversationSummary: string): string {
  return `Analyze this task and return JSON.

User message: "${userMessage}"

${docContext ? `Document context:\n${docContext}\n` : ""}
${conversationSummary ? `Recent conversation:\n${conversationSummary}\n` : ""}

Return JSON:
{
  "taskType": "design_discussion" | "architecture_decision" | "spec_draft" | "doc_review" | "research" | "writing" | "memory_review" | "implementation_planning" | "other",
  "userGoal": "one sentence describing what the user wants",
  "problemStatement": "the core question or problem",
  "constraints": ["constraint 1", "constraint 2"],
  "openQuestions": ["question 1", "question 2"]
}`;
}

function parseTaskAnalysis(content: string, userMessage: string): TaskAnalysisResult {
  try {
    const json = JSON.parse(content.trim());
    return {
      taskType: json.taskType || "other",
      userGoal: json.userGoal || userMessage,
      problemStatement: json.problemStatement || userMessage,
      constraints: json.constraints || [],
      openQuestions: json.openQuestions || [],
    };
  } catch {
    return {
      taskType: "other",
      userGoal: userMessage,
      problemStatement: userMessage,
      constraints: [],
      openQuestions: [],
    };
  }
}

function buildTaskBriefForHost(analysis: TaskAnalysisResult, docContext: string): string {
  return [
    `Task: ${analysis.problemStatement}`,
    `Goal: ${analysis.userGoal}`,
    analysis.constraints.length > 0 ? `Constraints: ${analysis.constraints.join("; ")}` : "",
    analysis.openQuestions.length > 0 ? `Open questions: ${analysis.openQuestions.join("; ")}` : "",
    docContext ? "Document context is available." : "No document context.",
  ]
    .filter(Boolean)
    .join("\n");
}

function buildTaskBriefForRoles(analysis: TaskAnalysisResult, docContext: string): string {
  return [
    `## Task`,
    analysis.problemStatement,
    ``,
    `## Goal`,
    analysis.userGoal,
    analysis.constraints.length > 0 ? `\n## Constraints\n${analysis.constraints.map((c) => `- ${c}`).join("\n")}` : "",
    docContext ? `\n## Reference Documents\n${docContext.slice(0, 1500)}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}
