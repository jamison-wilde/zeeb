import type { SearchPart } from '../types';

export function parseFilename(
  filename: string,
  removeTerms: string[],
  keepTerms: string[],
): SearchPart[] {
  if (!filename) return [];

  // 1. Strip file extension (last .xxx where xxx is 2-4 chars)
  const stripped = filename.replace(/\.[a-zA-Z0-9]{2,4}$/, '');

  // 2. Split by dots, spaces, underscores, and dashes
  const tokens = stripped.split(/[.\s_-]+/).filter(Boolean);

  if (tokens.length === 0) return [];

  // Normalize term lists for case-insensitive comparison
  const removeLower = removeTerms.map(t => t.toLowerCase());
  const keepLower = keepTerms.map(t => t.toLowerCase());

  // 3. Check for multi-word keep terms by joining adjacent tokens
  const parts: SearchPart[] = [];
  let i = 0;
  let idCounter = 0;

  while (i < tokens.length) {
    let matched = false;

    // Try matching multi-word keep terms (longest first)
    for (const term of keepTerms) {
      const termWords = term.split(/\s+/);
      if (termWords.length <= 1) continue;

      const slice = tokens.slice(i, i + termWords.length);
      if (slice.length < termWords.length) continue;

      const sliceJoined = slice.join(' ').toLowerCase();
      if (sliceJoined === term.toLowerCase()) {
        parts.push({
          id: String(idCounter++),
          text: term,
          originalText: term,
          state: 'keep',
          editable: true,
        });
        i += termWords.length;
        matched = true;
        break;
      }
    }

    if (matched) continue;

    const token = tokens[i];
    const tokenLower = token.toLowerCase();

    // 4. Classify token
    let state: SearchPart['state'] = 'search';

    if (removeLower.includes(tokenLower)) {
      state = 'remove';
    } else if (keepLower.includes(tokenLower)) {
      state = 'keep';
    }

    // Detect 4-digit year candidates — mark tentatively, resolve after loop
    if (/^\d{4}$/.test(token)) {
      const num = parseInt(token, 10);
      if (num > 1900 && num <= new Date().getFullYear() + 1) {
        state = 'remove';
      }
    }

    parts.push({
      id: String(idCounter++),
      text: token,
      originalText: token,
      state,
      editable: true,
    });

    i++;
  }

  // Only treat the LAST year-like 'remove' part as the actual year.
  // Earlier ones (e.g. "2001" in "2001 A Space Odyssey 1968") are part of the title.
  const yearIndices = parts
    .map((p, idx) => ({ p, idx }))
    .filter(({ p }) => p.state === 'remove' && /^\d{4}$/.test(p.text) && parseInt(p.text, 10) > 1900)
    .map(({ idx }) => idx);

  if (yearIndices.length > 1) {
    for (const idx of yearIndices.slice(0, -1)) {
      parts[idx].state = 'search';
    }
  }

  return parts;
}
