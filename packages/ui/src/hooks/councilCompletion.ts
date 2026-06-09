import type { Dispatch, MutableRefObject, SetStateAction } from "react";
import type { CouncilRoundSnapshot, RoleRunSnapshot } from "@agora/shared";
import type { RoleStreamState } from "../CouncilMonitor/CouncilMonitor.js";

interface FinalizeRoleStreamsParams {
  roomIdRef: MutableRefObject<string | null>;
  setLastRoundSnapshot: Dispatch<SetStateAction<CouncilRoundSnapshot | null>>;
  setPanelPhase: Dispatch<SetStateAction<"idle" | "running" | "completed" | "error">>;
  setRoleStreamStates: Dispatch<SetStateAction<Map<string, RoleStreamState>>>;
}

export function finalizeRoleStreams({
  roomIdRef,
  setLastRoundSnapshot,
  setPanelPhase,
  setRoleStreamStates,
}: FinalizeRoleStreamsParams): void {
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
      setPanelPhase((phase) => (phase === "error" ? "error" : "completed"));
    }

    return prev;
  });
}
