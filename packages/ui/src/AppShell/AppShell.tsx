import React from "react";
import { TitleBar } from "./TitleBar.js";
import { sizes } from "../theme/tokens.js";
import { useI18n } from "../i18n/I18nContext.js";
import { useTheme } from "../theme/ThemeContext.js";
import type { ColorPalette } from "../theme/palettes.js";

interface RoomEntry {
  id: string;
  title: string;
  createdAt: string;
}

interface AppShellProps {
  workspaceName: string;
  onOpenWorkspace: () => void;
  contextGraph: React.ReactNode;
  main: React.ReactNode;
  inspector: React.ReactNode;
  composer: React.ReactNode;
  onAddRef?: () => void;
  onOpenSettings?: () => void;
  rooms?: RoomEntry[];
  activeRoomId?: string | null;
  onSelectRoom?: (roomId: string) => void;
  onNewRoom?: () => void;
}

export const AppShell: React.FC<AppShellProps> = ({
  workspaceName,
  onOpenWorkspace,
  contextGraph,
  main,
  inspector,
  composer,
  onAddRef,
  onOpenSettings,
  rooms = [],
  activeRoomId,
  onSelectRoom,
  onNewRoom,
}) => {
  const { t } = useI18n();
  const { colors } = useTheme();
  const styles = createStyles(colors);
  return (
    <div style={styles.root}>
      <TitleBar workspaceName={workspaceName} onOpenWorkspace={onOpenWorkspace} onOpenSettings={onOpenSettings} />
      <div style={styles.body}>
        <div style={styles.left}>
          <RoomList rooms={rooms} activeRoomId={activeRoomId} onSelect={onSelectRoom} onNew={onNewRoom} t={t} colors={colors} />
          {contextGraph}
        </div>
        <div style={styles.center}>
          <div style={styles.chat}>
            <div style={styles.chatHeader}>
              <span style={styles.chatTitle}>{t.councilRoom}</span>
              {onAddRef && (
                <button style={styles.addRefBtn} onClick={onAddRef}>
                  {t.addReference}
                </button>
              )}
            </div>
            {main}
          </div>
          {composer}
        </div>
        <div style={styles.right}>{inspector}</div>
      </div>
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
  const styles = createStyles(colors);
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

const createStyles = (colors: ColorPalette): Record<string, React.CSSProperties> => ({
  root: {
    display: "flex",
    flexDirection: "column",
    height: "100vh",
    overflow: "hidden",
  },
  body: {
    flex: 1,
    display: "flex",
    overflow: "hidden",
  },
  left: {
    width: sizes.contextGraph,
    flexShrink: 0,
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
  },
  roomList: {
    display: "flex",
    flexDirection: "column",
    borderBottom: `1px solid ${colors.border}`,
    maxHeight: 200,
  },
  roomListHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "8px 12px",
  },
  roomListTitle: {
    fontSize: 10,
    fontWeight: 600,
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  newRoomBtn: {
    background: "none",
    border: `1px solid ${colors.border}`,
    borderRadius: 4,
    width: 20,
    height: 20,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: colors.accent,
    fontSize: 14,
    cursor: "pointer",
    lineHeight: 1,
  },
  roomListItems: {
    flex: 1,
    overflowY: "auto",
    padding: "0 8px 8px",
  },
  roomEmpty: {
    fontSize: 11,
    color: colors.textMuted,
    padding: "4px 4px",
  },
  roomItem: {
    display: "block",
    width: "100%",
    textAlign: "left",
    background: "none",
    border: "none",
    borderRadius: 4,
    padding: "5px 8px",
    fontSize: 11,
    color: colors.text,
    cursor: "pointer",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap" as const,
  },
  roomItemActive: {
    background: "rgba(255,255,255,0.06)",
    color: colors.accent,
  },
  center: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
  },
  chat: {
    flex: 1,
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
  },
  chatHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "8px 16px",
    borderBottom: `1px solid ${colors.border}`,
  },
  chatTitle: {
    fontSize: 11,
    fontWeight: 600,
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  addRefBtn: {
    background: "none",
    border: `1px solid ${colors.border}`,
    borderRadius: 4,
    padding: "2px 8px",
    color: colors.accent,
    fontSize: 11,
    cursor: "pointer",
  },
  right: {
    width: sizes.inspector,
    flexShrink: 0,
    overflow: "hidden",
  },
});
