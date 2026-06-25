/**
 * LabelVisibilityPolicy — zoom-aware label LOD with smoothstep fade.
 * Labels fade in/out based on camera scale, node importance, and selection state.
 */

export interface LabelVisibilityInput {
  cameraScale: number;
  nodeWeight: number;
  isHovered: boolean;
  isSelected: boolean;
  isNeighbor: boolean;
  isWorkspaceRoot?: boolean;
}

export interface LabelVisibility {
  visible: boolean;
  targetAlpha: number;
  fontSize: number;
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

export function getLabelVisibility(input: LabelVisibilityInput): LabelVisibility {
  // Hovered or selected: always visible, full alpha
  if (input.isHovered || input.isSelected) {
    return { visible: true, targetAlpha: 1, fontSize: 12 };
  }

  // Workspace root: visible earlier than normal nodes
  if (input.isWorkspaceRoot) {
    const alpha = smoothstep(1.4, 2.1, input.cameraScale);
    return { visible: alpha > 0.05, targetAlpha: alpha, fontSize: 11 };
  }

  const textFadeMultiplier = 2.25;
  const alpha = Math.max(0, Math.min(1, Math.log2(input.cameraScale) + 1 - textFadeMultiplier));

  return {
    visible: alpha > 0.05,
    targetAlpha: alpha,
    fontSize: 10,
  };
}

/** Priority for budget ordering. Higher = more important. */
export function getLabelPriority(input: LabelVisibilityInput): number {
  if (input.isSelected) return 100;
  if (input.isHovered) return 90;
  if (input.isWorkspaceRoot) return 80;
  if (input.isNeighbor) return 50;
  return Math.min((input.nodeWeight ?? 0) * 5, 40);
}
