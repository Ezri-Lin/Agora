/**
 * PersistInviteGateState — update room.inviteGateState after dispatch.
 *
 * Small wrapper around bridge.room.update for invite gate persistence.
 */

import type { InviteGateState, TaskFrame } from "@agora/shared";
import { buildTaskFingerprint } from "@agora/kernel";

interface PersistInviteGateStateInput {
  workspacePath: string;
  roomId: string;
  roundId: string;
  taskFrame: TaskFrame;
  bridge: {
    room: {
      update: (ws: string, roomId: string, patch: Record<string, unknown>) => Promise<void>;
    };
  };
}

/**
 * Persist invite gate state as cooldown after successful dispatch.
 */
export async function persistInviteGateState(input: PersistInviteGateStateInput): Promise<void> {
  const { workspacePath, roomId, roundId, taskFrame, bridge } = input;

  const inviteGateState: InviteGateState = {
    status: "cooldown",
    lastInviteRoundId: roundId,
    lastInviteTaskFingerprint: buildTaskFingerprint(taskFrame),
    lastInviteAt: new Date().toISOString(),
  };

  await bridge.room.update(workspacePath, roomId, { inviteGateState });
}
