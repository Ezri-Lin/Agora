/**
 * ConfirmCouncilDispatch — handle user confirmation of dispatch preview.
 *
 * Takes finalSelectedRoleIds from user and triggers the council round.
 * TODO: Wire up to CouncilRunner with new TaskFrame + finalSelectedRoleIds signature.
 */

import type { TaskFrame, DispatchPreview } from "@agora/shared";

interface ConfirmDispatchInput {
  taskFrame: TaskFrame;
  dispatchPreview: DispatchPreview;
  finalSelectedRoleIds: string[];
  // TODO: Add CouncilRunner, persistence, room update params
}

/**
 * Confirm dispatch and run council round.
 * v1 skeleton: logs the confirmation. TODO: wire to real runner.
 */
export async function confirmCouncilDispatch(input: ConfirmDispatchInput): Promise<void> {
  const { taskFrame, dispatchPreview, finalSelectedRoleIds } = input;

  // TODO: Replace with real CouncilRunner call
  console.log("[confirmCouncilDispatch] Would run council round:", {
    taskId: taskFrame.taskId,
    roundId: dispatchPreview.roundId,
    finalSelectedRoleIds,
    candidateCount: dispatchPreview.rankedCandidates.length,
  });

  // TODO: After round completes, update inviteGateState to cooldown
  // TODO: Persist routing decision record
}
