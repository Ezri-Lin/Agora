import { useCallback, useEffect, useLayoutEffect, useRef } from "react";
import { usePanelRef } from "react-resizable-panels";

export function usePanelManager(
  sidecarVisible: boolean,
  terminalVisible?: boolean,
  stageVisible?: boolean,
) {
  const stageHandle = useRef<any>(null);
  const docsHandle = useRef<any>(null);
  const terminalHandle = useRef<any>(null);

  const onStagePanelRef = useCallback((handle: any) => {
    stageHandle.current = handle;
    if (handle) requestAnimationFrame(() => handle.collapse());
  }, []);

  const onDocsPanelRef = useCallback((handle: any) => {
    docsHandle.current = handle;
    if (handle) requestAnimationFrame(() => {
      if (!sidecarVisible) handle.collapse();
    });
  }, [sidecarVisible]);

  const onTerminalPanelRef = useCallback((handle: any) => {
    terminalHandle.current = handle;
    if (handle) requestAnimationFrame(() => handle.collapse());
  }, []);

  // Stage expand/collapse
  useLayoutEffect(() => {
    if (!stageHandle.current) return;
    if (stageVisible) stageHandle.current.expand();
    else stageHandle.current.collapse();
  }, [stageVisible]);

  // Sidecar expand/collapse
  useEffect(() => {
    if (!docsHandle.current) return;
    if (sidecarVisible) docsHandle.current.expand();
    else docsHandle.current.collapse();
  }, [sidecarVisible]);

  // Terminal expand/collapse
  useEffect(() => {
    if (!terminalHandle.current) return;
    if (terminalVisible) terminalHandle.current.expand();
    else terminalHandle.current.collapse();
  }, [terminalVisible]);

  // Ctrl+` toggles terminal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === "`") {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent("toggle-terminal"));
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return { onStagePanelRef, onDocsPanelRef, onTerminalPanelRef };
}
