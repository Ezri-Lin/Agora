import { ipcMain, BrowserWindow } from "electron";
import * as os from "node:os";

const sessions = new Map<string, { pty: any; webContentsId: number }>();

function getDefaultShell(): string {
  if (process.platform === "win32") {
    return process.env.COMSPEC || "cmd.exe";
  }
  return process.env.SHELL || "/bin/sh";
}

let ptyCounter = 0;

export function registerTerminalHandlers(): void {
  ipcMain.handle("terminal:create", (event, options: { cwd?: string }) => {
    const shell = getDefaultShell();
    const cwd = options?.cwd || os.homedir();
    const ptyId = `pty_${++ptyCounter}_${Date.now()}`;
    const webContentsId = event.sender.id;

    console.log(`[terminal] Creating mock PTY: shell=${shell}, cwd=${cwd}`);

    try {
      const { spawn } = require("child_process");
      const ptyProcess = spawn("python3", ["-c", `import pty; pty.spawn("${shell}")`], {
        cwd,
        env: process.env,
      });

      const mockPty = {
        onData: function(cb: (data: string) => void) {
          (this as any)._onDataCb = cb;
          ptyProcess.stdout.on("data", (d: Buffer) => cb(d.toString().replace(/\n/g, "\r\n")));
          ptyProcess.stderr.on("data", (d: Buffer) => cb(d.toString().replace(/\n/g, "\r\n")));
        },
        onExit: (cb: (arg: { exitCode: number }) => void) => {
          ptyProcess.on("exit", (code: number) => cb({ exitCode: code }));
        },
        write: function(data: string) {
          ptyProcess.stdin.write(data);
        },
        kill: () => ptyProcess.kill(),
        resize: (_cols: number, _rows: number) => {},
        _onDataCb: null as any,
      };

      sessions.set(ptyId, { pty: mockPty, webContentsId });

      mockPty.onData((data: string) => {
        const win = BrowserWindow.fromWebContents(event.sender);
        if (win && !win.isDestroyed()) {
          event.sender.send("terminal:data", { ptyId, data });
        }
      });

      mockPty.onExit(({ exitCode }: { exitCode: number }) => {
        console.log(`[terminal] Process exited: ptyId=${ptyId}, exitCode=${exitCode}`);
        sessions.delete(ptyId);
        const win = BrowserWindow.fromWebContents(event.sender);
        if (win && !win.isDestroyed()) {
          event.sender.send("terminal:exit", { ptyId, exitCode });
        }
      });

      console.log(`[terminal] PTY created: ptyId=${ptyId}`);
      return ptyId;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[terminal] Failed to create mock PTY:`, msg);
      throw new Error(`Failed to create terminal: ${msg}`);
    }
  });

  ipcMain.on("terminal:input", (_event, { ptyId, data }: { ptyId: string; data: string }) => {
    const session = sessions.get(ptyId);
    if (session) {
      session.pty.write(data);
    }
  });

  ipcMain.on("terminal:resize", (_event, { ptyId, cols, rows }: { ptyId: string; cols: number; rows: number }) => {
    const session = sessions.get(ptyId);
    if (session && session.pty.resize) {
      session.pty.resize(cols, rows);
    }
  });
}
