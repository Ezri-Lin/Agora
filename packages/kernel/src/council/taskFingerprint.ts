/**
 * TaskFingerprint — minimal task identity for cooldown policy.
 *
 * MVP: exact match only. No semantic similarity.
 */

import type { TaskFrame } from "@agora/shared";

/**
 * Build a stable fingerprint from a TaskFrame.
 * Used for cooldown policy: same task thread → suppress repeated invite.
 */
export function buildTaskFingerprint(taskFrame: TaskFrame): string {
  const parts = [
    taskFrame.taskType,
    normalizeText(taskFrame.problemStatement),
    taskFrame.selectedDocs.map((d) => d.docId).sort().join(","),
  ];
  return parts.join("|");
}

/**
 * Check if two task fingerprints represent the same task thread.
 * MVP: exact match only.
 */
export function isSameTaskThread(
  previousFingerprint: string | undefined,
  currentFingerprint: string,
): boolean {
  if (!previousFingerprint) return false;
  return previousFingerprint === currentFingerprint;
}

function normalizeText(text: string): string {
  return text.trim().toLowerCase().slice(0, 100);
}
