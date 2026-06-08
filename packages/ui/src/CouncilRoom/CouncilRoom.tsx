import React from "react";
import type { CouncilMessage } from "@agora/shared";
import { RoleMessage } from "../RoleMessage/RoleMessage.js";
import { useI18n } from "../i18n/I18nContext.js";
import { useTheme } from "../theme/ThemeContext.js";
import type { ColorPalette } from "../theme/palettes.js";

interface CouncilRoomProps {
  messages: CouncilMessage[];
  isLoading: boolean;
  loadingStatus?: string;
  onStop?: () => void;
  streamingRoleId?: string | null;
}

export const CouncilRoom: React.FC<CouncilRoomProps> = ({ messages, isLoading, loadingStatus, onStop, streamingRoleId }) => {
  const { t } = useI18n();
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const endRef = React.useRef<HTMLDivElement>(null);
  const contentLenRef = React.useRef(0);

  React.useEffect(() => {
    const totalLen = messages.reduce((sum, m) => sum + m.content.length, 0);
    if (totalLen !== contentLenRef.current || messages.length !== contentLenRef.current) {
      contentLenRef.current = totalLen;
      endRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  return (
    <div style={styles.container}>
      <div style={styles.messages}>
        {messages.length === 0 && !isLoading && (
          <div style={styles.empty}>
            {t.sendToStart}
          </div>
        )}
        {messages.map((msg) => (
          <RoleMessage key={msg.id} message={msg} streaming={streamingRoleId === msg.senderId && msg.content.length < 10} />
        ))}
        {isLoading && (
          <div style={styles.loadingRow}>
            <span style={styles.loadingText}>
              {loadingStatus || t.rolesAreThinking}
            </span>
            {onStop && (
              <button style={styles.stopBtn} onClick={onStop}>{t.stop}</button>
            )}
          </div>
        )}
        <div ref={endRef} />
      </div>
    </div>
  );
};

const createStyles = (colors: ColorPalette): Record<string, React.CSSProperties> => ({
  container: {
    display: "flex",
    flexDirection: "column",
    height: "100%",
    background: colors.bg,
  },
  messages: {
    flex: 1,
    overflowY: "auto",
    padding: "8px 16px",
  },
  empty: {
    color: colors.textMuted,
    fontSize: 13,
    textAlign: "center",
    padding: 40,
  },
  loadingRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    padding: 12,
  },
  loadingText: {
    color: colors.accent,
    fontSize: 12,
    fontStyle: "italic",
  },
  stopBtn: {
    background: colors.dangerBg,
    border: `1px solid ${colors.dangerBorder}`,
    borderRadius: 4,
    padding: "2px 10px",
    fontSize: 11,
    color: colors.danger,
    cursor: "pointer",
  },
});
