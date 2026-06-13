import { ipcMain } from "electron";
import { randomUUID } from "node:crypto";
import { getApiKey } from "./llm-config.js";
import { auditLog } from "./audit.js";

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
        return { content: "**Summary**\n\nThe council discussed the topic from multiple angles. Key points:\n- Skeptic raised concerns about assumptions\n- Historian provided contextual parallels\n- Strategist suggested concrete next steps\n\n**Consensus**: Proceed with validation of core assumptions.", thinking: "Analyzing role responses. Skeptic raised valid concerns about untested assumptions. Historian provided relevant parallels. Strategist gave actionable steps. Synthesizing..." };
      }
      if (sysMsg.includes("Scene Analysis")) {
        return { content: `**Analysis**\n\nTopic: ${lastMsg.slice(0, 100)}\n\nThis requires multi-dimensional examination.`, thinking: `Parsing topic: "${lastMsg.slice(0, 60)}". Identifying key dimensions and potential risks.` };
      }
      return { content: `[${config.model}] Response to: ${lastMsg.slice(0, 150)}` };
    }

    // Real provider — session key takes priority over env var
    const envKey = config.apiKeyEnv ?? "OPENAI_API_KEY";
    const apiKey = getApiKey() ?? process.env[envKey];
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
      const thinking = data.choices?.[0]?.message?.reasoning_content ?? "";
      const rawToolCalls = data.choices?.[0]?.message?.tool_calls;

      // Parse tool calls if present
      const toolCalls = rawToolCalls?.map((tc: any) => ({
        id: tc.id,
        name: tc.function?.name ?? "unknown",
        args: parseToolCallArgs(tc.function?.arguments),
      }));

      if (!content && (!toolCalls || toolCalls.length === 0)) {
        throw new Error("empty_response: API returned no content");
      }

      auditLog("llm:chat", { detail: `${config.provider}/${config.model}`, ok: true });
      return {
        content,
        thinking: thinking || undefined,
        toolCalls: toolCalls && toolCalls.length > 0 ? toolCalls : undefined,
      };
    } catch (err: any) {
      auditLog("llm:chat", { detail: `${config.provider}/${config.model}`, ok: false, error: err.message });
      if (err.name === "AbortError") throw new Error("timeout: Request timed out after 60s");
      if (err.code === "ECONNREFUSED" || err.code === "ENOTFOUND") throw new Error(`network_error: ${err.message}`);
      throw err;
    } finally {
      clearTimeout(timeout);
    }
  });

  // Streaming handler — returns streamId immediately, sends chunks via events
  ipcMain.handle("llm:chatStream", async (
    e: any,
    params: {
      messages: ChatMessage[];
      config: { provider: string; model: string; apiKeyEnv?: string; baseUrl?: string };
    },
  ) => {
    const { config, messages } = params;
    const streamId = randomUUID();

    // Mock streaming — simulate word-by-word
    if (config.provider === "mock") {
      const lastMsg = messages[messages.length - 1]?.content ?? "";
      const sysMsg = messages[0]?.content ?? "";
      let fullText: string;
      if (sysMsg.includes("Select Roles") || sysMsg.includes("role IDs")) {
        fullText = JSON.stringify(["skeptic_critic", "historian", "product_strategist"]);
      } else if (sysMsg.includes("Summarize")) {
        fullText = "**Summary**\n\nThe council discussed the topic from multiple angles. Key points:\n- Skeptic raised concerns about assumptions\n- Historian provided contextual parallels\n- Strategist suggested concrete next steps\n\n**Consensus**: Proceed with validation of core assumptions.";
      } else if (sysMsg.includes("Scene Analysis")) {
        fullText = `**Analysis**\n\nTopic: ${lastMsg.slice(0, 100)}\n\nThis requires multi-dimensional examination.`;
      } else {
        fullText = `[${config.model}] Response to: ${lastMsg.slice(0, 150)}`;
      }

      const words = fullText.split(" ");
      (async () => {
        for (const word of words) {
          await new Promise((r) => setTimeout(r, 30 + Math.random() * 70));
          e.sender.send("llm:chunk", { streamId, delta: word + " " });
        }
        e.sender.send("llm:done", { streamId, fullContent: fullText });
      })();

      return { streamId };
    }

    // Real provider — SSE streaming
    const envKey = config.apiKeyEnv ?? "OPENAI_API_KEY";
    const apiKey = getApiKey() ?? process.env[envKey];
    if (!apiKey) {
      throw new Error(`missing_api_key: No API key found (set in Settings or env var ${envKey})`);
    }

    const baseUrl = (config.baseUrl ?? "https://api.openai.com/v1").replace(/\/$/, "");
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 120_000);

    (async () => {
      let fullContent = "";
      let fullThinking = "";
      try {
        const res = await fetch(`${baseUrl}/chat/completions`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
          body: JSON.stringify({ model: config.model, messages, max_tokens: 2000, temperature: 0.7, stream: true }),
          signal: controller.signal,
        });

        if (!res.ok) {
          const text = await res.text().catch(() => "");
          e.sender.send("llm:streamError", { streamId, error: `api_error_${res.status}: ${text}` });
          return;
        }

        const reader = res.body!.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop()!;
          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const data = line.slice(6);
            if (data === "[DONE]") continue;
            try {
              const parsed = JSON.parse(data);
              const delta = parsed.choices?.[0]?.delta;
              if (!delta) continue;
              const contentDelta = delta.content ?? "";
              const thinkingDelta = delta.reasoning_content ?? "";
              if (contentDelta) fullContent += contentDelta;
              if (thinkingDelta) fullThinking += thinkingDelta;
              if (contentDelta || thinkingDelta) {
                e.sender.send("llm:chunk", { streamId, delta: contentDelta, thinkingDelta });
              }
            } catch { /* skip malformed chunks */ }
          }
        }

        e.sender.send("llm:done", { streamId, fullContent, fullThinking: fullThinking || undefined });
        auditLog("llm:chatStream", { detail: `${config.provider}/${config.model}`, ok: true });
      } catch (err: any) {
        const msg = err.name === "AbortError" ? "timeout: Request timed out" : err.message;
        e.sender.send("llm:streamError", { streamId, error: msg });
        auditLog("llm:chatStream", { detail: `${config.provider}/${config.model}`, ok: false, error: msg });
      } finally {
        clearTimeout(timeout);
      }
    })();

    return { streamId };
  });
}

function parseToolCallArgs(raw: string): Record<string, any> {
  try {
    return JSON.parse(raw);
  } catch {
    return { raw };
  }
}
