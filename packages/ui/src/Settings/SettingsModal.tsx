import React, { useState, useEffect } from "react";
import type { LLMSettingsView, SaveLLMSettingsInput, TestConnectionResult } from "../AgoraBridge.js";
import { styles } from "./settingsStyles.js";

interface SettingsModalProps {
  onClose: () => void;
  onConfigChanged: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ onClose, onConfigChanged }) => {
  const [loading, setLoading] = useState(true);
  const [provider, setProvider] = useState("mock");
  const [model, setModel] = useState("mock");
  const [baseUrl, setBaseUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [timeoutMs, setTimeoutMs] = useState(60000);
  const [maxOutputTokens, setMaxOutputTokens] = useState(2000);
  const [keyStatus, setKeyStatus] = useState<LLMSettingsView["keyStatus"]>({ hasApiKey: false, maskedKey: null, source: "missing" });
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [testResult, setTestResult] = useState<TestConnectionResult | null>(null);
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    window.agora.settings.getLLM().then((view) => {
      setProvider(view.provider);
      setModel(view.model);
      setBaseUrl(view.baseUrl);
      setTimeoutMs(view.timeoutMs);
      setMaxOutputTokens(view.maxOutputTokens);
      setKeyStatus(view.keyStatus);
      setLoading(false);
    });
  }, []);

  const handleSave = async () => {
    setSaving(true);
    const input: SaveLLMSettingsInput = {
      provider,
      model,
      baseUrl: baseUrl || undefined,
      timeoutMs,
      maxOutputTokens,
    };
    if (apiKey.trim()) {
      input.apiKey = apiKey.trim();
    }
    const view = await window.agora.settings.saveLLM(input);
    setKeyStatus(view.keyStatus);
    setApiKey("");
    setSaving(false);
    onConfigChanged();
  };

  const handleClearKey = async () => {
    const view = await window.agora.settings.clearApiKey();
    setKeyStatus(view.keyStatus);
    setApiKey("");
    onConfigChanged();
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    const result = await window.agora.settings.testConnection();
    setTestResult(result);
    setTesting(false);
  };

  if (loading) {
    return (
      <div style={styles.overlay} onClick={onClose}>
        <div style={styles.panel} onClick={(e) => e.stopPropagation()}>
          <div style={styles.loading}>Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.panel} onClick={(e) => e.stopPropagation()}>
        <div style={styles.header}>
          <span>Model Settings</span>
          <button style={styles.closeBtn} onClick={onClose}>x</button>
        </div>

        <div style={styles.body}>
          <label style={styles.label}>Provider</label>
          <select style={styles.select} value={provider} onChange={(e) => setProvider(e.target.value)}>
            <option value="mock">Mock (testing)</option>
            <option value="openai_compatible">OpenAI Compatible</option>
          </select>

          <label style={styles.label}>Model</label>
          <input style={styles.input} value={model} onChange={(e) => setModel(e.target.value)} placeholder="gpt-4o-mini" />

          <label style={styles.label}>Base URL</label>
          <input style={styles.input} value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} placeholder="https://api.openai.com/v1" />

          <label style={styles.label}>API Key</label>
          <div style={styles.keyRow}>
            <input
              style={{ ...styles.input, flex: 1 }}
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={keyStatus.hasApiKey ? "Enter new key to replace" : "sk-..."}
            />
            {keyStatus.hasApiKey && (
              <button style={styles.clearBtn} onClick={handleClearKey}>Clear</button>
            )}
          </div>
          <div style={styles.keyStatus}>
            {keyStatus.source === "missing" && <span style={styles.statusMissing}>No key configured</span>}
            {keyStatus.source === "env" && <span style={styles.statusEnv}>Using env var ({keyStatus.maskedKey})</span>}
            {keyStatus.source === "session" && <span style={styles.statusSaved}>Session key ({keyStatus.maskedKey})</span>}
            {keyStatus.source === "saved" && <span style={styles.statusSaved}>Saved ({keyStatus.maskedKey})</span>}
          </div>

          <button style={styles.advancedToggle} onClick={() => setShowAdvanced(!showAdvanced)}>
            {showAdvanced ? "Hide" : "Show"} Advanced
          </button>
          {showAdvanced && (
            <>
              <label style={styles.label}>Timeout (ms)</label>
              <input style={styles.input} type="number" value={timeoutMs} onChange={(e) => setTimeoutMs(Number(e.target.value))} />
              <label style={styles.label}>Max Output Tokens</label>
              <input style={styles.input} type="number" value={maxOutputTokens} onChange={(e) => setMaxOutputTokens(Number(e.target.value))} />
            </>
          )}

          <div style={styles.actions}>
            <button style={styles.saveBtn} onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : "Save"}
            </button>
            <button style={styles.testBtn} onClick={handleTest} disabled={testing}>
              {testing ? "Testing..." : "Test Connection"}
            </button>
          </div>

          {testResult && (
            <div style={testResult.ok ? styles.testSuccess : styles.testError}>
              {testResult.ok ? `Connected (${testResult.latencyMs}ms)` : `Failed: ${testResult.error}`}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
