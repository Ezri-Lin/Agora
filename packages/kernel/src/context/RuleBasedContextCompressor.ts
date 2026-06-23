/**
 * RuleBasedContextCompressor — 基于规则的上下文压缩器
 *
 * 不调用 LLM，用简单规则抽取/压缩
 * 用于建立 baseline，给 eval 一个稳定下限
 */

import type { ConversationCompressor } from "../eval/EvalRunner.js";
import type {
  ConversationSummaryV1,
  DecisionRecord,
  ActionItem,
  OpenQuestion,
  KeyInsight,
  RoleStanceSnapshot,
} from "./ConversationSummary.js";

export class RuleBasedContextCompressor implements ConversationCompressor {
  async compress(input: {
    sessionId: string;
    transcript: string;
  }): Promise<ConversationSummaryV1> {
    const { sessionId, transcript } = input;

    // Extract components
    const decisions = this.extractDecisions(transcript);
    const actionItems = this.extractActionItems(transcript);
    const openQuestions = this.extractOpenQuestions(transcript);
    const keyInsights = this.extractKeyInsights(transcript);
    const roleStances = this.extractRoleStances(transcript);
    const summaryText = this.generateSummary(transcript, decisions, actionItems);

    return {
      sessionId,
      compressedAt: new Date().toISOString(),
      summaryText,
      decisions,
      actionItems,
      openQuestions,
      keyInsights,
      roleStances,
      evidenceRefs: this.extractEvidenceRefs(transcript),
      rawTranscriptRefs: [`${sessionId}.md`],
    };
  }

  private extractDecisions(transcript: string): DecisionRecord[] {
    const decisions: DecisionRecord[] = [];

    // Pattern: "决策：xxx" or "Decision: xxx"
    const decisionPatterns = [
      /(?:决策|Decision|最终决策)[：:]\s*(.+?)(?:\n|$)/gi,
      /(?:同意|支持|接受)\s*[：:]?\s*(.+?)(?:\n|$)/gi,
      /(?:最终|结论)[：:]\s*(.+?)(?:\n|$)/gi,
    ];

    let id = 1;
    for (const pattern of decisionPatterns) {
      let match;
      while ((match = pattern.exec(transcript)) !== null) {
        const statement = match[1].trim();
        if (statement.length > 10 && statement.length < 500) {
          decisions.push({
            id: `decision-${String(id++).padStart(3, "0")}`,
            statement,
            decidedBy: "council",
            status: "accepted",
            sourceMessageIds: [],
          });
        }
      }
    }

    return decisions;
  }

  private extractActionItems(transcript: string): ActionItem[] {
    const actionItems: ActionItem[] = [];

    // Pattern: "行动项：xxx" or "Action: xxx"
    const actionPatterns = [
      /(?:行动项|Action|待办|TODO)[：:]\s*(.+?)(?:\n|$)/gi,
      /(?:需要|应该|必须)\s*(.+?)(?:\n|$)/gi,
    ];

    let id = 1;
    for (const pattern of actionPatterns) {
      let match;
      while ((match = pattern.exec(transcript)) !== null) {
        const text = match[1].trim();
        if (text.length > 10 && text.length < 300) {
          actionItems.push({
            id: `action-${String(id++).padStart(3, "0")}`,
            text,
            status: "open",
            sourceMessageIds: [],
          });
        }
      }
    }

    return actionItems;
  }

  private extractOpenQuestions(transcript: string): OpenQuestion[] {
    const questions: OpenQuestion[] = [];

    // Pattern: "问题：xxx" or "Question: xxx"
    const questionPatterns = [
      /(?:问题|Question|疑问|未解决)[：:]\s*(.+?)(?:\n|$)/gi,
      /(?:如何|怎样|为什么|是否)\s*(.+?)(?:\？|\?|\n|$)/gi,
    ];

    let id = 1;
    for (const pattern of questionPatterns) {
      let match;
      while ((match = pattern.exec(transcript)) !== null) {
        const question = match[1].trim();
        if (question.length > 10 && question.length < 300) {
          questions.push({
            id: `question-${String(id++).padStart(3, "0")}`,
            question,
            blocking: false,
            sourceMessageIds: [],
          });
        }
      }
    }

    return questions;
  }

  private extractKeyInsights(transcript: string): KeyInsight[] {
    const insights: KeyInsight[] = [];

    // Pattern: "洞察：xxx" or "Insight: xxx"
    const insightPatterns = [
      /(?:洞察|Insight|发现|关键)[：:]\s*(.+?)(?:\n|$)/gi,
      /(?:重要|关键)\s*(?:发现|结论)[：:]\s*(.+?)(?:\n|$)/gi,
    ];

    let id = 1;
    for (const pattern of insightPatterns) {
      let match;
      while ((match = pattern.exec(transcript)) !== null) {
        const insight = match[1].trim();
        if (insight.length > 10 && insight.length < 300) {
          insights.push({
            id: `insight-${String(id++).padStart(3, "0")}`,
            insight,
            confidence: "medium",
            sourceMessageIds: [],
          });
        }
      }
    }

    return insights;
  }

  private extractRoleStances(transcript: string): RoleStanceSnapshot[] {
    const stances: RoleStanceSnapshot[] = [];

    // Pattern: "Role: stance"
    const rolePatterns = [
      /(?:Moderator|主持人)[：:]\s*(.+?)(?:\n|$)/gi,
      /(?:Product Strategist|产品策略师)[：:]\s*(.+?)(?:\n|$)/gi,
      /(?:Skeptic Critic|质疑者)[：:]\s*(.+?)(?:\n|$)/gi,
      /(?:UX Researcher|用户体验研究员)[：:]\s*(.+?)(?:\n|$)/gi,
      /(?:Systems Architect|系统架构师)[：:]\s*(.+?)(?:\n|$)/gi,
      /(?:Risk Analyst|风险分析师)[：:]\s*(.+?)(?:\n|$)/gi,
      /(?:Historian|历史学家)[：:]\s*(.+?)(?:\n|$)/gi,
      /(?:Research Librarian|研究馆员)[：:]\s*(.+?)(?:\n|$)/gi,
      /(?:Signal Analyst|信号分析师)[：:]\s*(.+?)(?:\n|$)/gi,
    ];

    for (const pattern of rolePatterns) {
      let match;
      while ((match = pattern.exec(transcript)) !== null) {
        const roleName = match[0].split(/[：:]/)[0].trim();
        const stance = match[1].trim();

        if (stance.length > 10 && stance.length < 500) {
          stances.push({
            roleId: this.normalizeRoleId(roleName),
            roleName,
            stance,
            confidence: "medium",
            unresolvedConcerns: [],
            sourceMessageIds: [],
          });
        }
      }
    }

    return stances;
  }

  private normalizeRoleId(roleName: string): string {
    const roleMap: Record<string, string> = {
      "Moderator": "moderator",
      "主持人": "moderator",
      "Product Strategist": "product-strategist",
      "产品策略师": "product-strategist",
      "Skeptic Critic": "skeptic-critic",
      "质疑者": "skeptic-critic",
      "UX Researcher": "ux-researcher",
      "用户体验研究员": "ux-researcher",
      "Systems Architect": "systems-architect",
      "系统架构师": "systems-architect",
      "Risk Analyst": "risk-analyst",
      "风险分析师": "risk-analyst",
      "Historian": "historian",
      "历史学家": "historian",
      "Research Librarian": "research-librarian",
      "研究馆员": "research-librarian",
      "Signal Analyst": "signal-analyst",
      "信号分析师": "signal-analyst",
    };

    return roleMap[roleName] || roleName.toLowerCase().replace(/\s+/g, "-");
  }

  private extractEvidenceRefs(transcript: string): string[] {
    const refs: string[] = [];

    // Pattern: URLs
    const urlPattern = /https?:\/\/[^\s]+/g;
    let match;
    while ((match = urlPattern.exec(transcript)) !== null) {
      refs.push(match[0]);
    }

    return refs;
  }

  private generateSummary(
    transcript: string,
    decisions: DecisionRecord[],
    actionItems: ActionItem[]
  ): string {
    // Generate a simple summary
    const parts: string[] = [];

    if (decisions.length > 0) {
      parts.push(`主要决策：${decisions.map((d) => d.statement).join("；")}`);
    }

    if (actionItems.length > 0) {
      parts.push(`待办事项：${actionItems.length} 项`);
    }

    // Extract first 200 chars as context
    const firstPart = transcript.substring(0, 200).replace(/\n/g, " ").trim();
    parts.push(`讨论内容：${firstPart}...`);

    return parts.join("。");
  }
}
