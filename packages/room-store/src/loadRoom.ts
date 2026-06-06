import type { CouncilRoom, CouncilMessage } from "@agora/shared";
import { readJSON, readJSONL } from "./fs-utils.js";
import { roomDir } from "./paths.js";

export interface LoadedRoom {
  room: CouncilRoom;
  messages: CouncilMessage[];
}

export async function loadRoom(
  workspaceRoot: string,
  roomId: string,
): Promise<LoadedRoom> {
  const dir = roomDir(workspaceRoot, roomId);
  const room = await readJSON<CouncilRoom>(`${dir}/room.json`);
  const messages = await readJSONL<CouncilMessage>(`${dir}/messages.jsonl`);
  return { room, messages };
}
