const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("agora", {
  getAppVersion: () => ipcRenderer.invoke("get-app-version"),
  getPlatform: () => ipcRenderer.invoke("get-platform"),
  getLLMConfig: () => ipcRenderer.invoke("get-llm-config"),

  // Workspace
  workspace: {
    openDialog: () => ipcRenderer.invoke("workspace:openDialog"),
    init: (workspacePath) => ipcRenderer.invoke("workspace:init", workspacePath),
    listDocs: (workspacePath) => ipcRenderer.invoke("workspace:listDocs", workspacePath),
    readDoc: (workspaceRoot, filePath) => ipcRenderer.invoke("workspace:readDoc", workspaceRoot, filePath),
    getRecent: () => ipcRenderer.invoke("workspace:getRecent"),
    removeRecent: (path) => ipcRenderer.invoke("workspace:removeRecent", path),
  },

  // Room Store
  room: {
    list: (workspaceRoot) =>
      ipcRenderer.invoke("room:list", workspaceRoot),
    load: (workspaceRoot, roomId) =>
      ipcRenderer.invoke("room:load", workspaceRoot, roomId),
    create: (workspaceRoot, room) =>
      ipcRenderer.invoke("room:create", workspaceRoot, room),
    appendMessage: (workspaceRoot, roomId, message) =>
      ipcRenderer.invoke("room:appendMessage", workspaceRoot, roomId, message),
    writeSummary: (workspaceRoot, roomId, summary) =>
      ipcRenderer.invoke("room:writeSummary", workspaceRoot, roomId, summary),
    writeMemoryCandidates: (workspaceRoot, roomId, content) =>
      ipcRenderer.invoke("room:writeMemoryCandidates", workspaceRoot, roomId, content),
    exportSession: (workspaceRoot, roomId, content) =>
      ipcRenderer.invoke("room:exportSession", workspaceRoot, roomId, content),
    readMessages: (workspaceRoot, roomId) =>
      ipcRenderer.invoke("room:readMessages", workspaceRoot, roomId),
    listOutputs: (workspaceRoot, roomId) =>
      ipcRenderer.invoke("room:listOutputs", workspaceRoot, roomId),
    getMemories: (workspaceRoot) =>
      ipcRenderer.invoke("room:getMemories", workspaceRoot),
    getAllMemories: (workspaceRoot) =>
      ipcRenderer.invoke("room:getAllMemories", workspaceRoot),
    updateMemoryStatus: (workspaceRoot, memoryId, status) =>
      ipcRenderer.invoke("room:updateMemoryStatus", workspaceRoot, memoryId, status),
  },

  // Custom Roles
  customRoles: {
    list: (workspaceRoot) =>
      ipcRenderer.invoke("customRoles:list", workspaceRoot),
    save: (workspaceRoot, role) =>
      ipcRenderer.invoke("customRoles:save", workspaceRoot, role),
    delete: (workspaceRoot, roleId) =>
      ipcRenderer.invoke("customRoles:delete", workspaceRoot, roleId),
  },

  // LLM
  llm: {
    chat: (params) =>
      ipcRenderer.invoke("llm:chat", params),
    chatStream: (params) =>
      ipcRenderer.invoke("llm:chatStream", params),
    onChunk: (callback) => {
      const handler = (_e, data) => callback(data);
      ipcRenderer.on("llm:chunk", handler);
      return () => ipcRenderer.removeListener("llm:chunk", handler);
    },
    onDone: (callback) => {
      const handler = (_e, data) => callback(data);
      ipcRenderer.on("llm:done", handler);
      return () => ipcRenderer.removeListener("llm:done", handler);
    },
    onStreamError: (callback) => {
      const handler = (_e, data) => callback(data);
      ipcRenderer.on("llm:streamError", handler);
      return () => ipcRenderer.removeListener("llm:streamError", handler);
    },
  },

  // LLM Settings
  settings: {
    getLLM: () => ipcRenderer.invoke("settings:getLLM"),
    saveLLM: (input) => ipcRenderer.invoke("settings:saveLLM", input),
    clearApiKey: () => ipcRenderer.invoke("settings:clearApiKey"),
    testConnection: () => ipcRenderer.invoke("settings:testConnection"),
  },

  // Terminal
  terminal: {
    create: (options) => ipcRenderer.invoke("terminal:create", options),
    input: (ptyId, data) => ipcRenderer.send("terminal:input", { ptyId, data }),
    resize: (ptyId, cols, rows) => ipcRenderer.send("terminal:resize", { ptyId, cols, rows }),
    kill: (ptyId) => ipcRenderer.send("terminal:kill", { ptyId }),
    cleanup: () => ipcRenderer.send("terminal:cleanup"),
    onData: (callback) => {
      const listener = (_e, d) => callback(d);
      ipcRenderer.on("terminal:data", listener);
      return () => ipcRenderer.removeListener("terminal:data", listener);
    },
    onExit: (callback) => {
      const listener = (_e, d) => callback(d);
      ipcRenderer.on("terminal:exit", listener);
      return () => ipcRenderer.removeListener("terminal:exit", listener);
    },
  },
});
