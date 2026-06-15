/**
 * CouncilRuntimeState — state machine phases for council dispatch flow.
 */

export type CouncilRuntimeState =
  | { phase: "idle" }
  | { phase: "routing_input"; userMessageId: string }
  | { phase: "fast_replying"; userMessageId: string; route: "chitchat" | "light_response" }
  | { phase: "building_task_frame"; userMessageId: string }
  | { phase: "deciding_engagement"; userMessageId: string; taskFrameId: string }
  | { phase: "preparing_dispatch"; userMessageId: string; taskFrameId: string }
  | { phase: "awaiting_dispatch_confirmation"; userMessageId: string; taskFrameId: string; dispatchPreviewId: string }
  | { phase: "running_council_round"; userMessageId: string; taskFrameId: string; finalSelectedRoleIds: string[] }
  | { phase: "awaiting_user_next_action"; userMessageId: string; roundId: string }
  | { phase: "finalizing"; roundId: string; finalizeAction: string }
  | { phase: "cancelled"; userMessageId: string; reason?: string };
