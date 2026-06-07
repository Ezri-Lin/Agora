import { ipcMain, app } from "electron";
import { join } from "node:path";
import { readFile, writeFile } from "node:fs/promises";
import { readFileSync } from "node:fs";

// --- Session API key (in-memory only, never persisted) ---

let sessionApiKey: string | null = null;

export function getSessionApiKey(): string | null {
  return sessionApiKey;
}

// --- Config file ---

interface SavedLLMConfig {
  provider?: string;
  model?: string;
  baseUrl?: string;
  timeoutMs?: number;
  maxOutputTokens?: number;
}

let savedConfigCache: SavedLLMConfig | null = null;

function getConfigPath(): string {
  return join(app.getPath("userData"), "llm-config.json");
}

function readSavedConfigSync(): SavedLLMConfig {
  if (savedConfigCache) return savedConfigCache;
  try {
    savedConfigCache = JSON.parse(readFileSync(getConfigPath(), "utf-8"));
    return savedConfigCache!;
  } catch {
    return {};
  }
}

async function writeSavedConfig(config: SavedLLMConfig): Promise<void> {
  savedConfigCache = config;
  await writeFile(getConfigPath(), JSON.stringify(config, null, 2));
}

export function getEffectiveConfig() {
  const saved = readSavedConfigSync();
  const provider = saved.provider ?? process.env.AGORA_LLM_PROVIDER ?? "mock";
  const model = saved.model ?? process.env.AGORA_LLM_MODEL ?? (provider === "mock" ? "mock" : "gpt-4o-mini");
  const baseUrl = saved.baseUrl ?? process.env.AGORA_LLM_BASE_URL;
  const apiKeyEnv = process.env.AGORA_LLM_API_KEY_ENV ?? (provider === "openai_compatible" ? "OPENAI_API_KEY" : undefined);
  const timeoutMs = saved.timeoutMs ?? 60_000;
  const maxOutputTokens = saved.maxOutputTokens ?? 2000;
  return { provider, model, baseUrl, apiKeyEnv, timeoutMs, maxOutputTokens };
}

function maskKey(key: string): string {
  if (key.length <= 8) return "****";
  return key.slice(0, 3) + "..." + key.slice(-4);
}

function getKeyStatus() {
  if (sessionApiKey) {
    return { hasApiKey: true, maskedKey: maskKey(sessionApiKey), source: "session" };
  }
  const envKey = process.env.AGORA_LLM_API_KEY_ENV ?? "OPENAI_API_KEY";
  const envVal = process.env[envKey];
  if (envVal) {
    return { hasApiKey: true, maskedKey: maskKey(envVal), source: "env" };
  }
  return { hasApiKey: false, maskedKey: null, source: "missing" };
}

function buildSettingsView() {
  const cfg = getEffectiveConfig();
  return {
    provider: cfg.provider,
    model: cfg.model,
    baseUrl: cfg.baseUrl ?? "",
    timeoutMs: cfg.timeoutMs,
    maxOutputTokens: cfg.maxOutputTokens,
    keyStatus: getKeyStatus(),
  };
}

// --- Register IPC handlers ---

export function registerLLMConfigHandlers(): void {
  ipcMain.handle("get-llm-config", () => {
    const cfg = getEffectiveConfig();
    return { provider: cfg.provider, model: cfg.model, apiKeyEnv: cfg.apiKeyEnv, baseUrl: cfg.baseUrl };
  });

  ipcMain.handle("settings:getLLM", async () => buildSettingsView());

  ipcMain.handle("settings:saveLLM", async (_e: any, input: {
    provider: string; model: string; baseUrl?: string;
    apiKey?: string; timeoutMs?: number; maxOutputTokens?: number;
  }) => {
    await writeSavedConfig({
      provider: input.provider,
      model: input.model,
      baseUrl: input.baseUrl || undefined,
      timeoutMs: input.timeoutMs,
      maxOutputTokens: input.maxOutputTokens,
    });
    if (input.apiKey) sessionApiKey = input.apiKey;
    console.log(`[settings] saved: ${input.provider}/${input.model}`);
    return buildSettingsView();
  });

  ipcMain.handle("settings:clearApiKey", async () => {
    sessionApiKey = null;
    console.log("[settings] API key cleared");
    return buildSettingsView();
  });

  ipcMain.handle("settings:testConnection", async () => {
    const cfg = getEffectiveConfig();
    const apiKey = sessionApiKey ?? process.env[cfg.apiKeyEnv ?? "OPENAI_API_KEY"];
    if (!apiKey) return { ok: false, error: "No API key configured" };
    if (cfg.provider === "mock") return { ok: true, latencyMs: 0 };

    const baseUrl = (cfg.baseUrl ?? "https://api.openai.com/v1").replace(/\/$/, "");
    const start = Date.now();
    try {
      const res = await fetch(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({ model: cfg.model, messages: [{ role: "user", content: "hi" }], max_tokens: 1 }),
        signal: AbortSignal.timeout(15_000),
      });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        return { ok: false, latencyMs: Date.now() - start, error: `HTTP ${res.status}: ${text.slice(0, 200)}` };
      }
      return { ok: true, latencyMs: Date.now() - start };
    } catch (err: any) {
      return { ok: false, latencyMs: Date.now() - start, error: err.message ?? "Connection failed" };
    }
  });
}
