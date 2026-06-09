import type { PersonaContract } from "../personaContractTypes.js";
import { COUNCIL_MODERATOR } from "./moderator.js";
import { SYSTEMS_ARCHITECT_CONTRACT } from "./systemsArchitect.js";
import { PRODUCT_STRATEGIST_CONTRACT } from "./productStrategist.js";
import { UX_RESEARCHER_CONTRACT } from "./uxResearcher.js";
import { SKEPTIC_CRITIC_CONTRACT } from "./skepticCritic.js";
import { IMPLEMENTATION_REVIEWER_CONTRACT } from "./implementationReviewer.js";

/** All seed PersonaContracts. */
export const SEED_PERSONA_CONTRACTS: PersonaContract[] = [
  COUNCIL_MODERATOR,
  SYSTEMS_ARCHITECT_CONTRACT,
  PRODUCT_STRATEGIST_CONTRACT,
  UX_RESEARCHER_CONTRACT,
  SKEPTIC_CRITIC_CONTRACT,
  IMPLEMENTATION_REVIEWER_CONTRACT,
];
