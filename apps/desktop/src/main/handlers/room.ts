import { ipcMain } from "electron";
import { join } from "node:path";
import { mkdir, writeFile, readFile, readdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { assertInWorkspace, sanitizeRoomId } from "./safety.js";
import { auditLog } from "./audit.js";
import { assertSenderIsMain } from "./sender.js";

function roomsRoot(workspaceRoot: string): string {
  return join(workspaceRoot, ".agora", "rooms");
}

function assertValidRoomPath(ws: string, roomId: string): string {
  assertInWorkspace(ws, ws);
  const sanitized = sanitizeRoomId(roomId);
  const roomDir = join(roomsRoot(ws), sanitized);
  assertInWorkspace(roomDir, ws);
  return sanitized;
}

export function registerRoomHandlers(): void {
  ipcMain.handle("room:create", async (_e: any, workspaceRoot: string, room: any) => {
    assertSenderIsMain(_e);
    const rid = assertValidRoomPath(workspaceRoot, room.id);
    const dir = join(roomsRoot(workspaceRoot), rid);
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
    auditLog("room:create", { target: `${workspaceRoot}/${rid}`, detail: room.title });
    return room;
  });

  ipcMain.handle("room:appendMessage", async (_e: any, ws: string, roomId: string, message: any) => {
    assertSenderIsMain(_e);
    const rid = assertValidRoomPath(ws, roomId);
    const line = JSON.stringify(message);
    await writeFile(join(roomsRoot(ws), rid, "messages.jsonl"), line + "\n", { flag: "a" });
    auditLog("room:appendMessage", { target: `${ws}/${rid}`, detail: message.senderType });
  });

  ipcMain.handle("room:writeSummary", async (_e: any, ws: string, roomId: string, summary: string) => {
    assertSenderIsMain(_e);
    const rid = assertValidRoomPath(ws, roomId);
    await writeFile(join(roomsRoot(ws), rid, "summary.md"), `# Summary\n\n${summary}\n`);
    auditLog("room:writeSummary", { target: `${ws}/${rid}` });
  });

  ipcMain.handle("room:writeMemoryCandidates", async (_e: any, ws: string, roomId: string, content: string) => {
    assertSenderIsMain(_e);
    const rid = assertValidRoomPath(ws, roomId);
    await writeFile(join(roomsRoot(ws), rid, "memory-candidates.md"), content);
    auditLog("room:writeMemoryCandidates", { target: `${ws}/${rid}` });
  });

  ipcMain.handle("room:exportSession", async (_e: any, ws: string, roomId: string, content: string) => {
    assertSenderIsMain(_e);
    const rid = assertValidRoomPath(ws, roomId);
    await writeFile(join(roomsRoot(ws), rid, "exports", "session.md"), content);
    auditLog("room:exportSession", { target: `${ws}/${rid}` });
  });

  ipcMain.handle("room:readMessages", async (_e: any, ws: string, roomId: string) => {
    const rid = assertValidRoomPath(ws, roomId);
    const file = join(roomsRoot(ws), rid, "messages.jsonl");
    if (!existsSync(file)) return [];
    const raw = await readFile(file, "utf-8");
    if (!raw.trim()) return [];
    return raw.trim().split("\n").map((line: string) => JSON.parse(line));
  });

  ipcMain.handle("room:listOutputs", async (_e: any, ws: string, roomId: string) => {
    const rid = assertValidRoomPath(ws, roomId);
    const dir = join(roomsRoot(ws), rid);
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
