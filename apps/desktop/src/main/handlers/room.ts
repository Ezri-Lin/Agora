import { ipcMain } from "electron";
import { join } from "node:path";
import { mkdir, writeFile, readFile, readdir, rm } from "node:fs/promises";
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
  ipcMain.handle("room:list", async (_e: any, workspaceRoot: string) => {
    assertInWorkspace(workspaceRoot, workspaceRoot);
    const root = roomsRoot(workspaceRoot);
    if (!existsSync(root)) return [];
    const entries = await readdir(root, { withFileTypes: true });
    const rooms: Array<{ id: string; title: string; createdAt: string }> = [];
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const roomFile = join(root, entry.name, "room.json");
      if (!existsSync(roomFile)) continue;
      try {
        const data = JSON.parse(await readFile(roomFile, "utf-8"));
        rooms.push({ id: data.id, title: data.title, createdAt: data.createdAt });
      } catch {
        // skip corrupt room
      }
    }
    rooms.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return rooms;
  });

  ipcMain.handle("room:load", async (_e: any, workspaceRoot: string, roomId: string) => {
    const rid = assertValidRoomPath(workspaceRoot, roomId);
    const dir = join(roomsRoot(workspaceRoot), rid);
    const roomFile = join(dir, "room.json");
    if (!existsSync(roomFile)) return null;
    const room = JSON.parse(await readFile(roomFile, "utf-8"));
    const msgFile = join(dir, "messages.jsonl");
    let messages: any[] = [];
    if (existsSync(msgFile)) {
      const raw = await readFile(msgFile, "utf-8");
      if (raw.trim()) {
        messages = raw.trim().split("\n").map((line: string) => {
          try { return JSON.parse(line); } catch { return null; }
        }).filter((m: any) => m !== null);
      }
    }
    return { room, messages };
  });

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

  ipcMain.handle("room:getMemories", async (_e: any, ws: string) => {
    const memFile = join(ws, ".agora", "memory", "memories.jsonl");
    if (!existsSync(memFile)) return [];
    const raw = await readFile(memFile, "utf-8");
    if (!raw.trim()) return [];
    return raw
      .trim()
      .split("\n")
      .map((line: string) => {
        try { return JSON.parse(line); } catch { return null; }
      })
      .filter((m: any) => m !== null && m.status === "accepted");
  });

  ipcMain.handle("room:getAllMemories", async (_e: any, ws: string) => {
    const memFile = join(ws, ".agora", "memory", "memories.jsonl");
    if (!existsSync(memFile)) return [];
    const raw = await readFile(memFile, "utf-8");
    if (!raw.trim()) return [];
    return raw
      .trim()
      .split("\n")
      .map((line: string) => {
        try { return JSON.parse(line); } catch { return null; }
      })
      .filter((m: any) => m !== null);
  });

  ipcMain.handle("room:updateMemoryStatus", async (_e: any, ws: string, memoryId: string, status: "accepted" | "rejected") => {
    assertSenderIsMain(_e);
    const memFile = join(ws, ".agora", "memory", "memories.jsonl");
    if (!existsSync(memFile)) return;
    const raw = await readFile(memFile, "utf-8");
    if (!raw.trim()) return;
    const memories = raw
      .trim()
      .split("\n")
      .map((line: string) => {
        try { return JSON.parse(line); } catch { return null; }
      })
      .filter((m: any) => m !== null);
    const idx = memories.findIndex((m: any) => m.id === memoryId);
    if (idx === -1) return;
    memories[idx].status = status;
    const content = memories.map((m: any) => JSON.stringify(m)).join("\n") + "\n";
    await writeFile(memFile, content);
    auditLog("room:updateMemoryStatus", { target: ws, detail: `${memoryId} → ${status}` });
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

  ipcMain.handle("room:delete", async (_e: any, ws: string, roomId: string) => {
    assertSenderIsMain(_e);
    const rid = assertValidRoomPath(ws, roomId);
    const dir = join(roomsRoot(ws), rid);
    if (existsSync(dir)) {
      await rm(dir, { recursive: true, force: true });
      auditLog("room:delete", { target: `${ws}/${rid}` });
    }
  });

  ipcMain.handle("room:rename", async (_e: any, ws: string, roomId: string, title: string) => {
    assertSenderIsMain(_e);
    const rid = assertValidRoomPath(ws, roomId);
    const roomFile = join(roomsRoot(ws), rid, "room.json");
    if (!existsSync(roomFile)) return;
    const room = JSON.parse(await readFile(roomFile, "utf-8"));
    room.title = title;
    room.updatedAt = new Date().toISOString();
    await writeFile(roomFile, JSON.stringify(room, null, 2));
    auditLog("room:rename", { target: `${ws}/${rid}`, detail: title });
  });
}
