import React, { memo } from "react";
import { TextShimmer } from "./TextShimmer.js";
import { useTheme } from "../theme/ThemeContext.js";

export type TodoItem = {
  content: string;
  status: "pending" | "in_progress" | "completed";
  activeForm?: string;
};

export type TodoToolProps = {
  part: any;
  chatStatus?: string;
};

function StatusIcon({ status }: { status: TodoItem["status"] }) {
  const { colors } = useTheme();
  const size = 14;

  if (status === "completed") {
    return (
      <div style={{
        width: size,
        height: size,
        borderRadius: "50%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        border: `1px solid ${colors.textMuted}`,
        opacity: 0.4,
        marginTop: 2,
      }}>
        <svg style={{ width: 8, height: 8 }} viewBox="0 0 16 16" fill="none" stroke={colors.textMuted} strokeWidth="2.5">
          <path d="M3 8l3 3 7-7" />
        </svg>
      </div>
    );
  }

  if (status === "in_progress") {
    return (
      <div style={{
        width: size,
        height: size,
        borderRadius: "50%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        border: `1px solid ${colors.textMuted}`,
        opacity: 0.6,
        marginTop: 2,
      }}>
        <svg style={{ width: 8, height: 8 }} viewBox="0 0 16 16" fill="none" stroke={colors.textMuted} strokeWidth="2">
          <path d="M6 4l4 4-4 4" />
        </svg>
      </div>
    );
  }

  return (
    <div style={{
      width: size,
      height: size,
      borderRadius: "50%",
      flexShrink: 0,
      border: `1px solid ${colors.textMuted}`,
      opacity: 0.6,
      marginTop: 2,
    }} />
  );
}

function TodoListItem({ todo }: { todo: TodoItem }) {
  const { colors } = useTheme();
  const isDone = todo.status === "completed";
  const isActive = todo.status === "in_progress";

  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
      <StatusIcon status={todo.status} />
      <span style={{
        fontSize: 13,
        lineHeight: "20px",
        color: isActive ? colors.text : colors.textMuted,
        textDecoration: isDone ? "line-through" : undefined,
        opacity: isDone ? 0.6 : 1,
      }}>
        {todo.content}
      </span>
    </div>
  );
}

export const TodoTool = memo(function TodoTool({ part }: TodoToolProps) {
  const isStreaming = part.state === "input-streaming";
  const newTodos: TodoItem[] = part.input?.todos ?? part.output?.newTodos ?? [];

  if (isStreaming || newTodos.length === 0) {
    return (
      <div style={{ padding: "4px 0" }}>
        <TextShimmer as="span" duration={1.2} style={{ fontSize: 13 }}>
          Creating to-do list...
        </TextShimmer>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: "4px 0" }}>
      {newTodos.map((todo, idx) => (
        <TodoListItem key={idx} todo={todo} />
      ))}
    </div>
  );
});
