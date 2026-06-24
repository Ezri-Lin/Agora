import { ipcMain, dialog, BrowserWindow } from "electron";
import { join, extname, basename, resolve } from "node:path";
import { mkdir, writeFile, readFile, readdir, access } from "node:fs/promises";
import { watch, type FSWatcher } from "node:fs";
import { assertInWorkspace, assertAllowedFileType, isAllowedExtension } from "./safety.js";
import { auditLog } from "./audit.js";
import { assertSenderIsMain } from "./sender.js";

async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

const SCAN_EXTENSIONS = new Set([
  // Docs
  ".md", ".txt", ".rst", ".adoc",
  // Config
  ".json", ".jsonl", ".yaml", ".yml", ".toml", ".ini", ".cfg", ".conf",
  // Code
  ".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs",
  ".py", ".pyi", ".pyx",
  ".rs", ".go", ".java", ".kt", ".kts",
  ".rb", ".php",
  ".c", ".cpp", ".h", ".hpp", ".cc",
  ".swift", ".m", ".mm",
  ".sh", ".bash", ".zsh", ".fish",
  ".sql", ".graphql", ".gql",
  // Web
  ".html", ".htm", ".css", ".scss", ".less", ".svg",
  // Data
  ".csv", ".tsv", ".xml",
  // Build
  ".lock", ".gradle", ".cmake", ".makefile",
]);

// --- Recent Workspaces ---

interface RecentWorkspace {
  path: string;
  name: string;
  lastOpened: string;
}

function getRecentPath(): string {
  const { app } = require("electron");
  return join(app.getPath("userData"), "recent-workspaces.json");
}

async function readRecent(): Promise<RecentWorkspace[]> {
  try {
    return JSON.parse(await readFile(getRecentPath(), "utf-8"));
  } catch {
    return [];
  }
}

async function writeRecent(list: RecentWorkspace[]): Promise<void> {
  await writeFile(getRecentPath(), JSON.stringify(list, null, 2));
}

async function recordWorkspace(path: string, name: string): Promise<void> {
  const list = await readRecent();
  const filtered = list.filter((w) => w.path !== path);
  filtered.unshift({ path, name, lastOpened: new Date().toISOString() });
  await writeRecent(filtered.slice(0, 10));
}

// --- File Watcher ---

let currentWatcher: FSWatcher | null = null;
let watchedWorkspacePath: string | null = null;
let debounceTimer: ReturnType<typeof setTimeout> | null = null;

function startWatching(workspacePath: string, getMainWindow: () => BrowserWindow | null): void {
  // Stop existing watcher
  stopWatching();

  try {
    currentWatcher = watch(workspacePath, { recursive: true }, (eventType, filename) => {
      if (!filename) return;

      // Ignore hidden files and .agora directory
      if (filename.startsWith(".") || filename.startsWith(".agora")) return;

      // Debounce: wait 300ms after last change
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        const win = getMainWindow();
        if (win && !win.isDestroyed()) {
          win.webContents.send("workspace:docsChanged", { path: workspacePath });
        }
        auditLog("workspace:docsChanged", { target: workspacePath, detail: filename });
      }, 300);
    });

    watchedWorkspacePath = workspacePath;
    console.log("[workspace] Started watching:", workspacePath);
  } catch (err) {
    console.error("[workspace] Failed to start watcher:", err);
  }
}

function stopWatching(): void {
  if (debounceTimer) {
    clearTimeout(debounceTimer);
    debounceTimer = null;
  }
  if (currentWatcher) {
    currentWatcher.close();
    currentWatcher = null;
    watchedWorkspacePath = null;
    console.log("[workspace] Stopped watching");
  }
}

// --- Register ---

export function registerWorkspaceHandlers(getMainWindow: () => BrowserWindow | null): void {
  ipcMain.handle("workspace:getRecent", async () => readRecent());

  ipcMain.handle("workspace:removeRecent", async (_e: any, workspacePath: string) => {
    assertSenderIsMain(_e);
    await writeRecent((await readRecent()).filter((w) => w.path !== workspacePath));
  });

  ipcMain.handle("workspace:openDialog", async () => {
    const win = getMainWindow();
    if (!win) return null;
    const result = await dialog.showOpenDialog(win, {
      properties: ["openDirectory"],
      title: "Open Workspace",
    });
    if (result.canceled || result.filePaths.length === 0) return null;
    return result.filePaths[0];
  });

  ipcMain.handle("workspace:init", async (_e: any, workspacePath: string) => {
    assertSenderIsMain(_e);
    const resolved = resolve(workspacePath);
    const agoraDir = join(resolved, ".agora");
    for (const dir of [agoraDir, join(agoraDir, "rooms"), join(agoraDir, "memory")]) {
      if (!(await fileExists(dir))) await mkdir(dir, { recursive: true });
    }
    const bootPath = join(agoraDir, "BOOT.md");
    if (!(await fileExists(bootPath))) {
      await writeFile(bootPath, `# Agora Workspace\n\nWorkspace: ${basename(resolved)}\n`);
    }
    auditLog("workspace:init", { target: resolved });
    await recordWorkspace(resolved, basename(resolved));

    // Start file watcher
    startWatching(resolved, getMainWindow);

    return { path: resolved, name: basename(resolved) };
  });

  ipcMain.handle("workspace:listDocs", async (_e: any, workspacePath: string) => {
    assertInWorkspace(workspacePath, workspacePath);
    const results: Array<{ path: string; name: string; ext: string }> = [];
    async function scan(dir: string, depth: number) {
      if (depth > 6) return;
      const entries = await readdir(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.name.startsWith(".")) continue;
        const fullPath = join(dir, entry.name);
        if (entry.isDirectory()) {
          await scan(fullPath, depth + 1);
        } else if (SCAN_EXTENSIONS.has(extname(entry.name).toLowerCase())) {
          results.push({ path: fullPath, name: entry.name, ext: extname(entry.name).toLowerCase() });
        }
      }
    }
    await scan(workspacePath, 0);
    return results;
  });

  ipcMain.handle("workspace:readDoc", async (_e: any, workspaceRoot: string, filePath: string) => {
    assertInWorkspace(filePath, workspaceRoot);
    assertAllowedFileType(filePath);
    if (!(await fileExists(filePath))) return null;
    return readFile(filePath, "utf-8");
  });
}
