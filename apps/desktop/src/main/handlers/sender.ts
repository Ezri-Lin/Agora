import type { BrowserWindow } from "electron";

let getMainWindow: (() => BrowserWindow | null) | null = null;

export function setMainWindowGetter(getter: () => BrowserWindow | null): void {
  getMainWindow = getter;
}

/** Assert IPC sender is the main window. Prevents rogue webviews from invoking handlers. */
export function assertSenderIsMain(e: any): void {
  if (!getMainWindow) return; // not initialized yet, allow during startup
  const win = getMainWindow();
  if (!win || e.sender.id !== win.webContents.id) {
    throw new Error("security_violation: IPC sender is not the main window");
  }
}
