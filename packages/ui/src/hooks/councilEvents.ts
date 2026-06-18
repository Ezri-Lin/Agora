import type { Dispatch, MutableRefObject, SetStateAction } from "react";
import type { CouncilEvent, CouncilMessage } from "@agora/shared";
import { generateId, nowISO } from "@agora/shared";
import type { RoleStreamState } from "../CouncilMonitor/CouncilMonitor.js";

interface CouncilEventHandlerParams {
  roomIdRef: MutableRefObject<string | null>;
  streamingRoleIdRef: MutableRefObject<string | null>;
  setMessages: Dispatch<SetStateAction<CouncilMessage[]>>;
  setRoleStreamStates: Dispatch<SetStateAction<Map<string, RoleStreamState>>>;
  moderatorPlaceholderId?: string;
}

export function createCouncilEventHandler({
  roomIdRef,
  streamingRoleIdRef,
  setMessages,
  setRoleStreamStates,
  moderatorPlaceholderId,
}: CouncilEventHandlerParams): (event: CouncilEvent) => void {
  const streamingMsgIds = new Map<string, string>();

  // Batch buffer for chunk updates
  let pendingChunks: Array<{ roleId: string; delta: string; thinking: string }> = [];
  let flushTimer: ReturnType<typeof setTimeout> | null = null;

  const flushChunks = () => {
    if (pendingChunks.length === 0) return;
    const chunks = pendingChunks;
    pendingChunks = [];

    // Batch message updates — apply all pending deltas in one pass
    setMessages((prev) => {
      let changed = false;
      const next = prev.map((m) => {
        const msgId = streamingMsgIds.get(m.senderId);
        if (!msgId || m.id !== msgId) return m;
        let newContent = m.content;
        let newThinking = m.thinking ?? "";
        for (const chunk of chunks) {
          if (streamingMsgIds.get(chunk.roleId) === msgId) {
            newContent += chunk.delta;
            newThinking += chunk.thinking;
          }
        }
        if (newContent !== m.content || newThinking !== (m.thinking ?? "")) {
          changed = true;
          return { ...m, content: newContent, thinking: newThinking };
        }
        return m;
      });
      return changed ? next : prev;
    });

    // Single roleStreamStates update from the last chunk
    const lastChunk = chunks[chunks.length - 1];
    setRoleStreamStates((prev) => {
      const existing = prev.get(lastChunk.roleId);
      if (!existing) return prev;
      const summary = (lastChunk.thinking || lastChunk.delta).slice(-60);
      const next = new Map(prev);
      next.set(lastChunk.roleId, {
        ...existing,
        status: "streaming",
        microSummary: summary || existing.microSummary,
      });
      return next;
    });
  };

  return (event: CouncilEvent) => {
    switch (event.type) {
      case "role_start": {
        // Flush any pending chunks for previous role before starting new one
        flushChunks();
        if (flushTimer) { clearTimeout(flushTimer); flushTimer = null; }

        const msgId = `msg_${event.roleId}_${Date.now()}`;
        streamingMsgIds.set(event.roleId!, msgId);
        streamingRoleIdRef.current = event.roleId!;
        const placeholder: CouncilMessage = {
          id: msgId,
          roomId: roomIdRef.current!,
          senderType: "role",
          senderId: event.roleId!,
          content: "",
          thinking: "",
          status: "ok",
          createdAt: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, placeholder]);
        setRoleStreamStates((prev) => {
          const next = new Map(prev);
          next.set(event.roleId!, {
            status: "thinking",
            startedAt: Date.now(),
            microSummary: "",
            messageId: msgId,
          });
          return next;
        });
        break;
      }
      case "role_chunk": {
        const msgId = streamingMsgIds.get(event.roleId!);
        if (!msgId) break;
        pendingChunks.push({
          roleId: event.roleId!,
          delta: event.delta ?? "",
          thinking: event.thinking ?? "",
        });
        if (!flushTimer) {
          flushTimer = setTimeout(() => {
            flushTimer = null;
            flushChunks();
          }, 50);
        }
        break;
      }
      case "role_done": {
        // Flush pending chunks before finalizing
        flushChunks();
        if (flushTimer) { clearTimeout(flushTimer); flushTimer = null; }

        const msgId = streamingMsgIds.get(event.roleId!);
        if (!msgId || !event.message) break;
        streamingRoleIdRef.current = null;
        setMessages((prev) => prev.map((m) => (m.id === msgId ? event.message! : m)));
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
          if (moderatorPlaceholderId) {
            // Try to replace placeholder; if not found (already removed), append
            let replaced = false;
            setMessages((prev) => {
              const next = prev.map((m) => {
                if (m.id === moderatorPlaceholderId) {
                  replaced = true;
                  return event.message!;
                }
                return m;
              });
              return replaced ? next : [...prev, event.message!];
            });
          } else {
            setMessages((prev) => [...prev, event.message!]);
          }
        }
        break;
      }
      // summary_done removed — host does not auto-summarize after fan-out
    }
  };
}
