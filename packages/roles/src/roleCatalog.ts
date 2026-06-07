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
];
