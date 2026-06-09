import React from "react";
import type { SessionSummaryPanelProps } from "./types.js";
import { SummarySection } from "./SummarySection.js";
import { useTheme } from "../theme/ThemeContext.js";
import {
  summaryPanelStyle,
  summaryScrollBodyStyle,
  summaryTitleStyle,
  summaryMetaStyle,
  sectionHeadingStyle,
  disagreementItemStyle,
  disagreementWithStyle,
  actionItemStyle,
  actionItemBulletStyle,
  actionItemMetaStyle,
  countsRowStyle,
  countItemStyle,
  countValueStyle,
  summaryFooterStyle,
  footerBtnStyle,
} from "./styles.js";

export const SessionSummaryPanel: React.FC<SessionSummaryPanelProps> = ({
  summary,
  onSaveSummary,
  onSaveDecisionLog,
  onCreatePermanentNoteSeed,
  onOpenMemoryReview,
  onDismiss,
}) => {
  const { colors } = useTheme();

  const hasDecisions = summary.decisions.length > 0;

  return (
    <div style={summaryPanelStyle(colors)}>
      <div style={summaryScrollBodyStyle}>
        {/* Header */}
        <div style={summaryTitleStyle(colors)}>
          {summary.title ?? "本轮总结"}
        </div>
        <div style={summaryMetaStyle(colors)}>
          {summary.topic && <div>议题：{summary.topic}</div>}
          {summary.roundCount !== undefined && <div>轮次：{summary.roundCount}</div>}
        </div>

        {/* Consensus */}
        <SummarySection
          title="当前共识"
          items={summary.consensus}
          emptyText="暂无明确共识"
        />

        {/* Disagreements */}
        <div>
          <div style={sectionHeadingStyle(colors)}>关键分歧</div>
          {summary.disagreements.length > 0 ? (
            <ul style={{ margin: 0, paddingLeft: 16, listStyleType: "disc" }}>
              {summary.disagreements.map((d, i) => (
                <li key={i} style={disagreementItemStyle(colors)}>
                  {d.with && (
                    <span style={disagreementWithStyle(colors)}>
                      [{d.with}]
                    </span>
                  )}
                  {d.point}
                </li>
              ))}
            </ul>
          ) : (
            <div style={{ fontSize: 11, color: colors.textMuted, opacity: 0.5, fontStyle: "italic", marginBottom: 4 }}>
              暂无记录的分歧
            </div>
          )}
        </div>

        {/* Unresolved questions */}
        <SummarySection
          title="未解决问题"
          items={summary.unresolvedQuestions}
          emptyText="暂无未解决问题"
        />

        {/* Decisions */}
        <SummarySection
          title="决策"
          items={summary.decisions}
          emptyText="暂无决策"
        />

        {/* Action items */}
        <div>
          <div style={sectionHeadingStyle(colors)}>后续行动</div>
          {summary.actionItems.length > 0 ? (
            <ul style={{ margin: 0, paddingLeft: 0, listStyle: "none" }}>
              {summary.actionItems.map((item, i) => (
                <li key={i} style={actionItemStyle(colors)}>
                  <span style={actionItemBulletStyle(colors)}>▸</span>
                  <span>
                    {item.text}
                    {item.owner && (
                      <span style={actionItemMetaStyle(colors)}>@{item.owner}</span>
                    )}
                    {item.due && (
                      <span style={actionItemMetaStyle(colors)}>due: {item.due}</span>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <div style={{ fontSize: 11, color: colors.textMuted, opacity: 0.5, fontStyle: "italic", marginBottom: 4 }}>
              暂无后续行动
            </div>
          )}
        </div>

        {/* Key insights */}
        {summary.keyInsights && summary.keyInsights.length > 0 && (
          <SummarySection
            title="关键洞察"
            items={summary.keyInsights}
          />
        )}

        {/* Candidate counts */}
        {(summary.docWriteCandidateCount !== undefined || summary.memoryCandidateCount !== undefined) && (
          <div style={countsRowStyle(colors)}>
            {summary.docWriteCandidateCount !== undefined && (
              <div style={countItemStyle(colors)}>
                文档写入候选：<span style={countValueStyle(colors)}>{summary.docWriteCandidateCount}</span>
              </div>
            )}
            {summary.memoryCandidateCount !== undefined && (
              <div style={countItemStyle(colors)}>
                记忆候选：<span style={countValueStyle(colors)}>{summary.memoryCandidateCount}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={summaryFooterStyle(colors)}>
        {onDismiss && (
          <button type="button" style={footerBtnStyle(colors)} onClick={onDismiss}>
            关闭
          </button>
        )}
        {onSaveDecisionLog && (
          <button
            type="button"
            style={hasDecisions ? footerBtnStyle(colors) : { ...footerBtnStyle(colors), opacity: 0.4, cursor: "not-allowed" }}
            onClick={() => hasDecisions && onSaveDecisionLog(summary.decisions)}
            disabled={!hasDecisions}
          >
            保存 Decision Log
          </button>
        )}
        {onSaveSummary && (
          <button
            type="button"
            style={footerBtnStyle(colors, "accent")}
            onClick={() => onSaveSummary(summary)}
          >
            保存 Summary
          </button>
        )}
        {onCreatePermanentNoteSeed && (
          <button
            type="button"
            style={footerBtnStyle(colors)}
            onClick={() => onCreatePermanentNoteSeed(summary)}
          >
            生成 Note Seed
          </button>
        )}
        {onOpenMemoryReview && (
          <button
            type="button"
            style={footerBtnStyle(colors)}
            onClick={onOpenMemoryReview}
          >
            Review Memory Candidates
          </button>
        )}
      </div>
    </div>
  );
};
