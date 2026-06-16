import { useCallback } from "react";
import type { Dispatch, MutableRefObject, SetStateAction } from "react";
import type {
  CouncilMessage,
  CouncilRoundSnapshot,
  LLMConfig,
  RoleRoutingDecision,
} from "@agora/shared";
import { runCouncilRound } from "@agora/kernel";
import { getBridge } from "../AgoraBridge.js";
import { IPCProvider } from "../IPCProvider.js";
import type { RoleStreamState } from "../CouncilMonitor/CouncilMonitor.js";
import type { WorkspaceRef } from "./useWorkspaceState.js";
import { finalizeRoleStreams } from "./councilCompletion.js";
import { persistCouncilRunResult } from "./councilPersistence.js";
import { persistInviteGateState } from "./councilSend/persistInviteGateState.js";
import type { DispatchGateContext } from "./councilStateTypes.js";

interface UseCouncilDispatchContinueParams {
  dispatchGate: DispatchGateContext | null;
  messages: CouncilMessage[];
  llmConfig: LLMConfig;
  roomIdRef: MutableRefObject<string | null>;
  setDispatchGate: Dispatch<SetStateAction<DispatchGateContext | null>>;
  setIsLoading: Dispatch<SetStateAction<boolean>>;
  setLoadingStatus: Dispatch<SetStateAction<string>>;
  setOutputs: Dispatch<SetStateAction<string[]>>;
  setError: Dispatch<SetStateAction<string | null>>;
  setMessages: Dispatch<SetStateAction<CouncilMessage[]>>;
  setRoleStreamStates: Dispatch<SetStateAction<Map<string, RoleStreamState>>>;
  setLastRoundSnapshot: Dispatch<SetStateAction<CouncilRoundSnapshot | null>>;
  setPanelPhase: Dispatch<SetStateAction<"idle" | "running" | "completed" | "error">>;
  setLastRoutingDecision: Dispatch<
    SetStateAction<{ messageId: string; decision: RoleRoutingDecision } | null>
  >;
}

export function useCouncilDispatchContinue({
  dispatchGate,
  messages,
  llmConfig,
  roomIdRef,
  setDispatchGate,
  setIsLoading,
  setLoadingStatus,
  setOutputs,
  setError,
  setMessages,
  setRoleStreamStates,
  setLastRoundSnapshot,
  setPanelPhase,
  setLastRoutingDecision,
}: UseCouncilDispatchContinueParams) {
  return useCallback(async (
    selectedRoleIds: string[],
    workspace: { path: string },
    _selectedRefs: WorkspaceRef[],
  ) => {
    if (!dispatchGate) return;
    const bridge = getBridge();
    if (!bridge) return;

    const {
      preview,
      userMsg,
      roomForCouncil,
      allRoles,
      docContents,
      onEvent,
      roleSettings,
      chipRequests,
    } = dispatchGate;
    setDispatchGate(null);
    setIsLoading(true);
    setLoadingStatus("Running council round...");

    try {
      const provider = new IPCProvider(llmConfig, (status) => setLoadingStatus(status));
      const result = await runCouncilRound({
        room: roomForCouncil,
        topic: preview.topic,
        userMessage: userMsg,
        availableRoles: allRoles,
        llm: provider,
        recentMessages: messages,
        docContents,
        onEvent,
        roleSettings,
        explicitRoleRequests: chipRequests.length > 0 ? chipRequests : undefined,
        selectedRoleIds,
      });

      if (result.routingDecision) {
        setLastRoutingDecision({
          messageId: userMsg.id,
          decision: result.routingDecision,
        });
      }

      // Persist invite gate cooldown after successful dispatch
      try {
        const taskFrame = dispatchGate.taskFrame;
        if (taskFrame) {
          await persistInviteGateState({
            workspacePath: workspace.path,
            roomId: roomIdRef.current!,
            roundId: `round_${roomIdRef.current}_${Date.now()}`,
            taskFrame,
            bridge,
          });
        }
      } catch (err) {
        console.warn("Failed to persist invite gate state:", err);
      }

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
    dispatchGate,
    llmConfig,
    messages,
    roomIdRef,
    setDispatchGate,
    setError,
    setIsLoading,
    setLastRoutingDecision,
    setLastRoundSnapshot,
    setLoadingStatus,
    setMessages,
    setOutputs,
    setPanelPhase,
    setRoleStreamStates,
  ]);
}
