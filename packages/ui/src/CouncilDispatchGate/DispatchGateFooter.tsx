import React from "react";
import { useTheme } from "../theme/ThemeContext.js";
import {
  footerStyle,
  footerCountStyle,
  footerActionsStyle,
  cancelBtnStyle,
  continueBtnStyle,
} from "./styles.js";

export interface DispatchGateFooterProps {
  selectedCount: number;
  onCancel: () => void;
  onContinue: () => void;
}

export const DispatchGateFooter: React.FC<DispatchGateFooterProps> = ({
  selectedCount,
  onCancel,
  onContinue,
}) => {
  const { colors } = useTheme();
  const canContinue = selectedCount > 0;

  return (
    <div style={footerStyle(colors)}>
      <div style={footerCountStyle(colors)}>
        {selectedCount > 0 ? `已选择 ${selectedCount} 人` : "请选择参与者"}
      </div>
      <div style={footerActionsStyle}>
        <button type="button" style={cancelBtnStyle(colors)} onClick={onCancel}>
          取消
        </button>
        <button
          type="button"
          style={continueBtnStyle(colors, canContinue)}
          onClick={canContinue ? onContinue : undefined}
          disabled={!canContinue}
        >
          继续{selectedCount > 0 ? ` · ${selectedCount}` : ""}
        </button>
      </div>
    </div>
  );
};
