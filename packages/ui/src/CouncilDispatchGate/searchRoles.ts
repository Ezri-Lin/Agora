/**
 * Pure search function for role filtering.
 * Matches against name, subtitle, domainLabel, domainId, familyLabel,
 * familyId, tags, aliases, reason. Case-insensitive, supports Chinese.
 * Multi-word queries use OR logic (any word matches → include).
 * Empty query returns all roles in original order.
 */

import type { RoleViewModel } from "./CouncilDispatchGate.js";

const SEARCHABLE_FIELDS: (keyof RoleViewModel)[] = [
  "name",
  "subtitle",
  "domainLabel",
  "domainId",
  "familyLabel",
  "familyId",
  "reason",
];

export function searchRoles(
  roles: RoleViewModel[],
  query: string,
): RoleViewModel[] {
  const trimmed = query.trim();
  if (!trimmed) return roles;

  const words = trimmed.toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length === 0) return roles;

  return roles.filter((role) => {
    // Check simple string fields
    for (const field of SEARCHABLE_FIELDS) {
      const val = role[field];
      if (typeof val === "string") {
        const lower = val.toLowerCase();
        if (words.some((w) => lower.includes(w))) return true;
      }
    }

    // Check tags array
    if (role.tags) {
      for (const tag of role.tags) {
        const lower = tag.toLowerCase();
        if (words.some((w) => lower.includes(w))) return true;
      }
    }

    // Check aliases array
    if (role.aliases) {
      for (const alias of role.aliases) {
        const lower = alias.toLowerCase();
        if (words.some((w) => lower.includes(w))) return true;
      }
    }

    return false;
  });
}
