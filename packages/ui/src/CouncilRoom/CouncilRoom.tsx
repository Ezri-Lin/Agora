import React from "react";
import type { CouncilMessage } from "@agora/shared";
import { RoleMessage } from "../RoleMessage/RoleMessage.js";
import { colors } from "../theme/tokens.js";
import { useI18n } from "../i18n/I18nContext.js";

interface CouncilRoomProps {
  messages: CouncilMessage[];
  isLoading: boolean;
  loadingStatus?: string;
  onStop?: () => void;
}

export const CouncilRoom: React.FC<CouncilRoomProps> = ({ messages, isLoading, loadingStatus, onStop }) => {
  const { t } = useI18n();
  const endRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  return (
    <div style={styles.container}>
      <div style={styles.messages}>
        {messages.length === 0 && !isLoading && (
          <div style={styles.empty}>
            {t.sendToStart}
          </div>
        )}
        {messages.map((msg) => (
          <RoleMessage key={msg.id} message={msg} />
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

const styles: Record<string, React.CSSProperties> = {
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
    background: "rgba(231,76,60,0.1)",
    border: "1px solid rgba(231,76,60,0.3)",
    borderRadius: 4,
    padding: "2px 10px",
    fontSize: 11,
    color: "#e74c3c",
    cursor: "pointer",
  },
};
