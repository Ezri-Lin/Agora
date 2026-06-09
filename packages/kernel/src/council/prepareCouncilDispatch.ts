/**
 * prepareCouncilDispatch — prepare a dispatch preview before running a round.
 *
 * PR-14: Splits the "decide who participates" step from "run the round".
 * Uses deterministic moderator summary (no LLM).
 * Returns routing decision + default/alternative role IDs for UI confirmation.
 */

import type { RoleCard } from "@agora/shared";
import { normalizeCouncilRoleSettings, toRoleRoutingSettings, normalizeRoleRoutingSettings } from "@agora/shared";
import { routeRolesLocal } from "../routing/routeRoles.js";
import { retrieveAndCompileContext } from "../context/retrieveAndCompileContext.js";
import type { PrepareCouncilDispatchInput, CouncilDispatchPreview } from "./dispatchTypes.js";

const DEFAULT_SELECTED_LIMIT = 5;
const DEFAULT_ALTERNATIVE_LIMIT = 10;

/**
 * Prepare a dispatch preview: resolve context, route roles, build summary.
 *
 * Does NOT call LLM. Moderator summary is deterministic.
 * Does NOT run the round — call `runCouncilRound` with the confirmed role IDs.
 */
export async function prepareCouncilDispatch(
  input: PrepareCouncilDispatchInput,
): Promise<CouncilDispatchPreview> {
  const {
    room, topic, userMessage, availableRoles,
    recentMessages = [], docContents,
    retrievalEngine, retrievalQuery,
    contextPackage: explicitContextPackage,
    sessionRunningBrief,
    roleSettings, routingSettings: routingOverrides, explicitRoleRequests,
  } = input;

  // 1. Resolve context package (same logic as CouncilRunner)
  let contextPackage = explicitContextPackage;
  if (!contextPackage && retrievalEngine) {
    contextPackage = await retrieveAndCompileContext({
      task: topic,
      query: retrievalQuery ?? topic,
      retrievalEngine,
      mode: "synthesize",
      limit: 6,
    }) ?? undefined;
  }

  // 2. Route roles
  const effectiveSettings = normalizeCouncilRoleSettings(roleSettings);
  const baseRoutingSettings = toRoleRoutingSettings(effectiveSettings);
  const routingSettings = routingOverrides
    ? normalizeRoleRoutingSettings({ ...baseRoutingSettings, ...routingOverrides })
    : baseRoutingSettings;

  const routingDecision = routeRolesLocal(
    availableRoles,
    topic,
    routingSettings,
    {
      previousSpeakerIds: recentMessages
        .filter((m) => m.senderType === "role")
        .map((m) => m.senderId),
      existingActiveRoleIds: availableRoles.map((r) => r.id),
      explicitRoleRequests,
    },
  );

  // 3. Build default selected role IDs (from routing decision)
  const defaultSelectedRoleIds = routingDecision.activeEntrants
    .map((r) => r.roleId)
    .slice(0, DEFAULT_SELECTED_LIMIT);

  // 4. Build alternative role IDs
  const selectedSet = new Set(defaultSelectedRoleIds);
  const alternativeRoleIds: string[] = [];

  // From suggested perspectives
  for (const sp of routingDecision.suggestedPerspectives) {
    if (alternativeRoleIds.length >= DEFAULT_ALTERNATIVE_LIMIT) break;
    const id = sp.personaId ?? sp.familyId;
    if (id && !selectedSet.has(id)) {
      alternativeRoleIds.push(id);
      selectedSet.add(id);
    }
  }

  // Fill from available roles not yet selected
  for (const role of availableRoles) {
    if (alternativeRoleIds.length >= DEFAULT_ALTERNATIVE_LIMIT) break;
    if (!selectedSet.has(role.id)) {
      alternativeRoleIds.push(role.id);
      selectedSet.add(role.id);
    }
  }

  // 5. Deterministic moderator summary
  const excerpt = userMessage.content.length > 120
    ? userMessage.content.slice(0, 120) + "..."
    : userMessage.content;
  const moderatorSummary = buildDeterministicSummary(
    topic || excerpt,
    defaultSelectedRoleIds,
    availableRoles,
    sessionRunningBrief?.currentConsensus,
  );

  return {
    userMessageId: userMessage.id,
    topic,
    moderatorSummary,
    routingDecision,
    defaultSelectedRoleIds,
    alternativeRoleIds,
    contextPackage,
    sessionRunningBrief,
  };
}

function buildDeterministicSummary(
  topic: string,
  selectedIds: string[],
  availableRoles: RoleCard[],
  consensus?: string[],
): string {
  const roleNames = selectedIds
    .map((id) => availableRoles.find((r) => r.id === id)?.name ?? id)
    .join("、");

  let summary = `本轮议题：${topic}\n`;
  summary += `建议参与者：${roleNames || "（无）"}`;

  if (consensus && consensus.length > 0) {
    summary += `\n已有共识：${consensus[0]}`;
    if (consensus.length > 1) {
      summary += ` 等 ${consensus.length} 项`;
    }
  }

  summary += "\n你可以调整参与者后继续。";
  return summary;
}
