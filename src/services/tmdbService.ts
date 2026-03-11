const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/';

export async function searchPosters(
  imdbId: string,
  apiBase: string,
  apiKey: string,
): Promise<string[]> {
  try {
    const url = `${apiBase}find/${imdbId}?api_key=${apiKey}&external_source=imdb_id`;
    const response = await fetch(url);
    if (!response.ok) return [];

    const data = await response.json();
    const movieResults: Array<{ poster_path: string | null }> = data.movie_results || [];

    return movieResults
      .filter(r => r.poster_path)
      .map(r => buildPosterUrl(r.poster_path!, 'w500'));
  } catch {
    return [];
  }
}

export function buildPosterUrl(posterPath: string, size: string): string {
  return `${TMDB_IMAGE_BASE}${size}${posterPath}`;
}
