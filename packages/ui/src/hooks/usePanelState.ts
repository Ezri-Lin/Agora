import { useState, useCallback } from "react";

export interface PanelState {
  showSettings: boolean;
  terminalVisible: boolean;
  panelVisible: boolean;
  dispatchGateOpen: boolean;
  showWriteProposalPanel: boolean;
  showMemoryReviewPanel: boolean;
  showSessionSummaryPanel: boolean;
  openSettings: () => void;
  closeSettings: () => void;
  toggleTerminal: () => void;
  togglePanel: () => void;
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
  const [dispatchGateOpen, setDispatchGateOpen] = useState(false);
  const [showWriteProposalPanel, setShowWriteProposalPanel] = useState(false);
  const [showMemoryReviewPanel, setShowMemoryReviewPanel] = useState(false);
  const [showSessionSummaryPanel, setShowSessionSummaryPanel] = useState(false);

  const openSettings = useCallback(() => setShowSettings(true), []);
  const closeSettings = useCallback(() => setShowSettings(false), []);
  const toggleTerminal = useCallback(() => setTerminalVisible((v) => !v), []);
  const togglePanel = useCallback(() => setPanelVisible((v) => !v), []);
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
    dispatchGateOpen,
    showWriteProposalPanel,
    showMemoryReviewPanel,
    showSessionSummaryPanel,
    openSettings,
    closeSettings,
    toggleTerminal,
    togglePanel,
    setDispatchGateOpen,
    openWriteProposalPanel,
    closeWriteProposalPanel,
    openMemoryReviewPanel,
    closeMemoryReviewPanel,
    openSessionSummaryPanel,
    closeSessionSummaryPanel,
  };
}
