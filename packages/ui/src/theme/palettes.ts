/**
 * Backward-compatible re-exports from tokens.ts.
 *
 * All color/palette logic now lives in tokens.ts.
 * This file exists so existing imports continue to work unchanged.
 * New code should import directly from tokens.ts.
 */
export {
  type ColorPalette,
  type AgoraColorPalette,
  darkColors,
  lightColors,
  agoraDarkColors,
  agoraLightColors,
  createAgoraPalette,
  getRoleColor,
  USER_COLOR,
} from "./tokens.js";
