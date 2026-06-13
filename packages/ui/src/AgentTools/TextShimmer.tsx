import React from "react";

export type TextShimmerProps = {
  children: React.ReactNode;
  as?: React.ElementType;
  className?: string;
  duration?: number;
  spread?: number;
  delay?: number;
  style?: React.CSSProperties;
};

export const TextShimmer = React.memo(function TextShimmer({
  children,
  as: Component = "p",
  className,
  duration = 2,
  delay = 0,
  style,
}: TextShimmerProps) {
  const shimmerStyle = {
    "--ag-shimmer-duration": `${duration}s`,
    animationDelay: delay > 0 ? `${delay}s` : undefined,
    animationDuration: `${duration}s`,
    animationIterationCount: "infinite",
    animationTimingFunction: "linear",
    ...style,
  } as React.CSSProperties;

  return (
    <Component
      className={`ag-text-shimmer ag-text-shimmer--active ${className ?? ""}`}
      style={shimmerStyle}
    >
      {children}
    </Component>
  );
});
