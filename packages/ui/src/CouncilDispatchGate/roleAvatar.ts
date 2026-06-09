/**
 * Deterministic avatar token for roles.
 * Same roleId + domainId always produces the same visual.
 * No image assets — uses gradient + symbol only.
 */

// ── Domain gradient pairs ────────────────────────────────────────

const DOMAIN_GRADIENTS: Record<string, [string, string][]> = {
  core: [
    ["#7c4dff", "#b388ff"],
    ["#ff5252", "#ff8a80"],
    ["#ffa726", "#ffcc80"],
  ],
  engineering: [
    ["#42a5f5", "#90caf9"],
    ["#26c6da", "#80deea"],
    ["#66bb6a", "#a5d6a7"],
  ],
  design: [
    ["#ec407a", "#f48fb1"],
    ["#ab47bc", "#ce93d8"],
    ["#26c6da", "#80deea"],
  ],
  product_strategy: [
    ["#66bb6a", "#a5d6a7"],
    ["#ff7043", "#ffab91"],
    ["#42a5f5", "#90caf9"],
  ],
  marketing: [
    ["#ffca28", "#fff176"],
    ["#ff7043", "#ffab91"],
    ["#66bb6a", "#a5d6a7"],
  ],
  legal_compliance: [
    ["#78909c", "#b0bec5"],
    ["#42a5f5", "#90caf9"],
    ["#ff5252", "#ff8a80"],
  ],
  security: [
    ["#ef5350", "#ef9a9a"],
    ["#ff5252", "#ff8a80"],
    ["#ffa726", "#ffcc80"],
  ],
  research_writing: [
    ["#8d6e63", "#bcaaa4"],
    ["#42a5f5", "#90caf9"],
    ["#66bb6a", "#a5d6a7"],
  ],
};

const DEFAULT_GRADIENTS: [string, string][] = [
  ["#42a5f5", "#90caf9"],
  ["#ab47bc", "#ce93d8"],
  ["#26c6da", "#80deea"],
  ["#ff7043", "#ffab91"],
  ["#66bb6a", "#a5d6a7"],
];

// ── Abstract symbols ─────────────────────────────────────────────

const SYMBOLS = [
  "\u25B2", // ▲
  "\u25C6", // ◆
  "\u25CF", // ●
  "\u2605", // ★
  "\u2B23", // ⬣
  "\u29BF", // ⦿
  "\u2726", // ✦
  "\u2736", // ✶
  "\u273B", // ✻
  "\u2741", // ✁
  "\u2756", // ❖
  "\u29D6", // ⧖
];

// ── Hash helper ──────────────────────────────────────────────────

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return h;
}

// ── Domain label map ─────────────────────────────────────────────

const DOMAIN_LABELS: Record<string, string> = {
  core: "核心",
  engineering: "工程",
  design: "设计",
  product_strategy: "产品",
  marketing: "营销",
  legal_compliance: "法务",
  security: "安全",
  research_writing: "研究",
};

// ── Public API ───────────────────────────────────────────────────

export interface RoleAvatarToken {
  /** CSS gradient string, e.g. "linear-gradient(135deg, #7c4dff, #b388ff)" */
  gradient: string;
  /** Single Unicode symbol for the avatar center */
  symbol: string;
  /** Short label for accessibility */
  label: string;
}

export function getRoleAvatarToken(args: {
  roleId: string;
  domainId?: string;
}): RoleAvatarToken {
  const { roleId, domainId } = args;
  const h = hash(roleId);

  // Pick gradient from domain pool
  const pool = domainId ? (DOMAIN_GRADIENTS[domainId] ?? DEFAULT_GRADIENTS) : DEFAULT_GRADIENTS;
  const [c1, c2] = pool[((h >>> 0) % pool.length)];
  const gradient = `linear-gradient(135deg, ${c1}, ${c2})`;

  // Pick symbol
  const symbol = SYMBOLS[((h >>> 8) % SYMBOLS.length)];

  // Domain label for a11y
  const domainLabel = domainId ? (DOMAIN_LABELS[domainId] ?? domainId) : "";

  return { gradient, symbol, label: domainLabel };
}

export function getDomainLabel(domainId?: string): string {
  if (!domainId) return "";
  return DOMAIN_LABELS[domainId] ?? domainId;
}
