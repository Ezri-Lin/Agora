import type { WorkspaceRoot } from "./types.js";

export function roomsDir(root: WorkspaceRoot): string {
  return `${root.path}/.agora/rooms`;
}

export function roomDir(root: WorkspaceRoot, roomId: string): string {
  return `${roomsDir(root)}/${roomId}`;
}

export function memoryDir(root: WorkspaceRoot): string {
  return `${root.path}/.agora/memory`;
}
