/**
 * CitationPolicy — 验证 claim-source binding
 *
 * Hard gates:
 * - EvidenceClaim MUST have sourceItemIds
 * - sourceItemIds MUST point to existing EvidenceItem
 * - Unsupported claims MUST be rejected
 * - Claim source binding rate must be 100%
 */

import type {
  EvidenceItem,
  EvidenceClaim,
} from "./EvidenceSearchTypes.js";

// === CitationPolicy ===

export class CitationPolicy {
  /**
   * 验证 claims 的 source binding
   * 返回有效的 claims（过滤掉无效的）
   */
  validate(
    claims: EvidenceClaim[],
    items: EvidenceItem[]
  ): EvidenceClaim[] {
    const validClaims: EvidenceClaim[] = [];
    const itemIds = new Set(items.map((item) => item.id));

    for (const claim of claims) {
      if (this.isValidClaim(claim, itemIds)) {
        validClaims.push(claim);
      }
    }

    return validClaims;
  }

  /**
   * 检查 claim 是否有效
   */
  isValidClaim(
    claim: EvidenceClaim,
    itemIds?: Set<string>
  ): boolean {
    // MUST have sourceItemIds
    if (!claim.sourceItemIds || claim.sourceItemIds.length === 0) {
      return false;
    }

    // If itemIds provided, check that all sourceItemIds exist
    if (itemIds) {
      for (const sourceId of claim.sourceItemIds) {
        if (!itemIds.has(sourceId)) {
          return false;
        }
      }
    }

    // MUST have non-empty claim text
    if (!claim.claim || claim.claim.trim().length === 0) {
      return false;
    }

    return true;
  }

  /**
   * 计算 source binding rate
   */
  calculateBindingRate(
    claims: EvidenceClaim[],
    items: EvidenceItem[]
  ): number {
    if (claims.length === 0) return 1.0; // No claims = 100% binding

    const itemIds = new Set(items.map((item) => item.id));
    let validCount = 0;

    for (const claim of claims) {
      if (this.isValidClaim(claim, itemIds)) {
        validCount++;
      }
    }

    return validCount / claims.length;
  }
}
