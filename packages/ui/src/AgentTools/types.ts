export type StepState = "pending" | "animating" | "complete";

export type ToolVariant = "thinking" | "action" | "search" | "edit" | "plan" | "todo";

export type DiffLine = {
  type: "add" | "remove" | "context";
  content: string;
};

export type TimelineStep =
  | {
      id: string;
      type: "input-typing";
      content: string;
      image?: string;
      duration: number;
    }
  | {
      id: string;
      type: "user-message";
      content: string;
      image?: string;
    }
  | {
      id: string;
      type: "tool-call";
      toolName: string;
      toolDetail: string;
      duration: number;
      toolVariant?: ToolVariant;
      thoughtContent?: string;
      searchQuery?: string;
      searchSource?: string;
      filePath?: string;
      diffStats?: string;
      diffLines?: DiffLine[];
      bashCommand?: string;
      bashOutput?: string;
      bashSuccess?: boolean;
    }
  | {
      id: string;
      type: "assistant-stream";
      content: string;
    }
  | {
      id: string;
      type: "pause";
      duration: number;
    };

export type Turn = {
  userStep?: TimelineStep;
  steps: TimelineStep[];
};

export type ToolApproval = {
  onApprove?: () => void;
  onDeny?: () => void;
  approveLabel?: string;
  denyLabel?: string;
};
