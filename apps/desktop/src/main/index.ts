const { app, BrowserWindow, ipcMain } = require("electron");
const { join } = require("node:path");

let mainWindow: InstanceType<typeof BrowserWindow> | null = null;

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 960,
    minHeight: 600,
    title: "Agora",
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: join(__dirname, "../../src/preload/index.js"),
    },
  });

  const devUrl = process.env.VITE_DEV_SERVER_URL;
  if (devUrl) {
    mainWindow.loadURL(devUrl);
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(join(__dirname, "../renderer/index.html"));
  }
}

// App lifecycle
app.whenReady().then(() => {
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

// Basic IPC
ipcMain.handle("get-app-version", () => app.getVersion());
ipcMain.handle("get-platform", () => process.platform);

// Register domain handlers
const { registerLLMConfigHandlers } = require("./handlers/llm-config.js");
const { registerWorkspaceHandlers } = require("./handlers/workspace.js");
const { registerRoomHandlers } = require("./handlers/room.js");
const { registerLLMChatHandlers } = require("./handlers/llm-chat.js");
const { setMainWindowGetter } = require("./handlers/sender.js");

setMainWindowGetter(() => mainWindow);
registerLLMConfigHandlers();
registerWorkspaceHandlers(() => mainWindow);
registerRoomHandlers();
registerLLMChatHandlers();

console.log("[main] Agora started");
