/**
 * compressionPrompt — 压缩提示词
 */

export function buildCompressionPrompt(transcript: string): string {
  return `# System Role

You are Agora Context Compressor.

Your job is to compress a multi-role council transcript into ConversationSummaryV1.

# Task

Extract only information explicitly supported by the transcript.

# Hard Constraints

- MUST output valid JSON only.
- MUST match the ConversationSummaryV1 schema.
- MUST preserve accepted decisions.
- MUST preserve action items.
- MUST preserve blocking open questions.
- MUST preserve key insights.
- MUST preserve active role stances.
- MUST include sourceMessageIds for every extracted item.
- MUST NOT invent decisions, actions, claims, evidence refs, or role stances.
- MUST NOT write long-term memory.
- MUST NOT execute tools.
- If information is ambiguous, include it as an open question, not a decision.

# Compression Rules

Preserve:
- decisions
- action items
- unresolved questions
- key insights
- role stances
- evidence refs
- raw transcript refs

Compress:
- greetings
- repeated arguments
- off-topic discussion
- abandoned branches
- low-signal back-and-forth

# Output Schema

{
  "sessionId": "string",
  "compressedAt": "ISO date string",
  "summaryText": "string (2-3 sentences summarizing the discussion)",
  "decisions": [
    {
      "id": "string",
      "statement": "string",
      "rationale": "string (optional)",
      "decidedBy": "user | moderator | council",
      "status": "proposed | accepted | rejected | superseded",
      "sourceMessageIds": ["string"]
    }
  ],
  "actionItems": [
    {
      "id": "string",
      "text": "string",
      "owner": "string (optional)",
      "status": "open | in_progress | done | blocked",
      "sourceMessageIds": ["string"]
    }
  ],
  "openQuestions": [
    {
      "id": "string",
      "question": "string",
      "blocking": true | false,
      "sourceMessageIds": ["string"]
    }
  ],
  "keyInsights": [
    {
      "id": "string",
      "insight": "string",
      "confidence": "low | medium | high",
      "sourceMessageIds": ["string"]
    }
  ],
  "roleStances": [
    {
      "roleId": "string",
      "roleName": "string",
      "stance": "string",
      "confidence": "low | medium | high",
      "unresolvedConcerns": ["string"],
      "sourceMessageIds": ["string"]
    }
  ],
  "evidenceRefs": ["string (URLs)"],
  "rawTranscriptRefs": ["string (file names)"]
}

# Transcript

${transcript}

# Output

Return only JSON. No markdown, no explanation.`;
}

export function buildRepairPrompt(
  invalidJson: string,
  validationErrors: string[]
): string {
  return `# System Role

You are Agora Context Compressor Repair Agent.

# Task

The following JSON is invalid or does not match the ConversationSummaryV1 schema.
Fix the errors and return valid JSON.

# Validation Errors

${validationErrors.map((e, i) => `${i + 1}. ${e}`).join("\n")}

# Invalid JSON

${invalidJson}

# Output Schema

{
  "sessionId": "string",
  "compressedAt": "ISO date string",
  "summaryText": "string",
  "decisions": [...],
  "actionItems": [...],
  "openQuestions": [...],
  "keyInsights": [...],
  "roleStances": [...],
  "evidenceRefs": [...],
  "rawTranscriptRefs": [...]
}

# Output

Return only valid JSON. No markdown, no explanation.`;
}
