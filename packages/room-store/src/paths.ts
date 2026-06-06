export function roomsRoot(workspaceRoot: string): string {
  return `${workspaceRoot}/.agora/rooms`;
}

export function roomDir(workspaceRoot: string, roomId: string): string {
  return `${roomsRoot(workspaceRoot)}/${roomId}`;
}
