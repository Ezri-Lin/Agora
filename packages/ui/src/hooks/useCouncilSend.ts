import { useCallback } from "react";
import type { Dispatch, MutableRefObject, SetStateAction } from "react";
import type {
  CouncilMessage,
  CouncilRoom,
  CouncilRoundSnapshot,
  ExplicitRoleRequest,
  LLMConfig,
  RoleCard,
  RoleRoutingDecision,
  RoomMode,
} from "@agora/shared";
import { generateId, nowISO } from "@agora/shared";
import { prepareCouncilDispatch, runCouncilRound } from "@agora/kernel";
import { getBridge } from "../AgoraBridge.js";
import { IPCProvider } from "../IPCProvider.js";
import type { PendingPerspectiveChip } from "../Composer/Composer.js";
import type { RoleStreamState } from "../CouncilMonitor/CouncilMonitor.js";
import type { WorkspaceRef } from "./useWorkspaceState.js";
import { finalizeRoleStreams } from "./councilCompletion.js";
import { createCouncilEventHandler } from "./councilEvents.js";
import { persistCouncilRunResult } from "./councilPersistence.js";
import type { DispatchGateContext } from "./councilStateTypes.js";

interface UseCouncilSendParams {
  messages: CouncilMessage[];
  llmConfig: LLMConfig;
  roomMode: RoomMode;
  pendingPerspectiveChips: PendingPerspectiveChip[];
  allRoles: RoleCard[];
  loadRooms: (wsPath: string) => Promise<void>;
  roomIdRef: MutableRefObject<string | null>;
  streamingRoleIdRef: MutableRefObject<string | null>;
  collapseTimerRef: MutableRefObject<ReturnType<typeof setTimeout> | undefined>;
  setMessages: Dispatch<SetStateAction<CouncilMessage[]>>;
  setIsLoading: Dispatch<SetStateAction<boolean>>;
  setLoadingStatus: Dispatch<SetStateAction<string>>;
  setOutputs: Dispatch<SetStateAction<string[]>>;
  setError: Dispatch<SetStateAction<string | null>>;
  setRoleStreamStates: Dispatch<SetStateAction<Map<string, RoleStreamState>>>;
  setLastRoundSnapshot: Dispatch<SetStateAction<CouncilRoundSnapshot | null>>;
  setPanelPhase: Dispatch<SetStateAction<"idle" | "running" | "completed" | "error">>;
  setPanelVisible: Dispatch<SetStateAction<boolean>>;
  setPendingPerspectiveChips: Dispatch<SetStateAction<PendingPerspectiveChip[]>>;
  setLastRoutingDecision: Dispatch<
    SetStateAction<{ messageId: string; decision: RoleRoutingDecision } | null>
  >;
  setDispatchGate: Dispatch<SetStateAction<DispatchGateContext | null>>;
  setDispatchSelectedRoleIds: Dispatch<SetStateAction<string[]>>;
}

export function useCouncilSend({
  messages,
  llmConfig,
  roomMode,
  pendingPerspectiveChips,
  allRoles,
  loadRooms,
  roomIdRef,
  streamingRoleIdRef,
  collapseTimerRef,
  setMessages,
  setIsLoading,
  setLoadingStatus,
  setOutputs,
  setError,
  setRoleStreamStates,
  setLastRoundSnapshot,
  setPanelPhase,
  setPanelVisible,
  setPendingPerspectiveChips,
  setLastRoutingDecision,
  setDispatchGate,
  setDispatchSelectedRoleIds,
}: UseCouncilSendParams) {
  return useCallback(async (text: string, workspace: { path: string }, selectedRefs: WorkspaceRef[]) => {
    const bridge = getBridge();
    if (!bridge) return;

    setError(null);

    if (!roomIdRef.current) {
      roomIdRef.current = generateId("room");
      const room: CouncilRoom = {
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
          generationMode: "multi_call_cached",
          contextMode: "standard",
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
    setLastRoutingDecision(null);
    setPanelPhase("running");
    setPanelVisible(true);
    clearTimeout(collapseTimerRef.current);

    try {
      const docContents = new Map<string, string>();
      for (const ref of selectedRefs) {
        const content = await bridge.workspace.readDoc(workspace.path, ref.path);
        if (content) docContents.set(ref.path, content);
      }

      try {
        const memories = await bridge.room.getMemories(workspace.path);
        for (const mem of memories) {
          docContents.set(`memory:${mem.id}`, `[Memory — ${mem.scope}]\n${mem.content}`);
        }
      } catch {
        // Memory loading failure should not block the round.
      }

      const roomForCouncil: CouncilRoom = {
        id: roomIdRef.current!,
        title: text.slice(0, 60),
        workspaceId: "workspace_default",
        sourceRefs: selectedRefs,
        participants: [],
        settings: {
          roleCount: roomMode === "single" ? 1 : 3,
          maxMessagesPerRoleBeforeUserReply: 2,
          allowAutoDocs: true,
          allowCrossExamination: roomMode !== "single",
          generationMode: "multi_call_cached",
          contextMode: "standard",
        },
        visibility: "private",
        createdAt: nowISO(),
        updatedAt: nowISO(),
      };

      setLoadingStatus(`Calling ${llmConfig.provider} (${llmConfig.model})...`);
      const provider = new IPCProvider(llmConfig, (status) => setLoadingStatus(status));
      const onEvent = createCouncilEventHandler({
        roomIdRef,
        streamingRoleIdRef,
        setMessages,
        setRoleStreamStates,
      });

      const roleSettings = roomMode === "single"
        ? { roleCount: 1, maxAutoInviteLenses: 0, allowAutoInviteLenses: false }
        : undefined;

      const chipRequests: ExplicitRoleRequest[] = pendingPerspectiveChips.map((chip) => ({
        targetType: "persona",
        targetId: chip.roleId,
        confidence: 1.0,
        rawText: `+${chip.roleName}`,
      }));
      setPendingPerspectiveChips([]);

      if (roomMode === "council") {
        const preview = await prepareCouncilDispatch({
          room: roomForCouncil,
          topic: text,
          userMessage: userMsg,
          availableRoles: allRoles,
          recentMessages: messages,
          docContents,
          roleSettings,
          explicitRoleRequests: chipRequests.length > 0 ? chipRequests : undefined,
        });

        setDispatchGate({
          preview,
          userMsg,
          roomForCouncil,
          allRoles,
          docContents,
          onEvent,
          roleSettings,
          chipRequests,
        });
        setDispatchSelectedRoleIds(preview.defaultSelectedRoleIds);
        setIsLoading(false);
        setLoadingStatus("");
        return;
      }

      const result = await runCouncilRound({
        room: roomForCouncil,
        topic: text,
        userMessage: userMsg,
        availableRoles: allRoles,
        llm: provider,
        recentMessages: messages,
        docContents,
        onEvent,
        roleSettings,
        explicitRoleRequests: chipRequests.length > 0 ? chipRequests : undefined,
      });

      setLastRoutingDecision(
        result.routingDecision
          ? { messageId: userMsg.id, decision: result.routingDecision }
          : null,
      );
      setLoadingStatus("Persisting...");

      const outputFiles = await persistCouncilRunResult({
        bridge,
        workspacePath: workspace.path,
        roomId: roomIdRef.current!,
        roomForCouncil,
        messages,
        userMsg,
        result,
      });

      if (result.crossExaminationMessages.length > 0) {
        setMessages((prev) => [...prev, ...result.crossExaminationMessages]);
      }
      setOutputs(outputFiles);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("Council round failed:", msg);
      setError(msg);
      setPanelPhase("error");
    } finally {
      setIsLoading(false);
      setLoadingStatus("");
      finalizeRoleStreams({
        roomIdRef,
        setLastRoundSnapshot,
        setPanelPhase,
        setRoleStreamStates,
      });
    }
  }, [
    allRoles,
    collapseTimerRef,
    llmConfig,
    loadRooms,
    messages,
    pendingPerspectiveChips,
    roomIdRef,
    roomMode,
    setDispatchGate,
    setDispatchSelectedRoleIds,
    setError,
    setIsLoading,
    setLastRoutingDecision,
    setLastRoundSnapshot,
    setLoadingStatus,
    setMessages,
    setOutputs,
    setPanelPhase,
    setPanelVisible,
    setPendingPerspectiveChips,
    setRoleStreamStates,
    streamingRoleIdRef,
  ]);
}
