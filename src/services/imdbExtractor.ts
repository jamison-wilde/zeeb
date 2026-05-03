import type { MovieMatch, MovieMetadata } from '../types';

export function buildSearchUrl(query: string, baseUrl: string): string {
  return baseUrl + encodeURIComponent(query);
}

export function buildTitleUrl(tt: string, baseUrl: string): string {
  return `${baseUrl}${tt}/`;
}

export function parseSearchResults(message: string): MovieMatch[] {
  try {
    const parsed = JSON.parse(message);
    if (parsed.type === 'searchResults' && Array.isArray(parsed.results)) {
      return parsed.results;
    }
    return [];
  } catch {
    return [];
  }
}

export function parseTitleData(message: string): MovieMetadata | null {
  try {
    const parsed = JSON.parse(message);
    if (parsed.type === 'titleData' && parsed.data) {
      return parsed.data;
    }
    return null;
  } catch {
    return null;
  }
}
