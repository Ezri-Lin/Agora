import type { PersonaContract } from "../personaContractTypes.js";
import { COUNCIL_MODERATOR } from "./moderator.js";
import { SYSTEMS_ARCHITECT_CONTRACT } from "./systemsArchitect.js";
import { PRODUCT_STRATEGIST_CONTRACT } from "./productStrategist.js";
import { UX_RESEARCHER_CONTRACT } from "./uxResearcher.js";
import { SKEPTIC_CRITIC_CONTRACT } from "./skepticCritic.js";
import { IMPLEMENTATION_REVIEWER_CONTRACT } from "./implementationReviewer.js";
import { EVIDENCE_REVIEWER_CONTRACT } from "./evidenceReviewer.js";
import { DECISION_SCRIBE_CONTRACT } from "./decisionScribe.js";
import { INTERACTION_DESIGNER_CONTRACT } from "./interactionDesigner.js";
import { RESEARCH_LIBRARIAN_CONTRACT } from "./researchLibrarian.js";
import { WRITING_EDITOR_CONTRACT } from "./writingEditor.js";
import { KNOWLEDGE_SYNTHESIZER_CONTRACT } from "./knowledgeSynthesizer.js";
import { SIGNAL_ANALYST_CONTRACT } from "./signalAnalyst.js";
import { RISK_SECOND_ORDER_ANALYST_CONTRACT } from "./riskSecondOrderAnalyst.js";

/** All seed PersonaContracts. */
export const SEED_PERSONA_CONTRACTS: PersonaContract[] = [
  COUNCIL_MODERATOR,
  SKEPTIC_CRITIC_CONTRACT,
  EVIDENCE_REVIEWER_CONTRACT,
  DECISION_SCRIBE_CONTRACT,
  PRODUCT_STRATEGIST_CONTRACT,
  UX_RESEARCHER_CONTRACT,
  INTERACTION_DESIGNER_CONTRACT,
  SYSTEMS_ARCHITECT_CONTRACT,
  IMPLEMENTATION_REVIEWER_CONTRACT,
  RESEARCH_LIBRARIAN_CONTRACT,
  WRITING_EDITOR_CONTRACT,
  KNOWLEDGE_SYNTHESIZER_CONTRACT,
  SIGNAL_ANALYST_CONTRACT,
  RISK_SECOND_ORDER_ANALYST_CONTRACT,
];
