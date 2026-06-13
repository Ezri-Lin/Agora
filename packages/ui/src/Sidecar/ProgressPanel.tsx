import React from "react";
import type { CouncilMessage } from "@agora/shared";
import { useTheme } from "../theme/ThemeContext.js";
import type { ColorPalette } from "../theme/palettes.js";
import { radius, spacing, typography } from "../theme/tokens.js";

interface ProgressPanelProps {
  messages: CouncilMessage[];
  loadingStatus?: string;
  isLoading: boolean;
  outputs: string[];
  onOpenOutput?: (path: string) => void;
}

export const ProgressPanel: React.FC<ProgressPanelProps> = ({
  messages,
  loadingStatus,
  isLoading,
  outputs,
  onOpenOutput,
}) => {
  const { colors } = useTheme();
  const styles = createStyles(colors);

  const userTasks = messages.filter((m) => m.senderType === "user");
  const latestTask = userTasks[userTasks.length - 1];
  const historicalTasks = userTasks.slice(0, -1);

  // Count role replies to current task
  const currentReplyCount = latestTask
    ? getRepliesAfter(latestTask, messages).length
    : 0;

  // Changes: only project documents, exclude app-generated files
  const projectOutputs = outputs.filter((p) => !isAppGenerated(p));
  const changeMessages = messages.filter(
    (m) => m.graphSummary && m.senderType !== "user"
  );
  const fileChanges = buildFileChanges(projectOutputs, changeMessages);

  return (
    <div style={styles.container}>
      {/* Current — the task being processed */}
      <Section title="Current" colors={colors}>
        {!latestTask ? (
          <div style={styles.empty}>No active task</div>
        ) : (
          <div style={styles.currentBlock}>
            <div style={styles.currentTask}>{latestTask.content}</div>
            <div style={styles.currentStatus}>
              {isLoading ? (
                <>
                  <span style={styles.pulse} />
                  <span style={styles.statusText}>{loadingStatus || "Processing..."}</span>
                </>
              ) : currentReplyCount > 0 ? (
                <span style={styles.doneText}>{currentReplyCount} roles complete</span>
              ) : (
                <span style={styles.waitingText}>Waiting for response</span>
              )}
            </div>
          </div>
        )}
      </Section>

      {/* Tasks — historical user requests */}
      <Section title="Tasks" colors={colors}>
        {historicalTasks.length === 0 ? (
          <div style={styles.empty}>No completed tasks</div>
        ) : (
          <div style={styles.taskList}>
            {historicalTasks.map((task) => (
              <div key={task.id} style={styles.taskItem}>
                <span style={styles.taskSummary}>
                  {truncate(task.content, 50)}
                </span>
                <span style={styles.doneBadge}>Done</span>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* Changes — project document modifications only */}
      <Section title="Changes" colors={colors}>
        {fileChanges.length === 0 ? (
          <div style={styles.empty}>No changes</div>
        ) : (
          <div style={styles.changesList}>
            {fileChanges.map((change, i) => (
              <button
                key={i}
                style={styles.changeItem}
                onClick={() => onOpenOutput?.(change.path)}
              >
                <span style={styles.changeFile}>
                  {basename(change.path)}
                </span>
                <span style={styles.changeStats}>
                  {change.summary || "modified"}
                </span>
              </button>
            ))}
          </div>
        )}
      </Section>
    </div>
  );
};

/* ---- helpers ---- */

interface FileChange {
  path: string;
  summary?: string;
}

/** Filter out app-generated files (room context, sessions, etc.) */
function isAppGenerated(path: string): boolean {
  const name = basename(path).toLowerCase();
  // App-generated files by name
  if (
    name === "context.md" ||
    name === "memory-candidates.md" ||
    name === "messages.jsonl" ||
    name === "room.json" ||
    name === "summary.md" ||
    name === "session.md"
  ) {
    return true;
  }
  // App-generated files by path pattern
  const normalized = path.replace(/\\/g, "/").toLowerCase();
  return (
    normalized.includes("/.agora/") ||
    normalized.includes("agora-room-") ||
    normalized.includes("room-context") ||
    normalized.includes("session-summary") ||
    normalized.includes("council-session") ||
    normalized.endsWith(".agora.json")
  );
}

function getRepliesAfter(
  task: CouncilMessage,
  all: CouncilMessage[]
): CouncilMessage[] {
  const idx = all.indexOf(task);
  if (idx < 0) return [];
  const replies: CouncilMessage[] = [];
  for (let i = idx + 1; i < all.length; i++) {
    const m = all[i];
    if (m.senderType === "user") break;
    if (m.senderType === "role" || m.senderType === "moderator") {
      replies.push(m);
    }
  }
  return replies;
}

function buildFileChanges(outputs: string[], msgs: CouncilMessage[]): FileChange[] {
  const map = new Map<string, FileChange>();
  for (const path of outputs) {
    map.set(path, { path });
  }
  for (const msg of msgs) {
    const summary = msg.graphSummary || "";
    for (const path of outputs) {
      if (summary.includes(basename(path))) {
        const existing = map.get(path);
        if (existing && !existing.summary) {
          existing.summary = summary;
        }
      }
    }
  }
  return Array.from(map.values());
}

function truncate(s: string, max: number): string {
  return s.length > max ? s.slice(0, max) + "..." : s;
}

function basename(path: string): string {
  const parts = path.replace(/\\/g, "/").split("/");
  return parts[parts.length - 1] || path;
}

/* ---- sub-components ---- */

const Section: React.FC<{
  title: string;
  colors: ColorPalette;
  children: React.ReactNode;
}> = ({ title, colors, children }) => (
  <div style={{ marginBottom: spacing.md }}>
    <div
      style={{
        fontSize: typography.sectionTitle.size,
        fontWeight: typography.sectionTitle.weight,
        letterSpacing: `${typography.sectionTitle.tracking}em`,
        color: colors.textMuted,
        textTransform: "uppercase" as const,
        padding: `${spacing.xxs}px ${spacing.md}px`,
        marginBottom: spacing.xxs,
      }}
    >
      {title}
    </div>
    {children}
  </div>
);

/* ---- styles ---- */

const createStyles = (colors: ColorPalette): Record<string, React.CSSProperties> => ({
  container: {
    padding: `${spacing.sm}px 0`,
    overflowY: "auto" as const,
    height: "100%",
  },
  empty: {
    color: colors.textMuted,
    fontSize: typography.meta.size,
    padding: `${spacing.xs}px ${spacing.md}px`,
    fontStyle: "italic" as const,
  },
  currentBlock: {
    padding: `0 ${spacing.md}px`,
  },
  currentTask: {
    fontSize: typography.meta.size,
    fontWeight: 500,
    color: colors.text,
    marginBottom: spacing.sm,
    lineHeight: 1.5,
  },
  currentStatus: {
    display: "flex",
    alignItems: "center",
    gap: spacing.sm,
  },
  pulse: {
    width: 6,
    height: 6,
    borderRadius: "50%",
    background: colors.accent,
    flexShrink: 0,
    animation: "pulse 1.5s ease-in-out infinite",
  },
  statusText: {
    fontSize: typography.meta.size,
    color: colors.accent,
    fontStyle: "italic" as const,
  },
  doneText: {
    fontSize: typography.meta.size,
    color: colors.success,
    fontWeight: 500,
  },
  waitingText: {
    fontSize: typography.meta.size,
    color: colors.textMuted,
    fontStyle: "italic" as const,
  },
  taskList: {
    display: "flex",
    flexDirection: "column" as const,
  },
  taskItem: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: spacing.sm,
    padding: `${spacing.xxs}px ${spacing.md}px`,
  },
  taskSummary: {
    fontSize: typography.meta.size,
    color: colors.text,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap" as const,
    flex: 1,
  },
  doneBadge: {
    fontSize: typography.badge.size,
    fontWeight: 600,
    padding: `1px ${spacing.xs}px`,
    borderRadius: radius.xs,
    background: colors.successBg,
    color: colors.success,
    flexShrink: 0,
  },
  changesList: {
    display: "flex",
    flexDirection: "column" as const,
  },
  changeItem: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: spacing.sm,
    padding: `${spacing.xxs}px ${spacing.md}px`,
    background: "none",
    border: "none",
    cursor: "pointer",
    textAlign: "left" as const,
    width: "100%",
    transition: "background 0.1s",
  },
  changeFile: {
    fontSize: typography.meta.size,
    fontWeight: 500,
    color: colors.text,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap" as const,
  },
  changeStats: {
    fontSize: typography.badge.size,
    color: colors.textMuted,
    flexShrink: 0,
  },
});
