/**
 * DocumentWriteVerifier — verify post-write document integrity.
 *
 * PR-11: MVP checks for content presence, JSON validity.
 */

import type { DocumentPatch } from "./types.js";

export interface DocumentWriteVerification {
  parseSucceeded: boolean;
  targetSectionFound: boolean;
  diffMatchesPlan: boolean;
  brokenLinks: string[];
  warnings: string[];
}

/**
 * Verify that the final content matches the intended patch.
 *
 * MVP checks:
 * - parseSucceeded: content is valid for its kind (json parse, etc.)
 * - targetSectionFound: newText is present in final content
 * - diffMatchesPlan: final content is not empty when it shouldn't be
 * - brokenLinks: empty for MVP
 */
export function verifyDocumentWrite(args: {
  patch: DocumentPatch;
  finalContent: string;
  finalHash: string;
}): DocumentWriteVerification {
  const { patch, finalContent } = args;
  const warnings: string[] = [];

  // 1. Parse check
  const parseSucceeded = checkParse(finalContent, patch.targetPath, warnings);

  // 2. Target section found: newText present in final
  const trimmedNew = patch.newText.trim();
  const targetSectionFound = trimmedNew.length === 0 || finalContent.includes(trimmedNew);

  // 3. Diff matches plan: final content not empty for modes that require content
  let diffMatchesPlan = true;
  if (patch.mode !== "delete_section" && finalContent.trim().length === 0) {
    diffMatchesPlan = false;
    warnings.push("Final content is empty but mode is " + patch.mode);
  }

  if (!targetSectionFound) {
    warnings.push("Expected new text not found in final content");
  }

  return {
    parseSucceeded,
    targetSectionFound,
    diffMatchesPlan,
    brokenLinks: [],
    warnings,
  };
}

function checkParse(content: string, path: string, warnings: string[]): boolean {
  const ext = path.split(".").pop()?.toLowerCase();

  if (ext === "json") {
    try {
      JSON.parse(content);
      return true;
    } catch {
      warnings.push("Invalid JSON after write");
      return false;
    }
  }

  // markdown / text / yaml / code: always succeeds for MVP
  return true;
}
