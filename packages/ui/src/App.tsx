import React, { useState, useCallback, useRef, useEffect } from "react";
import type { CouncilMessage, SourceRefImportance, LLMConfig } from "@agora/shared";
import { generateId, nowISO } from "@agora/shared";
import { runCouncilRound, type CouncilRunResult } from "@agora/kernel";
import { DEFAULT_ROLES } from "@agora/roles";
import { getBridge, type ScannedDoc } from "./AgoraBridge.js";
import { IPCProvider } from "./IPCProvider.js";
import { AppShell } from "./AppShell/AppShell.js";
import { ContextGraph } from "./ContextGraph/ContextGraph.js";
import { CouncilRoom } from "./CouncilRoom/CouncilRoom.js";
import { Composer } from "./Composer/Composer.js";
import { Inspector, type ContextDebug } from "./Inspector/Inspector.js";
import { EmptyState } from "./EmptyState.js";
import { RefPicker } from "./RefPicker.js";
import { SettingsModal } from "./Settings/SettingsModal.js";
import { errorStyle } from "./appStyles.js";
import { buildSessionExport } from "./sessionExport.js";

export const App: React.FC = () => {
  const [workspace, setWorkspace] = useState<{ path: string; name: string } | null>(null);
  const [messages, setMessages] = useState<CouncilMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState<string>("");
  const [outputs, setOutputs] = useState<string[]>([]);
  const [selectedRefs, setSelectedRefs] = useState<Array<{ type: "file"; path: string; label: string; importance: SourceRefImportance }>>([]);
  const [showRefPicker, setShowRefPicker] = useState(false);
  const [availableDocs, setAvailableDocs] = useState<ScannedDoc[]>([]);
  const [contextDebug, setContextDebug] = useState<ContextDebug | undefined>();
  const [error, setError] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [llmConfig, setLlmConfig] = useState<LLMConfig>({ provider: "mock", model: "mock" });
  const roomIdRef = useRef<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const bridge = getBridge();
    if (!bridge) return;
    bridge.getLLMConfig().then((cfg) => {
      setLlmConfig(cfg as LLMConfig);
    });
    bridge.workspace.getRecent().then(async (recent) => {
      if (recent.length === 0) return;
      const last = recent[0]!;
      try {
        const ws = await bridge.workspace.init(last.path);
        setWorkspace(ws);
        const docs = await bridge.workspace.listDocs(last.path);
        setAvailableDocs(docs);
      } catch {
        // Workspace may have been deleted — ignore
      }
    });
  }, []);

  const handleOpenWorkspace = useCallback(async () => {
    const bridge = getBridge();
    if (!bridge) return;
    const path = await bridge.workspace.openDialog();
    if (!path) return;
    const ws = await bridge.workspace.init(path);
    setWorkspace(ws);
    const docs = await bridge.workspace.listDocs(path);
    setAvailableDocs(docs);
    setMessages([]);
    setOutputs([]);
    setSelectedRefs([]);
    setContextDebug(undefined);
    setError(null);
    roomIdRef.current = null;
  }, []);

  const handleAddRef = useCallback((doc: ScannedDoc) => {
    setSelectedRefs((prev) => {
      if (prev.some((r) => r.path === doc.path)) return prev;
      return [...prev, { type: "file" as const, path: doc.path, label: doc.name, importance: "primary" as const }];
    });
    setShowRefPicker(false);
  }, []);

  const handleRemoveRef = useCallback((path: string) => {
    setSelectedRefs((prev) => prev.filter((r) => r.path !== path));
  }, []);

  const handleStop = useCallback(() => {
    setIsLoading(false);
    setLoadingStatus("");
  }, []);

  const handleSend = useCallback(async (text: string) => {
    if (!workspace) return;
    const bridge = getBridge();
    if (!bridge) return;

    setError(null);

    if (!roomIdRef.current) {
      roomIdRef.current = generateId("room");
      const room = {
        id: roomIdRef.current,
        title: text.slice(0, 60),
        workspaceId: "workspace_default",
        sourceRefs: selectedRefs,
        participants: [],
        settings: {
          roleCount: 3,
          maxMessagesPerRoleBeforeUserReply: 2,
          allowAutoDocs: true,
          allowCrossExamination: true,
          generationMode: "multi_call_cached" as const,
          contextMode: "standard" as const,
        },
        visibility: "private",
        createdAt: nowISO(),
        updatedAt: nowISO(),
      };
      await bridge.room.create(workspace.path, room);
    }

    const userMsg: CouncilMessage = {
      id: generateId("msg"),
      roomId: roomIdRef.current!,
      senderType: "user",
      senderId: "user",
      content: text,
      createdAt: nowISO(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);
    setLoadingStatus("Preparing context...");

    try {
      const docContents = new Map<string, string>();
      for (const ref of selectedRefs) {
        const content = await bridge.workspace.readDoc(workspace.path, ref.path);
        if (content) docContents.set(ref.path, content);
      }

      const roomForCouncil = {
        id: roomIdRef.current!,
        title: text.slice(0, 60),
        workspaceId: "workspace_default",
        sourceRefs: selectedRefs,
        participants: [],
        settings: {
          roleCount: 3,
          maxMessagesPerRoleBeforeUserReply: 2,
          allowAutoDocs: true,
          allowCrossExamination: true,
          generationMode: "multi_call_cached" as const,
          contextMode: "standard" as const,
        },
        visibility: "private" as const,
        createdAt: nowISO(),
        updatedAt: nowISO(),
      };

      setLoadingStatus(`Calling ${llmConfig.provider} (${llmConfig.model})...`);

      const provider = new IPCProvider(llmConfig, (status) => setLoadingStatus(status));
      const result: CouncilRunResult = await runCouncilRound(
        roomForCouncil,
        text,
        userMsg,
        DEFAULT_ROLES,
        provider,
        messages,
        docContents,
      );

      setLoadingStatus("Building messages...");

      const modMsg: CouncilMessage = {
        id: generateId("msg"),
        roomId: roomIdRef.current!,
        senderType: "moderator",
        senderId: "moderator",
        content: result.moderatorAnalysis,
        createdAt: nowISO(),
      };

      const summaryMsg: CouncilMessage = {
        id: generateId("msg"),
        roomId: roomIdRef.current!,
        senderType: "moderator",
        senderId: "moderator",
        content: result.summary,
        createdAt: nowISO(),
      };

      const allNew = [userMsg, modMsg, ...result.roleMessages, summaryMsg];

      for (const msg of allNew) {
        await bridge.room.appendMessage(workspace.path, roomIdRef.current!, msg);
      }
      await bridge.room.writeSummary(workspace.path, roomIdRef.current!, result.summary);

      const sessionContent = buildSessionExport(roomForCouncil, [...messages, ...allNew], result.summary);
      await bridge.room.exportSession(workspace.path, roomIdRef.current!, sessionContent);

      const outputFiles = await bridge.room.listOutputs(workspace.path, roomIdRef.current!);

      setMessages((prev) => [...prev, modMsg, ...result.roleMessages, summaryMsg]);
      setOutputs(outputFiles);
      setContextDebug(result.contextDebug);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("Council round failed:", msg);
      setError(msg);
    } finally {
      setIsLoading(false);
      setLoadingStatus("");
    }
  }, [workspace, messages, selectedRefs, llmConfig]);

  const handleConfigChanged = useCallback(() => {
    const bridge = getBridge();
    if (!bridge) return;
    bridge.getLLMConfig().then((cfg) => {
      setLlmConfig(cfg as LLMConfig);
    });
  }, []);

  const handleOpenRecent = useCallback(async (path: string) => {
    const bridge = getBridge();
    if (!bridge) return;
    try {
      const ws = await bridge.workspace.init(path);
      setWorkspace(ws);
      const docs = await bridge.workspace.listDocs(path);
      setAvailableDocs(docs);
      setMessages([]);
      setOutputs([]);
      setSelectedRefs([]);
      setContextDebug(undefined);
      setError(null);
      roomIdRef.current = null;
    } catch {
      // Workspace may have been deleted
    }
  }, []);

  if (!workspace) {
    return <EmptyState onOpen={handleOpenWorkspace} onOpenRecent={handleOpenRecent} />;
  }

  return (
    <>
    <AppShell
      workspaceName={workspace.name}
      onOpenWorkspace={handleOpenWorkspace}
      contextGraph={<ContextGraph />}
      main={
        <>
          {error && (
            <div style={errorStyle}>
              Error: {error}
            </div>
          )}
          <CouncilRoom messages={messages} isLoading={isLoading} loadingStatus={loadingStatus} onStop={handleStop} />
        </>
      }
      inspector={
        <Inspector
          participants={DEFAULT_ROLES}
          references={selectedRefs}
          outputs={outputs}
          contextDebug={contextDebug}
        />
      }
      composer={
        <>
          {showRefPicker && (
            <RefPicker
              docs={availableDocs}
              onSelect={handleAddRef}
              onClose={() => setShowRefPicker(false)}
            />
          )}
          <Composer
            onSend={handleSend}
            isLoading={isLoading}
            references={selectedRefs}
            onRemoveRef={handleRemoveRef}
          />
        </>
      }
      onAddRef={() => setShowRefPicker(!showRefPicker)}
      onOpenSettings={() => setShowSettings(true)}
    />
    {showSettings && (
      <SettingsModal
        onClose={() => setShowSettings(false)}
        onConfigChanged={handleConfigChanged}
      />
    )}
  </>
  );
};
