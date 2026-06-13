import React from "react";

export type SpiralLoaderProps = {
  size?: number;
  className?: string;
  style?: React.CSSProperties;
};

export const SpiralLoader = React.memo(function SpiralLoader({
  size = 16,
  className,
  style,
}: SpiralLoaderProps) {
  return (
    <svg
      className={`ag-spin ${className ?? ""}`}
      style={{ width: size, height: size, flexShrink: 0, ...style }}
      viewBox="0 0 16 16"
      fill="none"
    >
      <circle
        cx="8"
        cy="8"
        r="6"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeDasharray="28"
        strokeDashoffset="7"
        strokeLinecap="round"
      />
    </svg>
  );
});
