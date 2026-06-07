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

  // LLM
  llm: {
    chat: (params) =>
      ipcRenderer.invoke("llm:chat", params),
  },

  // LLM Settings
  settings: {
    getLLM: () => ipcRenderer.invoke("settings:getLLM"),
    saveLLM: (input) => ipcRenderer.invoke("settings:saveLLM", input),
    clearApiKey: () => ipcRenderer.invoke("settings:clearApiKey"),
    testConnection: () => ipcRenderer.invoke("settings:testConnection"),
  },
});
