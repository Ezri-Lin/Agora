import React, { useEffect, useRef, useState, useCallback } from "react";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { WebLinksAddon } from "@xterm/addon-web-links";
import "@xterm/xterm/css/xterm.css";
import { getBridge } from "../AgoraBridge.js";
import { useTheme } from "../theme/ThemeContext.js";
import { useI18n } from "../i18n/I18nContext.js";
import type { ColorPalette } from "../theme/palettes.js";
import {
  agoraDarkColors,
  consoleTokens,
  fontFamilies,
  radius,
  shadow,
  shadowDark,
  spacing,
  typography,
  zIndex,
} from "../theme/tokens.js";

interface TerminalPanelProps {
  visible: boolean;
  workspacePath?: string;
  onClose: () => void;
}

const DEFAULT_HEIGHT = 280;
const MIN_HEIGHT = 120;

export const TerminalPanel: React.FC<TerminalPanelProps> = ({ visible, workspacePath, onClose }) => {
  const { colors } = useTheme();
  const { t } = useI18n();
  const containerRef = useRef<HTMLDivElement>(null);
  const termRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const ptyIdRef = useRef<string | null>(null);
  const disposablesRef = useRef<Array<() => void>>([]);
  const unmountedRef = useRef(false);
  const colorsRef = useRef(colors);
  colorsRef.current = colors;
  const [height, setHeight] = useState(DEFAULT_HEIGHT);
  const draggingRef = useRef(false);
  const startYRef = useRef(0);
  const startHeightRef = useRef(0);

  // Drag resize handlers
  const handleDragStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    draggingRef.current = true;
    startYRef.current = e.clientY;
    startHeightRef.current = height;
    document.body.style.cursor = "row-resize";
    document.body.style.userSelect = "none";
  }, [height]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!draggingRef.current) return;
      const delta = startYRef.current - e.clientY;
      const maxH = window.innerHeight * 0.6;
      const newHeight = Math.max(MIN_HEIGHT, Math.min(maxH, startHeightRef.current + delta));
      setHeight(newHeight);
    };
    const handleMouseUp = () => {
      if (draggingRef.current) {
        draggingRef.current = false;
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      }
    };
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, []);

  useEffect(() => {
    if (!visible || !containerRef.current) return;

    const bridge = getBridge();
    if (!bridge) return;

    unmountedRef.current = false;
    const container = containerRef.current;
    const c = colorsRef.current;

    const term = new Terminal({
      theme: {
        background: getConsolePalette(c).bg,
        foreground: getConsolePalette(c).text,
        cursor: c.accent,
        selectionBackground: `${c.accent}40`,
      },
      fontSize: typography.console.size,
      fontFamily: fontFamilies.mono,
      cursorBlink: true,
      convertEol: true,
    });

    const fitAddon = new FitAddon();
    const webLinksAddon = new WebLinksAddon();
    term.loadAddon(fitAddon);
    term.loadAddon(webLinksAddon);
    term.open(container);
    fitAddon.fit();

    termRef.current = term;
    fitAddonRef.current = fitAddon;

    // Terminal keyboard → PTY
    const onKey = term.onData((data: string) => {
      if (ptyIdRef.current) {
        bridge.terminal.input(ptyIdRef.current, data);
      }
    });
    disposablesRef.current.push(() => onKey.dispose());

    // Resize
    const resizeObs = new ResizeObserver(() => {
      fitAddon.fit();
      if (ptyIdRef.current) {
        bridge.terminal.resize(ptyIdRef.current, term.cols, term.rows);
      }
    });
    resizeObs.observe(container);
    disposablesRef.current.push(() => resizeObs.disconnect());

    // Create PTY
    bridge.terminal.create({ cwd: workspacePath }).then((ptyId) => {
      if (unmountedRef.current) return;
      ptyIdRef.current = ptyId;

      // PTY output → Terminal
      const offData = bridge.terminal.onData(({ ptyId: id, data }) => {
        if (id === ptyId) term.write(data);
      });
      disposablesRef.current.push(offData);

      const offExit = bridge.terminal.onExit(({ ptyId: id }) => {
        if (id === ptyId) {
          term.write("\r\n[Process exited]");
          ptyIdRef.current = null;
        }
      });
      disposablesRef.current.push(offExit);

      // Initial resize
      bridge.terminal.resize(ptyId, term.cols, term.rows);
    }).catch((err: unknown) => {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("[TerminalPanel] Failed to create PTY:", msg);
      term.write(`\r\n\x1b[31mFailed to start terminal: ${msg}\x1b[0m\r\n`);
      term.write(`\x1b[33mCheck that node-pty is installed correctly.\x1b[0m\r\n`);
    });

    return () => {
      unmountedRef.current = true;
      for (const fn of disposablesRef.current) {
        try { fn(); } catch { /* ignore */ }
      }
      disposablesRef.current = [];

      if (ptyIdRef.current) {
        bridge.terminal.kill(ptyIdRef.current);
        ptyIdRef.current = null;
      }
      fitAddonRef.current?.dispose();
      fitAddonRef.current = null;
      webLinksAddon.dispose();
      term.dispose();
      termRef.current = null;
    };
  }, [visible, workspacePath]);

  // Hot-update terminal theme on palette change (no rebuild)
  useEffect(() => {
    const term = termRef.current;
    if (!term) return;
    const consolePalette = getConsolePalette(colors);
    term.options.theme = {
      background: consolePalette.bg,
      foreground: consolePalette.text,
      cursor: colors.accent,
      selectionBackground: `${colors.accent}40`,
    };
  }, [colors]);

  if (!visible) return null;

  return (
    <div role="region" aria-label="Activity Console" style={panelStyle(colors, height)}>
      <div
        style={dragHandleStyle(colors)}
        onMouseDown={handleDragStart}
      />
      <div style={headerStyle(colors)}>
        <span style={titleStyle(colors)}>Activity Console</span>
        <span style={statusStyle(colors)}>{t.terminal}</span>
        <button type="button" aria-label={t.closeTerminal} style={closeBtnStyle(colors)} onClick={onClose}>x</button>
      </div>
      <div ref={containerRef} style={termContainerStyle} />
    </div>
  );
};

function getConsolePalette(colors: ColorPalette): { bg: string; text: string; muted: string } {
  const dark = colors.bg === agoraDarkColors.bgApp;
  return dark
    ? { bg: consoleTokens.bgDark, text: consoleTokens.textDark, muted: consoleTokens.mutedDark }
    : { bg: consoleTokens.bgLight, text: consoleTokens.textLight, muted: consoleTokens.mutedLight };
}

const panelStyle = (colors: ColorPalette, height: number): React.CSSProperties => ({
  display: "flex",
  flexDirection: "column",
  position: "relative",
  height: "100%",
  borderTop: `1px solid ${colors.border}`,
  background: getConsolePalette(colors).bg,
  color: getConsolePalette(colors).text,
  boxShadow: colors.bg === agoraDarkColors.bgApp ? shadowDark.deep : shadow.deep,
  zIndex: zIndex.console,
});

const dragHandleStyle = (colors: ColorPalette): React.CSSProperties => ({
  display: "none"
});

const headerStyle = (colors: ColorPalette): React.CSSProperties => ({
  display: "flex",
  alignItems: "center",
  gap: spacing.sm,
  padding: `${spacing.xs}px ${spacing.md}px`,
  borderBottom: `1px solid ${colors.border}`,
  flexShrink: 0,
});

const titleStyle = (colors: ColorPalette): React.CSSProperties => ({
  fontSize: typography.badge.size,
  fontWeight: typography.badge.weight,
  color: getConsolePalette(colors).text,
  textTransform: "uppercase",
  letterSpacing: typography.badge.tracking,
});

const statusStyle = (colors: ColorPalette): React.CSSProperties => ({
  fontSize: typography.badge.size,
  color: getConsolePalette(colors).muted,
  marginLeft: "auto",
});

const closeBtnStyle = (colors: ColorPalette): React.CSSProperties => ({
  background: "transparent",
  border: `1px solid ${colors.border}`,
  borderRadius: radius.xs,
  color: getConsolePalette(colors).muted,
  fontSize: typography.meta.size,
  cursor: "pointer",
  padding: `${spacing.xs}px ${spacing.sm}px`,
});

const termContainerStyle: React.CSSProperties = {
  flex: 1,
  overflow: "hidden",
  padding: `${spacing.xs}px 0 0 ${spacing.xs}px`,
};
