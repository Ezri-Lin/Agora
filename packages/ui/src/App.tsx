import React, { useState, useCallback, useRef, useEffect, useMemo } from "react";
import type { CouncilMessage, SourceRefImportance, LLMConfig, RoleCard, CouncilEvent, CouncilRoundSnapshot, RoleRunSnapshot } from "@agora/shared";
import { generateId, nowISO } from "@agora/shared";
import { runCouncilRound, stopRole, type CouncilRunResult } from "@agora/kernel";
import { buildRoleHistories } from "./FloatingPanel/buildRoleHistories.js";
import { DEFAULT_ROLES } from "@agora/roles";
import { getBridge, type ScannedDoc } from "./AgoraBridge.js";
import { IPCProvider } from "./IPCProvider.js";
import { AppShell } from "./AppShell/AppShell.js";
import { ContextGraph } from "./ContextGraph/ContextGraph.js";
import { CouncilRoom } from "./CouncilRoom/CouncilRoom.js";
import { Composer } from "./Composer/Composer.js";
import type { ContextDebug } from "./Inspector/Inspector.js";
import type { RoleStreamState } from "./CouncilMonitor/CouncilMonitor.js";
import { FloatingCouncilPanel } from "./FloatingPanel/FloatingCouncilPanel.js";
import { EmptyState } from "./EmptyState.js";
import { RefPicker } from "./RefPicker.js";
import { SettingsModal } from "./Settings/SettingsModal.js";
import { errorStyle } from "./appStyles.js";
import { buildSessionExport } from "./sessionExport.js";
import { I18nProvider } from "./i18n/I18nContext.js";
import { ThemeProvider } from "./theme/ThemeContext.js";

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
  const [rooms, setRooms] = useState<Array<{ id: string; title: string; createdAt: string }>>([]);
  const [customRoles, setCustomRoles] = useState<Array<{ id: string; name: string; nameCN: string; subtitle: string; type: string; systemPrompt: string; tags: string[] }>>([]);
  const roomIdRef = useRef<string | null>(null);
  const streamingRoleIdRef = useRef<string | null>(null);
  const [roleStreamStates, setRoleStreamStates] = useState<Map<string, RoleStreamState>>(new Map());
  const [lastRoundSnapshot, setLastRoundSnapshot] = useState<CouncilRoundSnapshot | null>(null);
  const [panelPhase, setPanelPhase] = useState<"idle" | "running" | "completed" | "error">("idle");
  const [panelVisible, setPanelVisible] = useState(false);
  const collapseTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const jumpFnsRef = useRef<{ scrollToMessage: (id: string) => void; highlightMessage: (id: string, ms?: number) => void } | null>(null);

  // Build role histories from messages and stream states
  const roleHistories = useMemo(
    () => buildRoleHistories({ roomId: roomIdRef.current, messages, roleStreamStates }),
    [messages, roleStreamStates],
  );

  const loadRooms = useCallback(async (wsPath: string) => {
    const bridge = getBridge();
    if (!bridge) return;
    try {
      const list = await bridge.room.list(wsPath);
      setRooms(list);
    } catch {
      // ignore
    }
  }, []);

  const loadCustomRoles = useCallback(async (wsPath: string) => {
    const bridge = getBridge();
    if (!bridge) return;
    try {
      const list = await bridge.customRoles.list(wsPath);
      setCustomRoles(list);
    } catch {
      // ignore
    }
  }, []);

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
        loadRooms(last.path);
        loadCustomRoles(last.path);
      } catch {
        // Workspace may have been deleted — ignore
      }
    });
  }, [loadRooms, loadCustomRoles]);

  // Auto-reset phase 12s after round completes (panel stays visible)
  useEffect(() => {
    if (panelPhase === "completed" || panelPhase === "error") {
      collapseTimerRef.current = setTimeout(() => {
        setPanelPhase("idle");
        setRoleStreamStates(new Map());
      }, 12_000);
      return () => clearTimeout(collapseTimerRef.current);
    }
  }, [panelPhase]);

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
    loadRooms(path);
    loadCustomRoles(path);
  }, [loadRooms, loadCustomRoles]);

  const handleSelectRoom = useCallback(async (roomId: string) => {
    if (!workspace) return;
    const bridge = getBridge();
    if (!bridge) return;
    const data = await bridge.room.load(workspace.path, roomId);
    if (!data) return;
    roomIdRef.current = roomId;
    setMessages(data.messages as CouncilMessage[]);
    const outputFiles = await bridge.room.listOutputs(workspace.path, roomId);
    setOutputs(outputFiles);
    setContextDebug(undefined);
    setError(null);
  }, [workspace]);

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

  const handleStopRole = useCallback((roleId: string) => {
    const roundId = roomIdRef.current ? `round_${roomIdRef.current}_*` : "";
    // stopRole needs exact roundId; for now abort via the module-level controller
    // The roundId is generated inside CouncilRunner, so we pass a partial match
    // This works because stopRole checks by key prefix
    stopRole(roundId, roleId);
  }, []);

  const handleRemoveRole = useCallback((roleId: string) => {
    // For now, just mark the role as removed for future rounds
    // The actual removal from room roster is handled by the role selection logic
    setRoleStreamStates((prev) => {
      const next = new Map(prev);
      next.delete(roleId);
      return next;
    });
  }, []);

  const handleJumpToMessage = useCallback((messageId: string) => {
    jumpFnsRef.current?.scrollToMessage(messageId);
    jumpFnsRef.current?.highlightMessage(messageId, 1800);
  }, []);

  const handleRegisterJumpFns = useCallback((fns: { scrollToMessage: (id: string) => void; highlightMessage: (id: string, ms?: number) => void }) => {
    jumpFnsRef.current = fns;
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
      loadRooms(workspace.path);
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
    setRoleStreamStates(new Map());
    setLastRoundSnapshot(null);
    setPanelPhase("running");
    setPanelVisible(true);
    clearTimeout(collapseTimerRef.current);

    try {
      const docContents = new Map<string, string>();
      for (const ref of selectedRefs) {
        const content = await bridge.workspace.readDoc(workspace.path, ref.path);
        if (content) docContents.set(ref.path, content);
      }

      // Inject accepted memories into context
      try {
        const memories = await bridge.room.getMemories(workspace.path);
        for (const mem of memories) {
          docContents.set(`memory:${mem.id}`, `[Memory — ${mem.scope}]\n${mem.content}`);
        }
      } catch {
        // Memory loading failure should not block the round
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
      const allRoles: RoleCard[] = [
        ...DEFAULT_ROLES,
        ...customRoles.map((r) => ({ ...r, type: r.type as RoleCard["type"] })),
      ];

      // Streaming event handler — updates messages incrementally
      const streamingMsgIds = new Map<string, string>();
      const streamedMsgIds = new Set<string>();

      const onEvent = (event: CouncilEvent) => {
        switch (event.type) {
          case "role_start": {
            const msgId = `msg_${event.roleId}_${Date.now()}`;
            streamingMsgIds.set(event.roleId!, msgId);
            streamingRoleIdRef.current = event.roleId!;
            const placeholder: CouncilMessage = {
              id: msgId, roomId: roomIdRef.current!, senderType: "role",
              senderId: event.roleId!, content: "", thinking: "", status: "ok", createdAt: new Date().toISOString(),
            };
            setMessages((prev) => [...prev, placeholder]);
            setRoleStreamStates((prev) => {
              const next = new Map(prev);
              next.set(event.roleId!, { status: "thinking", startedAt: Date.now(), microSummary: "" });
              return next;
            });
            break;
          }
          case "role_chunk": {
            const msgId = streamingMsgIds.get(event.roleId!);
            if (!msgId) break;
            const thinkingDelta = event.thinking ?? "";
            setMessages((prev) => prev.map((m) => m.id === msgId ? {
              ...m, content: m.content + (event.delta ?? ""), thinking: (m.thinking ?? "") + thinkingDelta,
            } : m));
            if (thinkingDelta || event.delta) {
              setRoleStreamStates((prev) => {
                const next = new Map(prev);
                const existing = next.get(event.roleId!);
                if (existing) {
                  const summary = thinkingDelta
                    ? thinkingDelta.slice(-60)
                    : (event.delta ?? "").slice(-60);
                  next.set(event.roleId!, {
                    ...existing,
                    status: "streaming",
                    microSummary: summary || existing.microSummary,
                  });
                }
                return next;
              });
            }
            break;
          }
          case "role_done": {
            const msgId = streamingMsgIds.get(event.roleId!);
            if (!msgId || !event.message) break;
            streamedMsgIds.add(msgId);
            streamingRoleIdRef.current = null;
            setMessages((prev) => prev.map((m) => m.id === msgId ? event.message! : m));
            setRoleStreamStates((prev) => {
              const next = new Map(prev);
              const existing = next.get(event.roleId!);
              if (existing) {
                next.set(event.roleId!, {
                  ...existing,
                  status: "done",
                  microSummary: event.message!.graphSummary || existing.microSummary,
                });
              }
              return next;
            });
            break;
          }
          case "moderator_done": {
            if (event.message) {
              streamedMsgIds.add(event.message.id);
              setMessages((prev) => [...prev, event.message!]);
            }
            break;
          }
          case "summary_done": {
            if (event.content) {
              const summaryMsg: CouncilMessage = {
                id: generateId("msg"), roomId: roomIdRef.current!, senderType: "moderator",
                senderId: "moderator", content: event.content, createdAt: nowISO(),
              };
              streamedMsgIds.add(summaryMsg.id);
              setMessages((prev) => [...prev, summaryMsg]);
            }
            break;
          }
        }
      };

      const result: CouncilRunResult = await runCouncilRound(
        roomForCouncil, text, userMsg, allRoles, provider,
        messages, docContents, undefined, onEvent,
      );

      setLoadingStatus("Persisting...");

      // Build messages for persistence (including ones already streamed to UI)
      const modMsg: CouncilMessage = {
        id: generateId("msg"), roomId: roomIdRef.current!, senderType: "moderator",
        senderId: "moderator", content: result.moderatorAnalysis, createdAt: nowISO(),
      };
      const summaryMsg: CouncilMessage = {
        id: generateId("msg"), roomId: roomIdRef.current!, senderType: "moderator",
        senderId: "moderator", content: result.summary, createdAt: nowISO(),
      };
      const allNew = [userMsg, modMsg, ...result.roleMessages, ...result.crossExaminationMessages, summaryMsg];

      for (const msg of allNew) {
        await bridge.room.appendMessage(workspace.path, roomIdRef.current!, msg);
      }
      await bridge.room.writeSummary(workspace.path, roomIdRef.current!, result.summary);

      if (result.extractedMemories.length > 0) {
        const memLines = [
          "# Memory Candidates", "",
          ...result.extractedMemories.map((m) =>
            `- **[${m.scope}]** ${m.content}\n  domains: ${m.domains.join(", ")} | tags: ${m.tags.join(", ")}`,
          ),
        ];
        await bridge.room.writeMemoryCandidates(workspace.path, roomIdRef.current!, memLines.join("\n"));
      }

      const sessionContent = buildSessionExport(roomForCouncil, [...messages, ...allNew], result.summary, result.contextDebug);
      await bridge.room.exportSession(workspace.path, roomIdRef.current!, sessionContent);

      const outputFiles = await bridge.room.listOutputs(workspace.path, roomIdRef.current!);

      // Append cross-examination messages (not streamed)
      if (result.crossExaminationMessages.length > 0) {
        setMessages((prev) => [...prev, ...result.crossExaminationMessages]);
      }
      setOutputs(outputFiles);
      setContextDebug(result.contextDebug);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("Council round failed:", msg);
      setError(msg);
      setPanelPhase("error");
    } finally {
      setIsLoading(false);
      setLoadingStatus("");
      // Build round snapshot from live states
      setRoleStreamStates((prev) => {
        const snapshots: RoleRunSnapshot[] = [];
        const now = Date.now();
        prev.forEach((state, roleId) => {
          snapshots.push({
            roleId,
            status: state.status === "error" ? "error" : "done",
            startedAt: state.startedAt,
            endedAt: now,
            microSummary: state.microSummary,
          });
        });
        if (snapshots.length > 0) {
          setLastRoundSnapshot({
            roundId: roomIdRef.current ?? "unknown",
            completedAt: now,
            roleSnapshots: snapshots,
            roleCount: snapshots.length,
            doneCount: snapshots.filter((s) => s.status === "done").length,
            errorCount: snapshots.filter((s) => s.status === "error").length,
          });
          setPanelPhase((phase) => phase === "error" ? "error" : "completed");
        }
        return prev; // keep live states until snapshot is built
      });
    }
  }, [workspace, messages, selectedRefs, llmConfig]);

  const handleNodeClick = useCallback((msgId: string) => {
    const el = document.getElementById(msgId);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, []);

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
      loadRooms(path);
      loadCustomRoles(path);
    } catch {
      // Workspace may have been deleted
    }
  }, [loadRooms, loadCustomRoles]);

  if (!workspace) {
    return (
      <ThemeProvider>
        <I18nProvider>
          <EmptyState onOpen={handleOpenWorkspace} onOpenRecent={handleOpenRecent} />
        </I18nProvider>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider>
    <I18nProvider>
      <AppShell
      workspaceName={workspace.name}
      onOpenWorkspace={handleOpenWorkspace}
      contextGraph={<ContextGraph messages={messages} selectedRefs={selectedRefs} roles={DEFAULT_ROLES} roomId={roomIdRef.current} onNodeClick={handleNodeClick} />}
      main={
        <>
          {error && (
            <div style={errorStyle}>
              Error: {error}
            </div>
          )}
          <CouncilRoom messages={messages} isLoading={isLoading} loadingStatus={loadingStatus} onStop={handleStop} streamingRoleId={streamingRoleIdRef.current} onRegisterJumpFns={handleRegisterJumpFns} />
        </>
      }
      floatingPanel={
        <FloatingCouncilPanel
          visible={panelVisible}
          panelPhase={panelPhase}
          roleStreamStates={roleStreamStates}
          lastRoundSnapshot={lastRoundSnapshot}
          roles={[...DEFAULT_ROLES, ...customRoles.map((r) => ({ ...r, type: r.type as RoleCard["type"] }))]}
          messages={messages}
          outputs={outputs}
          references={selectedRefs}
          workspacePath={workspace?.path}
          userMessage={messages.filter((m) => m.senderType === "user").slice(-1)[0]?.content}
          activeRoleIdsFromMessages={new Set(messages.filter((m) => m.senderType === "role").map((m) => m.senderId))}
          roleHistories={roleHistories}
          onToggle={() => setPanelVisible((v) => !v)}
          onStopRole={handleStopRole}
          onRemoveRole={handleRemoveRole}
          onJumpToMessage={handleJumpToMessage}
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
      rooms={rooms}
      activeRoomId={roomIdRef.current}
      onSelectRoom={handleSelectRoom}
      onNewRoom={() => { roomIdRef.current = null; setMessages([]); setOutputs([]); setContextDebug(undefined); }}
      panelVisible={panelVisible}
      onTogglePanel={() => setPanelVisible((v) => !v)}
    />
    {showSettings && (
      <SettingsModal
        onClose={() => setShowSettings(false)}
        onConfigChanged={handleConfigChanged}
        workspacePath={workspace?.path}
      />
    )}
    </I18nProvider>
    </ThemeProvider>
  );
};
