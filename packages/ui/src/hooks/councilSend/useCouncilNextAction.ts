/**
 * UseCouncilNextAction — handle post-round user actions.
 *
 * After council round completes, shows action chips:
 * - host_synthesize → summary only
 * - finalize_decision → summary + memory candidates
 * - write_doc_candidate → plan → diff → confirm
 * - continue_discussion → new round
 * - ask_specific_role → targeted follow-up
 * - discard → close without memory
 *
 * TODO: Wire up to actual moderator/runner calls.
 */

import type { UserNextAction } from "@agora/shared";

interface HandleNextActionResult {
  handled: boolean;
  action?: string;
}

/**
 * Process a user's next action after council round.
 * v1 skeleton: validates action and returns what should happen.
 */
export function handleCouncilNextAction(action: UserNextAction): HandleNextActionResult {
  switch (action.kind) {
    case "host_synthesize":
      // TODO: Call moderator.summarize() with round messages
      return { handled: true, action: "summarize" };

    case "finalize_decision":
      // TODO: Call moderator.summarize() + extractMemories()
      return { handled: true, action: "finalize" };

    case "write_doc_candidate":
      // TODO: Generate DocumentChangePlan / DiffPreview
      return { handled: true, action: "write_doc" };

    case "continue_discussion":
      // TODO: Start new round with instruction
      return { handled: true, action: "continue" };

    case "ask_specific_role":
      // TODO: Targeted follow-up to specific role
      return { handled: true, action: "ask_role" };

    case "discard":
      // TODO: Clear round state, no memory write
      return { handled: true, action: "discard" };
  }
}
