import { ipcMain } from "electron";
import { join } from "node:path";
import { mkdir, writeFile, readFile, readdir } from "node:fs/promises";
import { existsSync } from "node:fs";

function roomsRoot(workspaceRoot: string): string {
  return join(workspaceRoot, ".agora", "rooms");
}

export function registerRoomHandlers(): void {
  ipcMain.handle("room:create", async (_e: any, workspaceRoot: string, room: any) => {
    const dir = join(roomsRoot(workspaceRoot), room.id);
    const exportsDir = join(dir, "exports");
    if (!existsSync(exportsDir)) await mkdir(exportsDir, { recursive: true });

    await writeFile(join(dir, "room.json"), JSON.stringify(room, null, 2));
    await writeFile(join(dir, "messages.jsonl"), "");

    const contextLines = [`# Context`, "", `Room: ${room.title}`, ""];
    if (room.sourceRefs?.length > 0) {
      contextLines.push("## Referenced Documents", "");
      for (const ref of room.sourceRefs) contextLines.push(`- ${ref.label || ref.path}`);
      contextLines.push("");
    }
    await writeFile(join(dir, "context.md"), contextLines.join("\n"));
    await writeFile(join(dir, "summary.md"), "");
    await writeFile(join(dir, "memory-candidates.md"), "");
    await writeFile(join(dir, "exports", "session.md"), "");
    console.log(`[room] created: ${room.id}`);
    return room;
  });

  ipcMain.handle("room:appendMessage", async (_e: any, ws: string, roomId: string, message: any) => {
    await writeFile(join(roomsRoot(ws), roomId, "messages.jsonl"), JSON.stringify(message) + "\n", { flag: "a" });
  });

  ipcMain.handle("room:writeSummary", async (_e: any, ws: string, roomId: string, summary: string) => {
    await writeFile(join(roomsRoot(ws), roomId, "summary.md"), `# Summary\n\n${summary}\n`);
  });

  ipcMain.handle("room:writeMemoryCandidates", async (_e: any, ws: string, roomId: string, content: string) => {
    await writeFile(join(roomsRoot(ws), roomId, "memory-candidates.md"), content);
  });

  ipcMain.handle("room:exportSession", async (_e: any, ws: string, roomId: string, content: string) => {
    await writeFile(join(roomsRoot(ws), roomId, "exports", "session.md"), content);
  });

  ipcMain.handle("room:readMessages", async (_e: any, ws: string, roomId: string) => {
    const file = join(roomsRoot(ws), roomId, "messages.jsonl");
    if (!existsSync(file)) return [];
    const raw = await readFile(file, "utf-8");
    if (!raw.trim()) return [];
    return raw.trim().split("\n").map((line: string) => JSON.parse(line));
  });

  ipcMain.handle("room:listOutputs", async (_e: any, ws: string, roomId: string) => {
    const dir = join(roomsRoot(ws), roomId);
    if (!existsSync(dir)) return [];
    const files: string[] = [];
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      if (entry.isFile()) files.push(entry.name);
    }
    const exportsDir = join(dir, "exports");
    if (existsSync(exportsDir)) {
      for (const entry of await readdir(exportsDir, { withFileTypes: true })) {
        if (entry.isFile()) files.push(`exports/${entry.name}`);
      }
    }
    return files;
  });
}
