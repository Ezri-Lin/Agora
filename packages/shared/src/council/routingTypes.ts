/**
 * Council routing types — input classification and routing context.
 */

// === InputRoute ===

export type InputRouteKind =
  | "chitchat"
  | "light_response"
  | "task"
  | "command"
  | "ambiguous";

export type InputRoute =
  | { kind: "chitchat"; replyIntent: "ack" | "social" | "light_reaction"; fastReply: string }
  | { kind: "light_response"; reason: string }
  | { kind: "task"; taskSeed: string }
  | { kind: "command"; command: UserCommand }
  | { kind: "ambiguous"; clarificationQuestion: string };

export type UserCommand =
  | "continue_discussion"
  | "ask_specific_role"
  | "host_synthesize"
  | "finalize_decision"
  | "summarize_session"
  | "extract_memory_candidates"
  | "write_to_doc"
  | "cancel_dispatch"
  | "discard_round";

// === RouteInputContext ===

export type RoomPhase =
  | "idle"
  | "awaiting_dispatch_confirmation"
  | "running_council_round"
  | "awaiting_user_next_action"
  | "finalizing";

export type LastAssistantMessageKind =
  | "fast_reply"
  | "direct_reply"
  | "dispatch_preview"
  | "role_output"
  | "synthesis";

export interface InviteGateState {
  status: "available" | "cooldown";
  lastInviteRoundId?: string;
  lastInviteTaskFingerprint?: string;
  lastInviteAt?: string;
}

export interface RouteInputContext {
  messageIndex: number;
  hasDocuments: boolean;
  roomPhase: RoomPhase;
  hasPendingDispatch: boolean;
  hasCompletedCouncilRound: boolean;
  lastAssistantMessageKind?: LastAssistantMessageKind;
  inviteGateState?: InviteGateState;
}
