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
import { EVIDENCE_REVIEWER } from "./cards/evidenceReviewer.js";
import { DECISION_SCRIBE } from "./cards/decisionScribe.js";
import { INTERACTION_DESIGNER } from "./cards/interactionDesigner.js";
import { IMPLEMENTATION_REVIEWER } from "./cards/implementationReviewer.js";
import { RESEARCH_LIBRARIAN } from "./cards/researchLibrarian.js";
import { WRITING_EDITOR } from "./cards/writingEditor.js";
import { KNOWLEDGE_SYNTHESIZER } from "./cards/knowledgeSynthesizer.js";
import { SIGNAL_ANALYST } from "./cards/signalAnalyst.js";
import { RISK_SECOND_ORDER_ANALYST } from "./cards/riskSecondOrderAnalyst.js";

export { BUILT_IN_DOMAINS } from "./domains.js";
export { BUILT_IN_FAMILIES } from "./families.js";
export { BUILT_IN_PERSONAS } from "./personas.js";

export const DEFAULT_ROLES: RoleCard[] = [
  // Layer 1: Core Roles
  MODERATOR,
  SKEPTIC_CRITIC,
  EVIDENCE_REVIEWER,
  DECISION_SCRIBE,
  // Layer 2: Product & Design
  PRODUCT_STRATEGIST,
  UX_RESEARCH_LENS,
  INTERACTION_DESIGNER,
  SYSTEMS_ARCHITECT,
  IMPLEMENTATION_REVIEWER,
  // Layer 3: Knowledge & Research
  RESEARCH_LIBRARIAN,
  WRITING_EDITOR,
  KNOWLEDGE_SYNTHESIZER,
  // Layer 4: Analysis (Argus / External)
  SIGNAL_ANALYST,
  RISK_SECOND_ORDER_ANALYST,
  // Layer 5: Legacy Lenses (existing, pre-contract)
  HISTORIAN,
  JOBS_PRODUCT_TASTE_LENS,
  BUFFETT_BUSINESS_LENS,
  MUNGER_MENTAL_MODELS_LENS,
  GROWTH_MARKETER_LENS,
  ETHICS_LENS,
  LEGAL_LENS,
  NARRATIVE_LENS,
  ECONOMICS_LENS,
  SECURITY_LENS,
  SCIENCE_LENS,
  PSYCHOLOGY_LENS,
];
