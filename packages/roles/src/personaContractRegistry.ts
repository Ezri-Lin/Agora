import type { PersonaContract } from "./personaContractTypes.js";
import { SEED_PERSONA_CONTRACTS } from "./personaContracts/index.js";

/**
 * Registry of all known PersonaContracts.
 * Seed personas are loaded from personaContracts/.
 * Extended personas will be added incrementally.
 */
export const PERSONA_CONTRACTS: PersonaContract[] = [...SEED_PERSONA_CONTRACTS];

/** Look up a PersonaContract by persona ID. Returns undefined if not found. */
export function getPersonaContract(id: string): PersonaContract | undefined {
  return PERSONA_CONTRACTS.find((c) => c.id === id);
}

/** Check whether a PersonaContract exists for the given ID. */
export function hasPersonaContract(id: string): boolean {
  return getPersonaContract(id) !== undefined;
}

/**
 * Resolve the domain for a roleId, checking PersonaContract first,
 * then falling back to a static map (for backward compatibility).
 *
 * This function is the bridge between the new contract layer
 * and the existing ROLE_DOMAIN_MAP in the UI theme.
 */
export function resolveRoleDomain(
  roleId: string,
  fallbackDomainMap?: Record<string, string>,
): string | undefined {
  const contract = getPersonaContract(roleId);
  if (contract) return contract.domainId;
  return fallbackDomainMap?.[roleId];
}
