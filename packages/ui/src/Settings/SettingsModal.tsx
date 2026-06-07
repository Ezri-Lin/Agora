import React, { useState, useEffect } from "react";
import type { LLMSettingsView, SaveLLMSettingsInput, TestConnectionResult } from "../AgoraBridge.js";
import { colors } from "../theme/tokens.js";

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
          {/* Provider */}
          <label style={styles.label}>Provider</label>
          <select
            style={styles.select}
            value={provider}
            onChange={(e) => setProvider(e.target.value)}
          >
            <option value="mock">Mock (testing)</option>
            <option value="openai_compatible">OpenAI Compatible</option>
          </select>

          {/* Model */}
          <label style={styles.label}>Model</label>
          <input
            style={styles.input}
            value={model}
            onChange={(e) => setModel(e.target.value)}
            placeholder="gpt-4o-mini"
          />

          {/* Base URL */}
          <label style={styles.label}>Base URL</label>
          <input
            style={styles.input}
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value)}
            placeholder="https://api.openai.com/v1"
          />

          {/* API Key */}
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

          {/* Advanced */}
          <button
            style={styles.advancedToggle}
            onClick={() => setShowAdvanced(!showAdvanced)}
          >
            {showAdvanced ? "Hide" : "Show"} Advanced
          </button>
          {showAdvanced && (
            <>
              <label style={styles.label}>Timeout (ms)</label>
              <input
                style={styles.input}
                type="number"
                value={timeoutMs}
                onChange={(e) => setTimeoutMs(Number(e.target.value))}
              />
              <label style={styles.label}>Max Output Tokens</label>
              <input
                style={styles.input}
                type="number"
                value={maxOutputTokens}
                onChange={(e) => setMaxOutputTokens(Number(e.target.value))}
              />
            </>
          )}

          {/* Actions */}
          <div style={styles.actions}>
            <button style={styles.saveBtn} onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : "Save"}
            </button>
            <button style={styles.testBtn} onClick={handleTest} disabled={testing}>
              {testing ? "Testing..." : "Test Connection"}
            </button>
          </div>

          {/* Test Result */}
          {testResult && (
            <div style={testResult.ok ? styles.testSuccess : styles.testError}>
              {testResult.ok
                ? `Connected (${testResult.latencyMs}ms)`
                : `Failed: ${testResult.error}`}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.4)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 100,
  },
  panel: {
    background: colors.surface,
    border: `1px solid ${colors.border}`,
    borderRadius: 12,
    width: 440,
    maxHeight: "80vh",
    display: "flex",
    flexDirection: "column",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "12px 16px",
    borderBottom: `1px solid ${colors.border}`,
    fontSize: 14,
    fontWeight: 600,
    color: colors.text,
  },
  closeBtn: {
    background: "none",
    border: "none",
    color: colors.textMuted,
    cursor: "pointer",
    fontSize: 16,
  },
  body: {
    padding: "12px 16px",
    overflowY: "auto",
    display: "flex",
    flexDirection: "column",
    gap: 6,
  },
  loading: {
    padding: 40,
    textAlign: "center",
    color: colors.textMuted,
    fontSize: 13,
  },
  label: {
    fontSize: 11,
    fontWeight: 600,
    color: colors.textMuted,
    marginTop: 6,
    textTransform: "uppercase" as const,
    letterSpacing: 0.5,
  },
  input: {
    background: colors.bg,
    border: `1px solid ${colors.border}`,
    borderRadius: 6,
    padding: "6px 10px",
    fontSize: 13,
    color: colors.text,
    outline: "none",
    width: "100%",
    boxSizing: "border-box" as const,
  },
  select: {
    background: colors.bg,
    border: `1px solid ${colors.border}`,
    borderRadius: 6,
    padding: "6px 10px",
    fontSize: 13,
    color: colors.text,
    outline: "none",
    width: "100%",
  },
  keyRow: {
    display: "flex",
    gap: 6,
    alignItems: "center",
  },
  clearBtn: {
    background: "none",
    border: `1px solid ${colors.border}`,
    borderRadius: 6,
    padding: "6px 10px",
    fontSize: 11,
    color: colors.textMuted,
    cursor: "pointer",
    whiteSpace: "nowrap" as const,
  },
  keyStatus: {
    fontSize: 11,
    marginTop: 2,
  },
  statusMissing: { color: "#e74c3c" },
  statusEnv: { color: colors.textMuted },
  statusSaved: { color: "#27ae60" },
  advancedToggle: {
    background: "none",
    border: "none",
    color: colors.accent,
    fontSize: 11,
    cursor: "pointer",
    textAlign: "left" as const,
    padding: "4px 0",
    marginTop: 4,
  },
  actions: {
    display: "flex",
    gap: 8,
    marginTop: 12,
  },
  saveBtn: {
    flex: 1,
    background: colors.accent,
    border: "none",
    borderRadius: 6,
    padding: "8px 0",
    color: "#fff",
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
  },
  testBtn: {
    flex: 1,
    background: "none",
    border: `1px solid ${colors.border}`,
    borderRadius: 6,
    padding: "8px 0",
    color: colors.text,
    fontSize: 13,
    cursor: "pointer",
  },
  testSuccess: {
    marginTop: 8,
    padding: "6px 10px",
    borderRadius: 6,
    background: "rgba(39,174,96,0.1)",
    border: "1px solid rgba(39,174,96,0.3)",
    color: "#27ae60",
    fontSize: 12,
  },
  testError: {
    marginTop: 8,
    padding: "6px 10px",
    borderRadius: 6,
    background: "rgba(231,76,60,0.1)",
    border: "1px solid rgba(231,76,60,0.3)",
    color: "#e74c3c",
    fontSize: 12,
  },
};
