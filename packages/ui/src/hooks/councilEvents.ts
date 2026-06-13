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

  return (event: CouncilEvent) => {
    switch (event.type) {
      case "role_start": {
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
        const thinkingDelta = event.thinking ?? "";
        setMessages((prev) =>
          prev.map((m) =>
            m.id === msgId
              ? {
                  ...m,
                  content: m.content + (event.delta ?? ""),
                  thinking: (m.thinking ?? "") + thinkingDelta,
                }
              : m,
          ),
        );
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
            // Replace the thinking placeholder with the real moderator message
            setMessages((prev) => prev.map(m =>
              m.id === moderatorPlaceholderId ? event.message! : m
            ));
          } else {
            setMessages((prev) => [...prev, event.message!]);
          }
        }
        break;
      }
      case "summary_done": {
        if (event.content) {
          const summaryMsg: CouncilMessage = {
            id: generateId("msg"),
            roomId: roomIdRef.current!,
            senderType: "moderator",
            senderId: "moderator",
            content: event.content,
            createdAt: nowISO(),
          };
          setMessages((prev) => [...prev, summaryMsg]);
        }
        break;
      }
    }
  };
}
