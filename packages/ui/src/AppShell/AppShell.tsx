import React, { useState, useEffect } from "react";
import type { RoomMode } from "@agora/shared";
import { TitleBar } from "./TitleBar.js";
import { spacing } from "../theme/tokens.js";
import { useI18n } from "../i18n/I18nContext.js";
import { useTheme } from "../theme/ThemeContext.js";
import type { ColorPalette } from "../theme/palettes.js";
import { RoomModeTabs } from "../RoomMode/RoomModeTabs.js";
import { TerminalPanel } from "../Terminal/TerminalPanel.js";
import { createAppShellStyles } from "./AppShell.styles.js";
import type { AppView } from "./AppShell.types.js";

interface RoomEntry {
  id: string;
  title: string;
  createdAt: string;
}

interface AppShellProps {
  view?: AppView;
  onViewChange?: (view: AppView) => void;
  workspaceName: string;
  onOpenWorkspace: () => void;
  home?: React.ReactNode;
  contextGraph: React.ReactNode;
  main: React.ReactNode;
  document?: React.ReactNode;
  floatingPanel?: React.ReactNode;
  composer: React.ReactNode;
  onAddRef?: () => void;
  onOpenSettings?: () => void;
  rooms?: RoomEntry[];
  activeRoomId?: string | null;
  onSelectRoom?: (roomId: string) => void;
  onNewRoom?: () => void;
  panelVisible?: boolean;
  onTogglePanel?: () => void;
  roomMode?: RoomMode;
  onRoomModeChange?: (mode: RoomMode) => void;
  terminalVisible?: boolean;
  onToggleTerminal?: () => void;
  workspacePath?: string;
}

export const AppShell: React.FC<AppShellProps> = ({
  view = "room",
  onViewChange,
  workspaceName,
  onOpenWorkspace,
  home,
  contextGraph,
  main,
  document,
  floatingPanel,
  composer,
  onAddRef,
  onOpenSettings,
  rooms = [],
  activeRoomId,
  onSelectRoom,
  onNewRoom,
  panelVisible,
  onTogglePanel,
  roomMode,
  onRoomModeChange,
  terminalVisible,
  onToggleTerminal,
  workspacePath,
}) => {
  const { t } = useI18n();
  const { colors } = useTheme();
  const [leftExpanded, setLeftExpanded] = useState(false);

  // Ctrl+` toggles terminal
  useEffect(() => {
    if (!onToggleTerminal) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === "`") {
        e.preventDefault();
        onToggleTerminal();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onToggleTerminal]);

  const styles = createAppShellStyles(colors);
  const leftRailStyle: React.CSSProperties = leftExpanded
    ? { ...styles.leftRail, width: "100%", position: "relative" as const }
    : styles.leftRail;
  return (
    <div style={styles.root}>
      <TitleBar
        workspaceName={workspaceName}
        onOpenWorkspace={onOpenWorkspace}
        view={view}
        onViewChange={onViewChange}
        onOpenSettings={onOpenSettings}
        terminalVisible={terminalVisible}
        onToggleTerminal={onToggleTerminal}
        panelVisible={panelVisible}
        onTogglePanel={onTogglePanel}
      />
      {view === "home" && (
        <div style={styles.surfaceSlot}>
          {home}
        </div>
      )}
      {view === "document" && (
        <div style={styles.surfaceSlot}>
          {document}
        </div>
      )}
      {view === "room" && (
      <div style={styles.mainLayout}>
        <div style={leftRailStyle}>
          <div style={styles.leftHeader}>
            <RoomList rooms={rooms} activeRoomId={activeRoomId} onSelect={onSelectRoom} onNew={onNewRoom} t={t} colors={colors} />
            <button
              style={styles.expandBtn}
              onClick={() => setLeftExpanded(!leftExpanded)}
              title={leftExpanded ? t.collapseGraph : t.expandGraph}
            >
              {leftExpanded ? "⤡" : "⤢"}
            </button>
          </div>
          {contextGraph}
        </div>
        {!leftExpanded && (
          <div style={styles.chatRegion}>
            <div style={styles.chatContent}>
              <div style={styles.chat}>
                <div style={styles.chatHeader}>
                  <div style={{ display: "flex", alignItems: "center", gap: spacing.sm }}>
                    {roomMode && onRoomModeChange && (
                      <RoomModeTabs
                        mode={roomMode}
                        onChange={onRoomModeChange}
                        colors={colors}
                        labelSingle={t.singleMode}
                        labelCouncil={t.councilMode}
                        tooltip={t.modeOnlyAffectsNext}
                        singleHint={t.singleModeHint}
                        councilHint={t.councilModeHint}
                      />
                    )}
                    <span style={styles.chatTitle}>{t.councilRoom}</span>
                  </div>
                  <div style={{ display: "flex", gap: spacing.sm, alignItems: "center" }}>
                    {onAddRef && (
                      <button style={styles.addRefBtn} onClick={onAddRef}>
                        {t.addReference}
                      </button>
                    )}
                  </div>
                </div>
                {main}
              </div>
              {floatingPanel}
            </div>
            {composer}
            {terminalVisible && (
              <TerminalPanel
                visible={terminalVisible}
                workspacePath={workspacePath}
                onClose={onToggleTerminal ?? (() => {})}
              />
            )}
          </div>
        )}
      </div>
      )}
    </div>
  );
};

const RoomList: React.FC<{
  rooms: RoomEntry[];
  activeRoomId?: string | null;
  onSelect?: (id: string) => void;
  onNew?: () => void;
  t: { rooms: string; noRooms: string };
  colors: ColorPalette;
}> = ({ rooms, activeRoomId, onSelect, onNew, t, colors }) => {
  const styles = createAppShellStyles(colors);
  return (
  <div style={styles.roomList}>
    <div style={styles.roomListHeader}>
      <span style={styles.roomListTitle}>{t.rooms}</span>
      {onNew && (
        <button style={styles.newRoomBtn} onClick={onNew}>+</button>
      )}
    </div>
    <div style={styles.roomListItems}>
      {rooms.length === 0 && (
        <div style={styles.roomEmpty}>{t.noRooms}</div>
      )}
      {rooms.map((r) => (
        <button
          key={r.id}
          style={{
            ...styles.roomItem,
            ...(r.id === activeRoomId ? styles.roomItemActive : {}),
          }}
          onClick={() => onSelect?.(r.id)}
        >
          {r.title.slice(0, 40)}
        </button>
      ))}
    </div>
  </div>
  );
};
