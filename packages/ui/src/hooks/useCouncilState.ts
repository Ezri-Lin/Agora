import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import type {
  CouncilMessage,
  CouncilRoundSnapshot,
  LLMConfig,
  RoleCard,
  RoleRoutingDecision,
  RoomMode,
} from "@agora/shared";
import { stopRole } from "@agora/kernel";
import { DEFAULT_ROLES } from "@agora/roles";
import { buildRoleHistories } from "../FloatingPanel/buildRoleHistories.js";
import { getBridge } from "../AgoraBridge.js";
import type { PendingPerspectiveChip } from "../Composer/Composer.js";
import type { RoleStreamState } from "../CouncilMonitor/CouncilMonitor.js";
import type { WorkspaceRef } from "./useWorkspaceState.js";
import { useCouncilDispatchContinue } from "./useCouncilDispatchContinue.js";
import { useCouncilSend } from "./useCouncilSend.js";
import type { CouncilState, CustomRole, DispatchGateContext } from "./councilStateTypes.js";

export function useCouncilState(): CouncilState {
  const [messages, setMessages] = useState<CouncilMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState("");
  const [outputs, setOutputs] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [llmConfig, setLlmConfig] = useState<LLMConfig>({
    provider: "mock",
    model: "mock",
  });
  const [rooms, setRooms] = useState<Array<{ id: string; title: string; createdAt: string }>>([]);
  const [customRoles, setCustomRoles] = useState<CustomRole[]>([]);
  const [roleStreamStates, setRoleStreamStates] = useState<Map<string, RoleStreamState>>(new Map());
  const [lastRoundSnapshot, setLastRoundSnapshot] = useState<CouncilRoundSnapshot | null>(null);
  const [panelPhase, setPanelPhase] = useState<"idle" | "running" | "completed" | "error">("idle");
  const [panelVisible, setPanelVisible] = useState(false);
  const [roomMode, setRoomMode] = useState<RoomMode>("council");
  const [pendingPerspectiveChips, setPendingPerspectiveChips] = useState<PendingPerspectiveChip[]>([]);
  const [lastRoutingDecision, setLastRoutingDecision] = useState<{
    messageId: string;
    decision: RoleRoutingDecision;
  } | null>(null);
  const [dispatchGate, setDispatchGate] = useState<DispatchGateContext | null>(null);
  const [dispatchSelectedRoleIds, setDispatchSelectedRoleIds] = useState<string[]>([]);

  const roomIdRef = useRef<string | null>(null);
  const streamingRoleIdRef = useRef<string | null>(null);
  const collapseTimerRef = useRef<ReturnType<typeof setTimeout>>();

  const roleHistories = useMemo(
    () => buildRoleHistories({ roomId: roomIdRef.current, messages, roleStreamStates }),
    [messages, roleStreamStates],
  );

  const allRoles: RoleCard[] = useMemo(
    () => [...DEFAULT_ROLES, ...customRoles.map((r) => ({ ...r, type: r.type as RoleCard["type"] }))],
    [customRoles],
  );

  const loadRooms = useCallback(async (wsPath: string) => {
    const bridge = getBridge();
    if (!bridge) return;
    try {
      const list = await bridge.room.list(wsPath);
      setRooms(list);
    } catch {
      // Ignore stale or inaccessible room roots.
    }
  }, []);

  const loadCustomRoles = useCallback(async (wsPath: string) => {
    const bridge = getBridge();
    if (!bridge) return;
    try {
      const list = await bridge.customRoles.list(wsPath);
      setCustomRoles(list);
    } catch {
      // Ignore stale or inaccessible role roots.
    }
  }, []);

  const loadWorkspaceData = useCallback((wsPath: string) => {
    loadRooms(wsPath);
    loadCustomRoles(wsPath);
  }, [loadRooms, loadCustomRoles]);

  useEffect(() => {
    const bridge = getBridge();
    if (!bridge) return;
    bridge.getLLMConfig().then((cfg) => {
      setLlmConfig(cfg as LLMConfig);
    });
  }, []);

  useEffect(() => {
    if (panelPhase === "completed" || panelPhase === "error") {
      collapseTimerRef.current = setTimeout(() => {
        setPanelPhase("idle");
        setRoleStreamStates(new Map());
      }, 12_000);
      return () => clearTimeout(collapseTimerRef.current);
    }
  }, [panelPhase]);

  const handleSelectRoom = useCallback(async (roomId: string, workspacePath: string) => {
    const bridge = getBridge();
    if (!bridge) return;
    const data = await bridge.room.load(workspacePath, roomId);
    if (!data) return;
    roomIdRef.current = roomId;
    setMessages(data.messages as CouncilMessage[]);
    const outputFiles = await bridge.room.listOutputs(workspacePath, roomId);
    setOutputs(outputFiles);
    setError(null);
  }, []);

  const handleStop = useCallback(() => {
    setIsLoading(false);
    setLoadingStatus("");
  }, []);

  const handleStopRole = useCallback((roleId: string) => {
    const roundId = roomIdRef.current ? `round_${roomIdRef.current}_*` : "";
    stopRole(roundId, roleId);
  }, []);

  const handleRemoveRole = useCallback((roleId: string) => {
    setRoleStreamStates((prev) => {
      const next = new Map(prev);
      next.delete(roleId);
      return next;
    });
  }, []);

  const handleAddPerspective = useCallback((roleId: string, roleName: string) => {
    setPendingPerspectiveChips((prev) => {
      if (prev.some((c) => c.roleId === roleId)) return prev;
      return [...prev, { id: `chip_${roleId}_${Date.now()}`, roleId, roleName }];
    });
  }, []);

  const handleRemovePerspectiveChip = useCallback((id: string) => {
    setPendingPerspectiveChips((prev) => prev.filter((c) => c.id !== id));
  }, []);

  const handleConfigChanged = useCallback(() => {
    const bridge = getBridge();
    if (!bridge) return;
    bridge.getLLMConfig().then((cfg) => {
      setLlmConfig(cfg as LLMConfig);
    });
  }, []);

  const clearError = useCallback(() => setError(null), []);

  const newRoom = useCallback(() => {
    roomIdRef.current = null;
    setMessages([]);
    setOutputs([]);
    setError(null);
  }, []);

  const handleSend = useCouncilSend({
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
  });

  const handleDispatchContinue = useCouncilDispatchContinue({
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
  });

  const handleDispatchCancel = useCallback(() => {
    setDispatchGate(null);
    setDispatchSelectedRoleIds([]);
    setIsLoading(false);
    setLoadingStatus("");
    setPanelPhase("idle");
  }, []);

  return {
    rooms,
    customRoles,
    messages,
    isLoading,
    loadingStatus,
    outputs,
    error,
    llmConfig,
    roomMode,
    pendingPerspectiveChips,
    roleStreamStates,
    lastRoundSnapshot,
    panelPhase,
    lastRoutingDecision,
    dispatchGate,
    dispatchSelectedRoleIds,
    roomIdRef,
    streamingRoleIdRef,
    roleHistories,
    allRoles,
    loadRooms,
    loadCustomRoles,
    loadWorkspaceData,
    handleSelectRoom,
    handleSend,
    handleDispatchContinue: (
      selectedRoleIds: string[],
      workspace: { path: string },
      selectedRefs: WorkspaceRef[],
    ) => handleDispatchContinue(selectedRoleIds, workspace, selectedRefs),
    handleDispatchCancel,
    handleStop,
    handleStopRole,
    handleRemoveRole,
    handleAddPerspective,
    handleRemovePerspectiveChip,
    handleConfigChanged,
    setRoomMode,
    setPanelVisible,
    setDispatchSelectedRoleIds,
    newRoom,
    clearError,
  };
}
