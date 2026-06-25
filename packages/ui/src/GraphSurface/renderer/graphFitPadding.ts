export interface GraphFitPadding {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export function computeGraphFitPadding(viewportW: number, viewportH: number): GraphFitPadding {
  return {
    top: Math.min(56, Math.max(40, viewportH * 0.07)),
    right: Math.min(180, viewportW * 0.09),
    bottom: Math.min(140, viewportH * 0.16),
    left: 48,
  };
}
