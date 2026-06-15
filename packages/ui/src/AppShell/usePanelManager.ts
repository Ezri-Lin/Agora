import { useCallback, useEffect, useRef } from "react";
import { usePanelRef } from "react-resizable-panels";

export function usePanelManager(sidecarVisible: boolean, terminalVisible?: boolean, sidebarCollapsed?: boolean) {
  const sidebarRef = usePanelRef();
  const docsHandle = useRef<any>(null);
  const terminalHandle = useRef<any>(null);

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

  // Sidebar expand/collapse
  useEffect(() => {
    if (!sidebarRef.current) return;
    if (sidebarRef.current.isCollapsed()) sidebarRef.current.expand();
  }, []);

  useEffect(() => {
    if (!sidebarRef.current) return;
    if (sidebarCollapsed) sidebarRef.current.collapse();
    else sidebarRef.current.expand();
  }, [sidebarCollapsed]);

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

  return { sidebarRef, onDocsPanelRef, onTerminalPanelRef };
}
