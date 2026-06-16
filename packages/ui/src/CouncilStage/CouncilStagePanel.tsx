import React from "react";
import type { CouncilStageView } from "../AppShell/AppShell.types.js";
import { StageViewToggle } from "./StageViewToggle.js";
import { MeetingStageView } from "./MeetingStageView.js";
import { useTheme } from "../theme/ThemeContext.js";
import { useI18n } from "../i18n/I18nContext.js";

interface RoleCard {
  id: string;
  name: string;
  shortName?: string;
  label?: string;
  avatar?: string;
}

interface CouncilMessage {
  id: string;
  senderId: string;
  senderType: string;
  content: string;
  timestamp?: string;
}

interface RoomEntry {
  id: string;
  title: string;
}

interface CouncilStagePanelProps {
  stageView: CouncilStageView;
  onStageViewChange: (view: CouncilStageView) => void;
  roles: RoleCard[];
  messages: CouncilMessage[];
  focusedRoleId?: string | null;
  onRoleFocus?: (roleId: string | null) => void;
  activeRoomId?: string | null;
  rooms?: RoomEntry[];
  pausedRoleIds?: string[];
  removedRoleIds?: string[];
  excludedRoleIds?: string[];
  onTogglePause?: (roleId: string) => void;
  onToggleRemove?: (roleId: string) => void;
  onAddExcluded?: (roleId: string) => void;
}

export const CouncilStagePanel: React.FC<CouncilStagePanelProps> = ({
  stageView,
  onStageViewChange,
  roles,
  messages,
  focusedRoleId,
  onRoleFocus,
  activeRoomId,
  rooms,
  pausedRoleIds,
  removedRoleIds,
  excludedRoleIds,
  onTogglePause,
  onToggleRemove,
  onAddExcluded,
}) => {
  const { agoraColors: colors } = useTheme();
  const { t } = useI18n();
  const room = rooms?.find(r => r.id === activeRoomId);
  const userMessages = messages.filter(m => m.senderType === "user");
  const lastUserMsg = userMessages[userMessages.length - 1];

  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      height: "100%",
      background: colors.bgPanel,
      borderRight: `1px solid ${colors.borderDefault}`,
    }}>
      {/* Header */}
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "10px 14px",
        borderBottom: `1px solid ${colors.borderDefault}`,
        flexShrink: 0,
      }}>
        <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: "0.04em", color: colors.textPrimary }}>
          {t.stagePanel}
        </div>
        <StageViewToggle active={stageView} onChange={onStageViewChange} />
      </div>

      {/* Content */}
      <div style={{ flex: 1, minHeight: 0, overflow: "hidden" }}>
        <style>{`@keyframes stage-spin { to { transform: rotate(360deg); } }`}</style>
        {stageView === "meeting" ? (
          <MeetingStageView
            roles={roles}
            messages={messages}
            focusedRoleId={focusedRoleId}
            onRoleFocus={onRoleFocus}
            lastUserMessage={lastUserMsg?.content}
            pausedRoleIds={pausedRoleIds}
            removedRoleIds={removedRoleIds}
            excludedRoleIds={excludedRoleIds}
            onTogglePause={onTogglePause}
            onToggleRemove={onToggleRemove}
            onAddExcluded={onAddExcluded}
          />
        ) : (
          <RoomGraphPlaceholder />
        )}
      </div>
    </div>
  );
};

const RoomGraphPlaceholder: React.FC = () => {
  const { agoraColors: colors } = useTheme();
  const { t } = useI18n();
  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      height: "100%",
      color: colors.textMuted,
      fontSize: 13,
      flexDirection: "column",
      gap: 8,
    }}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ width: 32, height: 32, opacity: 0.4 }}>
        <circle cx="6" cy="12" r="2.5" />
        <circle cx="17" cy="7" r="2.5" />
        <circle cx="17" cy="17" r="2.5" />
        <path d="M8.3 11l6.4-3M8.3 13l6.4 3" />
      </svg>
      <span style={{ opacity: 0.5 }}>{t.roomGraph}</span>
      <span style={{ fontSize: 11, opacity: 0.35 }}>{t.comingSoon}</span>
    </div>
  );
};
