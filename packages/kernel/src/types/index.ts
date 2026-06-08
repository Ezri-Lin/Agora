import type { RoleCard, RoleCallInput, RoleCallResult, CouncilMessage } from "@agora/shared";

export interface LLMProvider {
  /** Single role call — one independent model invocation per role */
  callRole(input: RoleCallInput, signal?: AbortSignal): Promise<RoleCallResult>;

  /** Streaming role call — optional, tokens arrive via onChunk callback */
  callRoleStream?(
    input: RoleCallInput,
    onChunk: (delta: string, thinkingDelta?: string) => void,
    signal?: AbortSignal,
  ): Promise<RoleCallResult>;

  /** Moderator call — scene analysis, role selection, summary */
  callModerator(params: {
    roomId: string;
    task: "analyze" | "select_roles" | "summarize" | "extract_memories";
    context: string;
    messages?: CouncilMessage[];
    availableRoles?: RoleCard[];
  }): Promise<{ content: string; thinking?: string }>;
}

export interface CouncilSession {
  roomId: string;
  sharedContext: string;
  roles: RoleCard[];
  messages: CouncilMessage[];
}
