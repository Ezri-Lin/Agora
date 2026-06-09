import type { RoleCard } from "@agora/shared";
import { MODERATOR } from "./cards/moderator.js";
import { SKEPTIC_CRITIC } from "./cards/skepticCritic.js";
import { HISTORIAN } from "./cards/historian.js";
import { PRODUCT_STRATEGIST } from "./cards/productStrategist.js";
import { JOBS_PRODUCT_TASTE_LENS } from "./cards/jobsProductTasteLens.js";
import { BUFFETT_BUSINESS_LENS } from "./cards/buffettBusinessLens.js";
import { MUNGER_MENTAL_MODELS_LENS } from "./cards/mungerMentalModelsLens.js";
import { GROWTH_MARKETER_LENS } from "./cards/growthMarketerLens.js";
import { SYSTEMS_ARCHITECT } from "./cards/systemsArchitect.js";
import { ETHICS_LENS } from "./cards/ethicsLens.js";
import { UX_RESEARCH_LENS } from "./cards/uxResearchLens.js";
import { LEGAL_LENS } from "./cards/legalLens.js";
import { NARRATIVE_LENS } from "./cards/narrativeLens.js";
import { ECONOMICS_LENS } from "./cards/economicsLens.js";
import { SECURITY_LENS } from "./cards/securityLens.js";
import { SCIENCE_LENS } from "./cards/scienceLens.js";
import { PSYCHOLOGY_LENS } from "./cards/psychologyLens.js";

export { BUILT_IN_DOMAINS } from "./domains.js";
export { BUILT_IN_FAMILIES } from "./families.js";
export { BUILT_IN_PERSONAS } from "./personas.js";

export const DEFAULT_ROLES: RoleCard[] = [
  // Layer 1: Core Roles
  MODERATOR,
  SKEPTIC_CRITIC,
  HISTORIAN,
  PRODUCT_STRATEGIST,
  SYSTEMS_ARCHITECT,
  // Layer 2: Persona Seed Pack
  JOBS_PRODUCT_TASTE_LENS,
  BUFFETT_BUSINESS_LENS,
  MUNGER_MENTAL_MODELS_LENS,
  GROWTH_MARKETER_LENS,
  // Layer 2b: Domain Lenses
  ETHICS_LENS,
  UX_RESEARCH_LENS,
  LEGAL_LENS,
  NARRATIVE_LENS,
  ECONOMICS_LENS,
  SECURITY_LENS,
  SCIENCE_LENS,
  PSYCHOLOGY_LENS,
];
