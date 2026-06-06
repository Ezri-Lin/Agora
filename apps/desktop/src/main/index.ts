const { app, BrowserWindow, ipcMain, dialog } = require("electron");
const { join, extname, basename } = require("node:path");
const { mkdir, writeFile, readFile, readdir, stat } = require("node:fs/promises");
const { existsSync } = require("node:fs");

let mainWindow: InstanceType<typeof BrowserWindow> | null = null;

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 960,
    minHeight: 600,
    title: "Agora",
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: join(__dirname, "../../src/preload/index.js"),
    },
  });

  const devUrl = process.env.VITE_DEV_SERVER_URL;
  if (devUrl) {
    mainWindow.loadURL(devUrl);
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(join(__dirname, "../renderer/index.html"));
  }
}

app.whenReady().then(() => {
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

// --- IPC: Basic ---

ipcMain.handle("get-app-version", () => app.getVersion());
ipcMain.handle("get-platform", () => process.platform);

ipcMain.handle("get-llm-config", () => {
  const provider = process.env.AGORA_LLM_PROVIDER ?? "mock";
  const model = process.env.AGORA_LLM_MODEL ?? (provider === "mock" ? "mock" : "gpt-4o-mini");
  const apiKeyEnv = process.env.AGORA_LLM_API_KEY_ENV ?? (provider === "openai_compatible" ? "OPENAI_API_KEY" : undefined);
  const baseUrl = process.env.AGORA_LLM_BASE_URL;
  // Never send actual API key to renderer
  return { provider, model, apiKeyEnv, baseUrl };
});

// --- IPC: Workspace ---

const SCAN_EXTENSIONS = new Set([".md", ".txt", ".json", ".jsonl", ".yaml", ".yml", ".toml"]);

ipcMain.handle("workspace:openDialog", async () => {
  const result = await dialog.showOpenDialog(mainWindow!, {
    properties: ["openDirectory"],
    title: "Open Workspace",
  });
  if (result.canceled || result.filePaths.length === 0) return null;
  return result.filePaths[0];
});

ipcMain.handle("workspace:init", async (_e: any, workspacePath: string) => {
  const agoraDir = join(workspacePath, ".agora");
  const dirs = [agoraDir, join(agoraDir, "rooms"), join(agoraDir, "memory")];
  for (const dir of dirs) {
    if (!existsSync(dir)) await mkdir(dir, { recursive: true });
  }
  const bootPath = join(agoraDir, "BOOT.md");
  if (!existsSync(bootPath)) {
    await writeFile(bootPath, `# Agora Workspace\n\nWorkspace: ${basename(workspacePath)}\n`);
  }
  console.log(`[workspace] initialized: ${workspacePath}`);
  return { path: workspacePath, name: basename(workspacePath) };
});

ipcMain.handle("workspace:listDocs", async (_e: any, workspacePath: string) => {
  const results: Array<{ path: string; name: string; ext: string }> = [];
  async function scan(dir: string, depth: number) {
    if (depth > 3) return;
    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name.startsWith(".")) continue;
      const fullPath = join(dir, entry.name);
      if (entry.isDirectory()) {
        await scan(fullPath, depth + 1);
      } else {
        const ext = extname(entry.name).toLowerCase();
        if (SCAN_EXTENSIONS.has(ext)) {
          results.push({ path: fullPath, name: entry.name, ext });
        }
      }
    }
  }
  await scan(workspacePath, 0);
  return results;
});

ipcMain.handle("workspace:readDoc", async (_e: any, filePath: string) => {
  if (!existsSync(filePath)) return null;
  return readFile(filePath, "utf-8");
});

// --- IPC: Room Store ---

function roomsRoot(workspaceRoot: string): string {
  return join(workspaceRoot, ".agora", "rooms");
}

ipcMain.handle("room:create", async (_e: any, workspaceRoot: string, room: any) => {
  const dir = join(roomsRoot(workspaceRoot), room.id);
  const exportsDir = join(dir, "exports");
  if (!existsSync(exportsDir)) await mkdir(exportsDir, { recursive: true });

  await writeFile(join(dir, "room.json"), JSON.stringify(room, null, 2));
  await writeFile(join(dir, "messages.jsonl"), "");

  // Build context.md from sourceRefs
  const contextLines = [`# Context`, "", `Room: ${room.title}`, ""];
  if (room.sourceRefs && room.sourceRefs.length > 0) {
    contextLines.push("## Referenced Documents", "");
    for (const ref of room.sourceRefs) {
      contextLines.push(`- ${ref.label || ref.path}`);
    }
    contextLines.push("");
  }
  await writeFile(join(dir, "context.md"), contextLines.join("\n"));

  await writeFile(join(dir, "summary.md"), "");
  await writeFile(join(dir, "memory-candidates.md"), "");
  await writeFile(join(dir, "exports", "session.md"), "");
  console.log(`[room] created: ${room.id}`);
  return room;
});

ipcMain.handle("room:appendMessage", async (_e: any, workspaceRoot: string, roomId: string, message: any) => {
  const file = join(roomsRoot(workspaceRoot), roomId, "messages.jsonl");
  await writeFile(file, JSON.stringify(message) + "\n", { flag: "a" });
});

ipcMain.handle("room:writeSummary", async (_e: any, workspaceRoot: string, roomId: string, summary: string) => {
  const file = join(roomsRoot(workspaceRoot), roomId, "summary.md");
  await writeFile(file, `# Summary\n\n${summary}\n`);
});

ipcMain.handle("room:writeMemoryCandidates", async (_e: any, workspaceRoot: string, roomId: string, content: string) => {
  const file = join(roomsRoot(workspaceRoot), roomId, "memory-candidates.md");
  await writeFile(file, content);
});

ipcMain.handle("room:exportSession", async (_e: any, workspaceRoot: string, roomId: string, content: string) => {
  const file = join(roomsRoot(workspaceRoot), roomId, "exports", "session.md");
  await writeFile(file, content);
});

ipcMain.handle("room:readMessages", async (_e: any, workspaceRoot: string, roomId: string) => {
  const file = join(roomsRoot(workspaceRoot), roomId, "messages.jsonl");
  if (!existsSync(file)) return [];
  const raw = await readFile(file, "utf-8");
  if (!raw.trim()) return [];
  return raw.trim().split("\n").map((line: string) => JSON.parse(line));
});

ipcMain.handle("room:listOutputs", async (_e: any, workspaceRoot: string, roomId: string) => {
  const dir = join(roomsRoot(workspaceRoot), roomId);
  if (!existsSync(dir)) return [];
  const files: string[] = [];
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isFile()) files.push(entry.name);
  }
  // Check exports subfolder
  const exportsDir = join(dir, "exports");
  if (existsSync(exportsDir)) {
    const exportEntries = await readdir(exportsDir, { withFileTypes: true });
    for (const entry of exportEntries) {
      if (entry.isFile()) files.push(`exports/${entry.name}`);
    }
  }
  return files;
});

// --- IPC: LLM (proxy — renderer builds prompt, main does API call) ---

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

ipcMain.handle("llm:chat", async (
  _e: any,
  params: {
    messages: ChatMessage[];
    config: { provider: string; model: string; apiKeyEnv?: string; baseUrl?: string };
  },
) => {
  const { config, messages } = params;

  if (config.provider === "mock") {
    // Simulate latency for realism
    await new Promise((r) => setTimeout(r, 200 + Math.random() * 300));
    const lastMsg = messages[messages.length - 1]?.content ?? "";
    const sysMsg = messages[0]?.content ?? "";
    // Generate contextual mock response
    if (sysMsg.includes("Select Roles") || sysMsg.includes("role IDs")) {
      return { content: JSON.stringify(["skeptic_critic", "historian", "product_strategist"]) };
    }
    if (sysMsg.includes("Summarize")) {
      return { content: "**Summary**\n\nThe council discussed the topic from multiple angles. Key points:\n- Skeptic raised concerns about assumptions\n- Historian provided contextual parallels\n- Strategist suggested concrete next steps\n\n**Consensus**: Proceed with validation of core assumptions." };
    }
    if (sysMsg.includes("Scene Analysis")) {
      return { content: `**Analysis**\n\nTopic: ${lastMsg.slice(0, 100)}\n\nThis requires multi-dimensional examination. Recommending council discussion with diverse perspectives.` };
    }
    return { content: `[${config.model}] Response to: ${lastMsg.slice(0, 150)}` };
  }

  // Normalize error types
  const envKey = config.apiKeyEnv ?? "OPENAI_API_KEY";
  const apiKey = process.env[envKey];
  if (!apiKey) {
    throw new Error(`missing_api_key: Environment variable ${envKey} is not set`);
  }

  const baseUrl = (config.baseUrl ?? "https://api.openai.com/v1").replace(/\/$/, "");

  const body = {
    model: config.model,
    messages,
    max_tokens: 2000,
    temperature: 0.7,
  };

  // Timeout: 60 seconds
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60_000);

  try {
    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      if (res.status === 401) throw new Error(`invalid_api_key: ${text}`);
      if (res.status === 429) throw new Error(`rate_limited: ${text}`);
      if (res.status === 404) throw new Error(`model_not_found: ${text}`);
      throw new Error(`api_error_${res.status}: ${text}`);
    }

    const data = (await res.json()) as any;
    const content = data.choices?.[0]?.message?.content ?? "";
    if (!content) throw new Error("empty_response: API returned no content");
    return { content };
  } catch (err: any) {
    if (err.name === "AbortError") {
      throw new Error("timeout: Request timed out after 60s");
    }
    if (err.code === "ECONNREFUSED" || err.code === "ENOTFOUND") {
      throw new Error(`network_error: ${err.message}`);
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
});
