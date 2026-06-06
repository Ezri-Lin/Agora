/**
 * Extract relevant excerpt from a document based on query keywords.
 * v1 strategy: headings + keyword-matched paragraphs + head portion.
 */

interface DocSection {
  heading: string;
  content: string;
  startOffset: number;
}

/** Split document into sections by headings */
function splitByHeadings(doc: string): DocSection[] {
  const sections: DocSection[] = [];
  const lines = doc.split("\n");
  let current: DocSection = { heading: "(top)", content: "", startOffset: 0 };
  let offset = 0;

  for (const line of lines) {
    if (/^#{1,3}\s+/.test(line)) {
      if (current.content.trim()) sections.push(current);
      current = { heading: line.replace(/^#+\s*/, ""), content: "", startOffset: offset };
    } else {
      current.content += line + "\n";
    }
    offset += line.length + 1;
  }
  if (current.content.trim()) sections.push(current);
  return sections;
}

/** Extract keywords from query (simple split, CJK-aware) */
function extractKeywords(query: string): string[] {
  // Split by whitespace and punctuation, filter short tokens
  return query
    .split(/[\s,，。、；：！？!?.\-\n]+/)
    .filter((w) => w.length >= 2)
    .slice(0, 10);
}

/** Score a section by keyword relevance */
function scoreSection(section: DocSection, keywords: string[]): number {
  const text = (section.heading + " " + section.content).toLowerCase();
  let score = 0;
  for (const kw of keywords) {
    if (text.includes(kw.toLowerCase())) score += 1;
  }
  // Headings get a bonus
  if (section.heading !== "(top)") score += 0.5;
  return score;
}

/**
 * Extract a relevant excerpt from a document.
 *
 * Strategy:
 * 1. Always include document title / first heading
 * 2. Include heading list (table of contents)
 * 3. Include keyword-matched sections
 * 4. Fill remaining budget with head portion
 */
export function extractRelevantExcerpt(
  doc: string,
  query: string,
  maxChars: number,
): { excerpt: string; wasTruncated: boolean; includedChars: number } {
  if (doc.length <= maxChars) {
    return { excerpt: doc, wasTruncated: false, includedChars: doc.length };
  }

  const sections = splitByHeadings(doc);
  const keywords = extractKeywords(query);
  const parts: string[] = [];
  let usedChars = 0;

  // Step 1: Title / first line
  const firstLine = doc.split("\n")[0] ?? "";
  if (firstLine.trim()) {
    parts.push(firstLine.trim());
    usedChars += firstLine.length;
  }

  // Step 2: Heading list (table of contents)
  const headings = sections
    .filter((s) => s.heading !== "(top)")
    .map((s) => `- ${s.heading}`)
    .join("\n");
  if (headings && usedChars + headings.length + 20 < maxChars) {
    parts.push("\n## Headings\n" + headings);
    usedChars += headings.length + 20;
  }

  // Step 3: Keyword-matched sections
  const scored = sections
    .map((s) => ({ section: s, score: scoreSection(s, keywords) }))
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score);

  for (const { section } of scored) {
    const sectionText = `\n## ${section.heading}\n${section.content.trim()}`;
    if (usedChars + sectionText.length > maxChars) {
      // Partial fit: take what we can
      const remaining = maxChars - usedChars;
      if (remaining > 100) {
        parts.push(sectionText.slice(0, remaining) + "\n...[truncated]");
        usedChars += remaining;
      }
      break;
    }
    parts.push(sectionText);
    usedChars += sectionText.length;
  }

  // Step 4: Fill with head portion if still have budget
  if (usedChars < maxChars * 0.7) {
    const headPortion = doc.slice(0, maxChars - usedChars);
    // Avoid duplicating what we already included
    if (!parts.some((p) => headPortion.startsWith(p.slice(0, 50)))) {
      parts.push("\n---\n" + headPortion);
      usedChars = maxChars;
    }
  }

  return {
    excerpt: parts.join("\n"),
    wasTruncated: true,
    includedChars: usedChars,
  };
}
