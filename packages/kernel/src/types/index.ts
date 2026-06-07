import type { RoleCard, RoleCallInput, RoleCallResult, CouncilMessage } from "@agora/shared";

export interface LLMProvider {
  /** Single role call — one independent model invocation per role */
  callRole(input: RoleCallInput): Promise<RoleCallResult>;

  /** Moderator call — scene analysis, role selection, summary */
  callModerator(params: {
    roomId: string;
    task: "analyze" | "select_roles" | "summarize" | "extract_memories";
    context: string;
    messages?: CouncilMessage[];
    availableRoles?: RoleCard[];
  }): Promise<string>;
}

export interface CouncilSession {
  roomId: string;
  sharedContext: string;
  roles: RoleCard[];
  messages: CouncilMessage[];
}
