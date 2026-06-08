import React, { useEffect, useRef, useCallback } from "react";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { WebLinksAddon } from "@xterm/addon-web-links";
import "@xterm/xterm/css/xterm.css";
import { getBridge } from "../AgoraBridge.js";
import { useTheme } from "../theme/ThemeContext.js";
import { useI18n } from "../i18n/I18nContext.js";
import type { ColorPalette } from "../theme/palettes.js";

interface TerminalPanelProps {
  visible: boolean;
  workspacePath?: string;
  onClose: () => void;
}

export const TerminalPanel: React.FC<TerminalPanelProps> = ({ visible, workspacePath, onClose }) => {
  const { colors } = useTheme();
  const { t } = useI18n();
  const containerRef = useRef<HTMLDivElement>(null);
  const terminalRef = useRef<Terminal | null>(null);
  const ptyIdRef = useRef<string | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const cleanupRef = useRef<(() => void)[]>([]);

  const cleanup = useCallback(() => {
    for (const fn of cleanupRef.current) {
      try { fn(); } catch { /* ignore */ }
    }
    cleanupRef.current = [];
    if (terminalRef.current) {
      terminalRef.current.dispose();
      terminalRef.current = null;
    }
    if (ptyIdRef.current) {
      const bridge = getBridge();
      if (bridge) bridge.terminal.kill(ptyIdRef.current);
      ptyIdRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!visible || !containerRef.current) {
      cleanup();
      return;
    }

    const bridge = getBridge();
    if (!bridge) return;

    const term = new Terminal({
      theme: {
        background: colors.bg,
        foreground: colors.text,
        cursor: colors.accent,
        selectionBackground: `${colors.accent}40`,
      },
      fontSize: 12,
      fontFamily: 'Menlo, Monaco, "Courier New", monospace',
      cursorBlink: true,
      convertEol: true,
    });

    const fitAddon = new FitAddon();
    const webLinksAddon = new WebLinksAddon();
    term.loadAddon(fitAddon);
    term.loadAddon(webLinksAddon);
    term.open(containerRef.current);
    fitAddon.fit();

    terminalRef.current = term;
    fitAddonRef.current = fitAddon;

    // Create PTY
    bridge.terminal.create({ cwd: workspacePath }).then((ptyId) => {
      ptyIdRef.current = ptyId;

      // PTY → Terminal
      const offData = bridge.terminal.onData(({ ptyId: id, data }) => {
        if (id === ptyId) {
          term.write(data);
        }
      });
      cleanupRef.current.push(offData);

      const offExit = bridge.terminal.onExit(({ ptyId: id }) => {
        if (id === ptyId) {
          term.write("\r\n[Process exited]");
          ptyIdRef.current = null;
        }
      });
      cleanupRef.current.push(offExit);

      // Terminal → PTY
      const onKey = term.onData((data: string) => {
        if (ptyIdRef.current) {
          bridge.terminal.input(ptyIdRef.current, data);
        }
      });
      cleanupRef.current.push(() => onKey.dispose());

      // Resize
      const resizeObserver = new ResizeObserver(() => {
        fitAddon.fit();
        if (ptyIdRef.current) {
          bridge.terminal.resize(ptyIdRef.current, term.cols, term.rows);
        }
      });
      resizeObserver.observe(containerRef.current!);
      cleanupRef.current.push(() => resizeObserver.disconnect());

      // Initial resize
      bridge.terminal.resize(ptyId, term.cols, term.rows);
    });

    return cleanup;
  }, [visible, workspacePath, colors, cleanup]);

  if (!visible) return null;

  return (
    <div style={panelStyle(colors)}>
      <div style={headerStyle(colors)}>
        <span style={titleStyle(colors)}>{t.terminal}</span>
        <button style={closeBtnStyle(colors)} onClick={onClose}>✕</button>
      </div>
      <div ref={containerRef} style={termContainerStyle} />
    </div>
  );
};

const panelStyle = (colors: ColorPalette): React.CSSProperties => ({
  display: "flex",
  flexDirection: "column",
  height: 250,
  borderTop: `1px solid ${colors.border}`,
  background: colors.bg,
  flexShrink: 0,
});

const headerStyle = (colors: ColorPalette): React.CSSProperties => ({
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: "4px 10px",
  borderBottom: `1px solid ${colors.border}`,
  flexShrink: 0,
});

const titleStyle = (colors: ColorPalette): React.CSSProperties => ({
  fontSize: 10,
  fontWeight: 600,
  color: colors.textMuted,
  textTransform: "uppercase",
  letterSpacing: 0.5,
});

const closeBtnStyle = (colors: ColorPalette): React.CSSProperties => ({
  background: "none",
  border: "none",
  color: colors.textMuted,
  fontSize: 12,
  cursor: "pointer",
  padding: "2px 4px",
});

const termContainerStyle: React.CSSProperties = {
  flex: 1,
  overflow: "hidden",
  padding: "4px 0 0 4px",
};
