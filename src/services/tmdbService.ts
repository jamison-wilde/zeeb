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
      .map(r => r.poster_path!);
  } catch {
    return [];
  }
}

export function buildPosterUrl(posterPath: string, size: string): string {
  return `${TMDB_IMAGE_BASE}${size}${posterPath}`;
}

export async function fetchPosterBinary(posterPath: string, size: string): Promise<Uint8Array> {
  const url = buildPosterUrl(posterPath, size);
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch poster: ${response.status}`);
  }
  const buffer = await response.arrayBuffer();
  return new Uint8Array(buffer);
}
