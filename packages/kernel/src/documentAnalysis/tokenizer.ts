/**
 * Tokenizer — 统一分词，支持中英文混合
 *
 * 规则：
 * - 英文: lowercase, 按非单词边界分割
 * - 数字: 保留
 * - CJK: 连续字符生成 2-gram
 * - 去除标点
 */

// CJK Unified Ideographs range
const CJK_START = 0x4e00;
const CJK_END = 0x9fff;

function isCJK(char: string): boolean {
  const code = char.charCodeAt(0);
  return code >= CJK_START && code <= CJK_END;
}

function isAlphaNum(char: string): boolean {
  return /[a-z0-9]/i.test(char);
}

/**
 * 将文本分词为 token 数组
 */
export function tokenize(text: string): string[] {
  if (!text) return [];

  const lower = text.toLowerCase();
  const tokens: string[] = [];
  let i = 0;

  while (i < lower.length) {
    const char = lower[i];

    // Skip whitespace and punctuation
    if (/\s/.test(char) || /[^\w\u4e00-\u9fff]/.test(char)) {
      i++;
      continue;
    }

    // CJK character → 2-gram
    if (isCJK(char)) {
      let j = i;
      while (j < lower.length && isCJK(lower[j])) {
        j++;
      }
      const cjkSegment = lower.slice(i, j);
      if (cjkSegment.length === 1) {
        tokens.push(cjkSegment);
      } else {
        for (let k = 0; k < cjkSegment.length - 1; k++) {
          tokens.push(cjkSegment.slice(k, k + 2));
        }
      }
      i = j;
      continue;
    }

    // Alphanumeric sequence
    if (isAlphaNum(char)) {
      let j = i;
      while (j < lower.length && (isAlphaNum(lower[j]) || lower[j] === '-' || lower[j] === '_')) {
        j++;
      }
      // Split by hyphen/underscore
      const segment = lower.slice(i, j);
      const parts = segment.split(/[-_]/).filter(Boolean);
      tokens.push(...parts);
      i = j;
      continue;
    }

    i++;
  }

  return tokens;
}

/**
 * 将查询分词，保留短语匹配能力
 */
export function tokenizeQuery(query: string): string[] {
  if (!query) return [];

  const lower = query.toLowerCase().trim();

  // Extract quoted phrases
  const phrases: string[] = [];
  const withoutQuotes = lower.replace(/"([^"]+)"/g, (_, phrase) => {
    phrases.push(phrase);
    return "";
  });

  // Tokenize remaining
  const tokens = tokenize(withoutQuotes);

  // Add phrases as single tokens
  for (const phrase of phrases) {
    if (phrase.trim()) {
      tokens.push(phrase.trim());
    }
  }

  return tokens;
}
