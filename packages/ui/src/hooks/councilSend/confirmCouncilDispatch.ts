/**
 * ConfirmCouncilDispatch — bridge dispatch preview to council round execution.
 *
 * Takes finalSelectedRoleIds from user and triggers the council round
 * with TaskFrame + finalSelectedRoleIds.
 */

import type { TaskFrame, DispatchPreview } from "@agora/shared";

interface ConfirmDispatchInput {
  taskFrame: TaskFrame;
  dispatchPreview: DispatchPreview;
  finalSelectedRoleIds: string[];
  runRound: (params: { taskFrame: TaskFrame; finalSelectedRoleIds: string[] }) => Promise<void>;
}

/**
 * Confirm dispatch and run council round.
 * Passes TaskFrame + finalSelectedRoleIds to the runner.
 */
export async function confirmCouncilDispatch(input: ConfirmDispatchInput): Promise<void> {
  const { taskFrame, finalSelectedRoleIds, runRound } = input;

  await runRound({
    taskFrame,
    finalSelectedRoleIds,
  });
}
