import type { CouncilMessage } from "@agora/shared";
import { appendJSONL } from "./fs-utils.js";
import { roomDir } from "./paths.js";

export async function appendMessage(
  workspaceRoot: string,
  roomId: string,
  message: CouncilMessage,
): Promise<void> {
  const dir = roomDir(workspaceRoot, roomId);
  await appendJSONL(`${dir}/messages.jsonl`, message);
}
