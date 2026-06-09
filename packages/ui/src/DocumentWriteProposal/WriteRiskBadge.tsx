import React from "react";
import { riskBadgeStyle, getRiskLabel } from "./styles.js";

interface WriteRiskBadgeProps {
  riskLevel: string;
}

export const WriteRiskBadge: React.FC<WriteRiskBadgeProps> = ({ riskLevel }) => (
  <span style={riskBadgeStyle(riskLevel)}>{getRiskLabel(riskLevel)}</span>
);
