import type { SearchPart } from '../types';

export function parseFilename(
  filename: string,
  removeTerms: string[],
  keepTerms: Array<[string, string]>,
): SearchPart[] {
  if (!filename) return [];
  const stripped = filename.replace(/\.[a-zA-Z0-9]{2,4}$/, '');
  const tokens = stripped.split(/[.\s_-]+/).filter(Boolean);
  if (tokens.length === 0) return [];

  const removeLower = removeTerms.map(t => t.toLowerCase());
  const keepMap = new Map<string, string>();
  for (const [match, display] of keepTerms) {
    keepMap.set(match.toLowerCase(), display);
  }

  const parts: SearchPart[] = [];
  let i = 0;
  let idCounter = 0;

  while (i < tokens.length) {
    let matched = false;
    for (const [match, display] of keepTerms) {
      const termWords = match.split(/\s+/);
      if (termWords.length <= 1) continue;
      const slice = tokens.slice(i, i + termWords.length);
      if (slice.length < termWords.length) continue;
      const sliceJoined = slice.join(' ').toLowerCase();
      if (sliceJoined === match.toLowerCase()) {
        parts.push({ id: String(idCounter++), text: display, originalText: match, state: 'keep', editable: true });
        i += termWords.length;
        matched = true;
        break;
      }
    }
    if (matched) continue;

    const token = tokens[i];
    const tokenLower = token.toLowerCase();
    let state: SearchPart['state'] = 'search';
    let text = token;

    if (removeLower.includes(tokenLower)) {
      state = 'remove';
    } else {
      for (const [matchKey, displayVal] of keepMap.entries()) {
        const re = new RegExp(`^${matchKey}[a-z]*$`, 'i');
        if (re.test(tokenLower)) {
          state = 'keep';
          text = displayVal;
          break;
        }
      }
    }

    if (/^\d{4}$/.test(token)) {
      const num = parseInt(token, 10);
      if (num > 1900 && num <= new Date().getFullYear() + 1) {
        state = 'remove';
      }
    }

    parts.push({ id: String(idCounter++), text, originalText: token, state, editable: true });
    i++;
  }

  const yearIndices = parts
    .map((p, idx) => ({ p, idx }))
    .filter(({ p }) => p.state === 'remove' && /^\d{4}$/.test(p.originalText) && parseInt(p.originalText, 10) > 1900)
    .map(({ idx }) => idx);

  if (yearIndices.length > 1) {
    for (const idx of yearIndices.slice(0, -1)) {
      parts[idx].state = 'search';
    }
  }

  return parts;
}
