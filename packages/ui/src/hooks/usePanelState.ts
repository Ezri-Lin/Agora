import { useState, useCallback } from "react";
import type { SidecarTab } from "../AppShell/AppShell.types.js";

export interface PanelState {
  showSettings: boolean;
  terminalVisible: boolean;
  panelVisible: boolean;
  sidecarVisible: boolean;
  sidecarTab: SidecarTab;
  dispatchGateOpen: boolean;
  showWriteProposalPanel: boolean;
  showMemoryReviewPanel: boolean;
  showSessionSummaryPanel: boolean;
  openSettings: () => void;
  closeSettings: () => void;
  toggleTerminal: () => void;
  togglePanel: () => void;
  toggleSidecar: () => void;
  setSidecarTab: (tab: SidecarTab) => void;
  setDispatchGateOpen: (open: boolean) => void;
  openWriteProposalPanel: () => void;
  closeWriteProposalPanel: () => void;
  openMemoryReviewPanel: () => void;
  closeMemoryReviewPanel: () => void;
  openSessionSummaryPanel: () => void;
  closeSessionSummaryPanel: () => void;
}

export function usePanelState(): PanelState {
  const [showSettings, setShowSettings] = useState(false);
  const [terminalVisible, setTerminalVisible] = useState(false);
  const [panelVisible, setPanelVisible] = useState(false);
  const [sidecarVisible, setSidecarVisible] = useState(() => {
    try { return localStorage.getItem("agora:sidecar-visible") === "true"; } catch { return false; }
  });
  const [sidecarTab, setSidecarTab] = useState<SidecarTab>("progress");
  const [dispatchGateOpen, setDispatchGateOpen] = useState(false);
  const [showWriteProposalPanel, setShowWriteProposalPanel] = useState(false);
  const [showMemoryReviewPanel, setShowMemoryReviewPanel] = useState(false);
  const [showSessionSummaryPanel, setShowSessionSummaryPanel] = useState(false);

  const openSettings = useCallback(() => setShowSettings(true), []);
  const closeSettings = useCallback(() => setShowSettings(false), []);
  const toggleTerminal = useCallback(() => setTerminalVisible((v) => !v), []);
  const togglePanel = useCallback(() => setPanelVisible((v) => !v), []);
  const toggleSidecar = useCallback(() => {
    setSidecarVisible((v) => {
      const next = !v;
      try { localStorage.setItem("agora:sidecar-visible", String(next)); } catch { /* ok */ }
      return next;
    });
  }, []);
  const openWriteProposalPanel = useCallback(() => setShowWriteProposalPanel(true), []);
  const closeWriteProposalPanel = useCallback(() => setShowWriteProposalPanel(false), []);
  const openMemoryReviewPanel = useCallback(() => setShowMemoryReviewPanel(true), []);
  const closeMemoryReviewPanel = useCallback(() => setShowMemoryReviewPanel(false), []);
  const openSessionSummaryPanel = useCallback(() => setShowSessionSummaryPanel(true), []);
  const closeSessionSummaryPanel = useCallback(() => setShowSessionSummaryPanel(false), []);

  return {
    showSettings,
    terminalVisible,
    panelVisible,
    sidecarVisible,
    sidecarTab,
    dispatchGateOpen,
    showWriteProposalPanel,
    showMemoryReviewPanel,
    showSessionSummaryPanel,
    openSettings,
    closeSettings,
    toggleTerminal,
    togglePanel,
    toggleSidecar,
    setSidecarTab,
    setDispatchGateOpen,
    openWriteProposalPanel,
    closeWriteProposalPanel,
    openMemoryReviewPanel,
    closeMemoryReviewPanel,
    openSessionSummaryPanel,
    closeSessionSummaryPanel,
  };
}
