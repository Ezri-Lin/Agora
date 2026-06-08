import { ipcMain, BrowserWindow } from "electron";
import * as pty from "node-pty";
import * as os from "node:os";

interface PtySession {
  pty: pty.IPty;
  webContentsId: number;
}

const sessions = new Map<string, PtySession>();

function getDefaultShell(): string {
  return process.env.SHELL || (process.platform === "win32" ? "powershell.exe" : "/bin/bash");
}

let ptyCounter = 0;

export function registerTerminalHandlers(): void {
  ipcMain.handle("terminal:create", (event, options: { cwd?: string }) => {
    const shell = getDefaultShell();
    const cwd = options?.cwd || os.homedir();
    const ptyId = `pty_${++ptyCounter}_${Date.now()}`;
    const webContentsId = event.sender.id;

    const ptyProcess = pty.spawn(shell, [], {
      name: "xterm-256color",
      cols: 80,
      rows: 24,
      cwd,
      env: process.env as Record<string, string>,
    });

    sessions.set(ptyId, { pty: ptyProcess, webContentsId });

    ptyProcess.onData((data) => {
      const win = BrowserWindow.fromWebContents(event.sender);
      if (win && !win.isDestroyed()) {
        event.sender.send("terminal:data", { ptyId, data });
      }
    });

    ptyProcess.onExit(({ exitCode }) => {
      sessions.delete(ptyId);
      const win = BrowserWindow.fromWebContents(event.sender);
      if (win && !win.isDestroyed()) {
        event.sender.send("terminal:exit", { ptyId, exitCode });
      }
    });

    return ptyId;
  });

  ipcMain.on("terminal:input", (event, { ptyId, data }: { ptyId: string; data: string }) => {
    const session = sessions.get(ptyId);
    if (session) {
      session.pty.write(data);
    }
  });

  ipcMain.on("terminal:resize", (event, { ptyId, cols, rows }: { ptyId: string; cols: number; rows: number }) => {
    const session = sessions.get(ptyId);
    if (session) {
      session.pty.resize(cols, rows);
    }
  });

  ipcMain.on("terminal:kill", (_event, { ptyId }: { ptyId: string }) => {
    const session = sessions.get(ptyId);
    if (session) {
      session.pty.kill();
      sessions.delete(ptyId);
    }
  });

  // Cleanup all PTYs for a destroyed webContents
  ipcMain.on("terminal:cleanup", (event) => {
    const webContentsId = event.sender.id;
    for (const [ptyId, session] of sessions) {
      if (session.webContentsId === webContentsId) {
        session.pty.kill();
        sessions.delete(ptyId);
      }
    }
  });
}

// Called when app is quitting
export function killAllTerminals(): void {
  for (const [ptyId, session] of sessions) {
    try {
      session.pty.kill();
    } catch {
      // ignore
    }
    sessions.delete(ptyId);
  }
}
