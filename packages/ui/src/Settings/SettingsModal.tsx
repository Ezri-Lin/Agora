import React, { useState, useEffect } from "react";
import type { LLMSettingsView, SaveLLMSettingsInput, TestConnectionResult } from "../AgoraBridge.js";
import { createStyles } from "./settingsStyles.js";
import { useI18n } from "../i18n/I18nContext.js";
import { useTheme } from "../theme/ThemeContext.js";
import { CustomRolesTab } from "../Inspector/CustomRolesTab.js";

type SettingsTab = "llm" | "roles";

interface SettingsModalProps {
  onClose: () => void;
  onConfigChanged: () => void;
  workspacePath?: string;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ onClose, onConfigChanged, workspacePath }) => {
  const { t } = useI18n();
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const [tab, setTab] = useState<SettingsTab>("llm");
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
          <div style={styles.loading}>{t.loading}</div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.panel} onClick={(e) => e.stopPropagation()}>
        <div style={styles.header}>
          <div style={{ display: "flex", gap: 12 }}>
            <button
              style={{ ...styles.tabBtn, ...(tab === "llm" ? styles.tabBtnActive : {}) }}
              onClick={() => setTab("llm")}
            >
              {t.modelSettings}
            </button>
            <button
              style={{ ...styles.tabBtn, ...(tab === "roles" ? styles.tabBtnActive : {}) }}
              onClick={() => setTab("roles")}
            >
              {t.roles}
            </button>
          </div>
          <button style={styles.closeBtn} onClick={onClose}>x</button>
        </div>

        <div style={styles.body}>
        {tab === "roles" ? (
          <CustomRolesTab workspacePath={workspacePath} t={t} styles={{ empty: { color: colors.textMuted, fontSize: 12, textAlign: "center" as const, padding: 20 }}} colors={colors} />
        ) : (
          <>
          <label style={styles.label}>{t.provider}</label>
          <select style={styles.select} value={provider} onChange={(e) => setProvider(e.target.value)}>
            <option value="mock">{t.mockTesting}</option>
            <option value="openai_compatible">{t.openaiCompatible}</option>
          </select>

          <label style={styles.label}>{t.model}</label>
          <input style={styles.input} value={model} onChange={(e) => setModel(e.target.value)} placeholder="gpt-4o-mini" />

          <label style={styles.label}>{t.baseUrl}</label>
          <input style={styles.input} value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} placeholder="https://api.openai.com/v1" />

          <label style={styles.label}>{t.apiKey}</label>
          <div style={styles.keyRow}>
            <input
              style={{ ...styles.input, flex: 1 }}
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={keyStatus.hasApiKey ? t.apiKey : "sk-..."}
            />
            {keyStatus.hasApiKey && (
              <button style={styles.clearBtn} onClick={handleClearKey}>{t.clearApiKey}</button>
            )}
          </div>
          <div style={styles.keyStatus}>
            {keyStatus.source === "missing" && <span style={styles.statusMissing}>{t.noKeyConfigured}</span>}
            {keyStatus.source === "env" && <span style={styles.statusEnv}>{t.usingEnvVar} ({keyStatus.maskedKey})</span>}
            {keyStatus.source === "session" && <span style={styles.statusSaved}>{t.sessionKey} ({keyStatus.maskedKey})</span>}
            {keyStatus.source === "saved" && <span style={styles.statusSaved}>{t.saved_} ({keyStatus.maskedKey})</span>}
          </div>

          <button style={styles.advancedToggle} onClick={() => setShowAdvanced(!showAdvanced)}>
            {showAdvanced ? t.hide : t.show} {t.advanced}
          </button>
          {showAdvanced && (
            <>
              <label style={styles.label}>{t.timeout}</label>
              <input style={styles.input} type="number" value={timeoutMs} onChange={(e) => setTimeoutMs(Number(e.target.value))} />
              <label style={styles.label}>{t.maxOutputTokens_}</label>
              <input style={styles.input} type="number" value={maxOutputTokens} onChange={(e) => setMaxOutputTokens(Number(e.target.value))} />
            </>
          )}

          <div style={styles.actions}>
            <button style={styles.saveBtn} onClick={handleSave} disabled={saving}>
              {saving ? t.saving : t.saveSettings}
            </button>
            <button style={styles.testBtn} onClick={handleTest} disabled={testing}>
              {testing ? t.testing : t.testConnection}
            </button>
          </div>

          {testResult && (
            <div style={testResult.ok ? styles.testSuccess : styles.testError}>
              {testResult.ok ? `${t.connected} (${testResult.latencyMs}ms)` : `${t.failed_} ${testResult.error}`}
            </div>
          )}
          </>
        )}
        </div>
      </div>
    </div>
  );
};
