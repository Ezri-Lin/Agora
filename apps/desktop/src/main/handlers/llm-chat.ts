import { ipcMain } from "electron";
import { getSessionApiKey } from "./llm-config.js";

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export function registerLLMChatHandlers(): void {
  ipcMain.handle("llm:chat", async (
    _e: any,
    params: {
      messages: ChatMessage[];
      config: { provider: string; model: string; apiKeyEnv?: string; baseUrl?: string };
    },
  ) => {
    const { config, messages } = params;

    // Mock provider
    if (config.provider === "mock") {
      await new Promise((r) => setTimeout(r, 200 + Math.random() * 300));
      const lastMsg = messages[messages.length - 1]?.content ?? "";
      const sysMsg = messages[0]?.content ?? "";
      if (sysMsg.includes("Select Roles") || sysMsg.includes("role IDs")) {
        return { content: JSON.stringify(["skeptic_critic", "historian", "product_strategist"]) };
      }
      if (sysMsg.includes("Summarize")) {
        return { content: "**Summary**\n\nThe council discussed the topic from multiple angles. Key points:\n- Skeptic raised concerns about assumptions\n- Historian provided contextual parallels\n- Strategist suggested concrete next steps\n\n**Consensus**: Proceed with validation of core assumptions." };
      }
      if (sysMsg.includes("Scene Analysis")) {
        return { content: `**Analysis**\n\nTopic: ${lastMsg.slice(0, 100)}\n\nThis requires multi-dimensional examination.` };
      }
      return { content: `[${config.model}] Response to: ${lastMsg.slice(0, 150)}` };
    }

    // Real provider — session key takes priority over env var
    const envKey = config.apiKeyEnv ?? "OPENAI_API_KEY";
    const apiKey = getSessionApiKey() ?? process.env[envKey];
    if (!apiKey) {
      throw new Error(`missing_api_key: No API key found (set in Settings or env var ${envKey})`);
    }

    const baseUrl = (config.baseUrl ?? "https://api.openai.com/v1").replace(/\/$/, "");
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60_000);

    try {
      const res = await fetch(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({ model: config.model, messages, max_tokens: 2000, temperature: 0.7 }),
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
      if (err.name === "AbortError") throw new Error("timeout: Request timed out after 60s");
      if (err.code === "ECONNREFUSED" || err.code === "ENOTFOUND") throw new Error(`network_error: ${err.message}`);
      throw err;
    } finally {
      clearTimeout(timeout);
    }
  });
}
