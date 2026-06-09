import type {
  CouncilMessage,
  CouncilEvent,
  CouncilRoom,
  CouncilRoundSnapshot,
  ExplicitRoleRequest,
  LLMConfig,
  RoleCard,
  RoleRoutingDecision,
  RoomMode,
} from "@agora/shared";
import type { CouncilDispatchPreview } from "@agora/kernel";
import type { MutableRefObject } from "react";
import type { PendingPerspectiveChip } from "../Composer/Composer.js";
import type { RoleStreamState } from "../CouncilMonitor/CouncilMonitor.js";
import type { buildRoleHistories } from "../FloatingPanel/buildRoleHistories.js";
import type { WorkspaceRef } from "./useWorkspaceState.js";

export interface DispatchGateContext {
  preview: CouncilDispatchPreview;
  userMsg: CouncilMessage;
  roomForCouncil: CouncilRoom;
  allRoles: RoleCard[];
  docContents: Map<string, string>;
  onEvent: (event: CouncilEvent) => void;
  roleSettings?: {
    roleCount: number;
    maxAutoInviteLenses: number;
    allowAutoInviteLenses: boolean;
  };
  chipRequests: ExplicitRoleRequest[];
}

export interface CustomRole {
  id: string;
  name: string;
  nameCN: string;
  subtitle: string;
  type: string;
  systemPrompt: string;
  tags: string[];
}

export interface CouncilState {
  rooms: Array<{ id: string; title: string; createdAt: string }>;
  customRoles: CustomRole[];
  messages: CouncilMessage[];
  isLoading: boolean;
  loadingStatus: string;
  outputs: string[];
  error: string | null;
  llmConfig: LLMConfig;
  roomMode: RoomMode;
  pendingPerspectiveChips: PendingPerspectiveChip[];
  roleStreamStates: Map<string, RoleStreamState>;
  lastRoundSnapshot: CouncilRoundSnapshot | null;
  panelPhase: "idle" | "running" | "completed" | "error";
  lastRoutingDecision: {
    messageId: string;
    decision: RoleRoutingDecision;
  } | null;
  dispatchGate: DispatchGateContext | null;
  dispatchSelectedRoleIds: string[];
  roomIdRef: MutableRefObject<string | null>;
  streamingRoleIdRef: MutableRefObject<string | null>;
  roleHistories: ReturnType<typeof buildRoleHistories>;
  allRoles: RoleCard[];
  loadRooms: (wsPath: string) => Promise<void>;
  loadCustomRoles: (wsPath: string) => Promise<void>;
  loadWorkspaceData: (wsPath: string) => void;
  handleSelectRoom: (roomId: string, workspacePath: string) => Promise<void>;
  handleSend: (
    text: string,
    workspace: { path: string },
    selectedRefs: WorkspaceRef[],
  ) => Promise<void>;
  handleDispatchContinue: (
    selectedRoleIds: string[],
    workspace: { path: string },
    selectedRefs: WorkspaceRef[],
  ) => Promise<void>;
  handleDispatchCancel: () => void;
  handleStop: () => void;
  handleStopRole: (roleId: string) => void;
  handleRemoveRole: (roleId: string) => void;
  handleAddPerspective: (roleId: string, roleName: string) => void;
  handleRemovePerspectiveChip: (id: string) => void;
  handleConfigChanged: () => void;
  setRoomMode: (mode: RoomMode) => void;
  setPanelVisible: (v: boolean | ((prev: boolean) => boolean)) => void;
  setDispatchSelectedRoleIds: (ids: string[]) => void;
  newRoom: () => void;
  clearError: () => void;
}
