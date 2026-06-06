import { generateId, nowISO, type CouncilRoom, type RoomSettings, type SourceRef } from "@agora/shared";
import { ensureDir, writeJSON, writeJSONL, writeText } from "./fs-utils.js";
import { roomDir } from "./paths.js";

const DEFAULT_SETTINGS: RoomSettings = {
  roleCount: 3,
  maxMessagesPerRoleBeforeUserReply: 2,
  allowAutoDocs: true,
  allowCrossExamination: true,
  generationMode: "multi_call_cached",
};

export interface CreateRoomInput {
  title: string;
  workspaceRoot: string;
  sourceRefs?: SourceRef[];
  settings?: Partial<RoomSettings>;
}

export async function createRoom(input: CreateRoomInput): Promise<CouncilRoom> {
  const room: CouncilRoom = {
    id: generateId("room"),
    title: input.title,
    workspaceId: "workspace_default",
    sourceRefs: input.sourceRefs ?? [],
    participants: [],
    settings: { ...DEFAULT_SETTINGS, ...input.settings },
    visibility: "private",
    createdAt: nowISO(),
    updatedAt: nowISO(),
  };

  const dir = roomDir(input.workspaceRoot, room.id);
  await ensureDir(`${dir}/exports`);

  await writeJSON(`${dir}/room.json`, room);
  await writeJSONL(`${dir}/messages.jsonl`, []);
  await writeText(`${dir}/context.md`, `# Context\n\nRoom: ${room.title}\n`);
  await writeText(`${dir}/summary.md`, "");
  await writeText(`${dir}/memory-candidates.md`, "");
  await writeText(`${dir}/exports/session.md`, "");

  return room;
}
