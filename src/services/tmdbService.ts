const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/';

export async function searchPosters(
  imdbId: string,
  apiBase: string,
  apiKey: string,
): Promise<string[]> {
  try {
    // Step 1: Find the TMDB movie ID from the IMDB ID
    const findUrl = `${apiBase}find/${imdbId}?api_key=${apiKey}&external_source=imdb_id`;
    const findResponse = await fetch(findUrl);
    if (!findResponse.ok) return [];

    const findData = await findResponse.json();
    const movieResults: Array<{ id: number; poster_path: string | null }> = findData.movie_results || [];
    if (movieResults.length === 0) return [];

    const tmdbId = movieResults[0].id;

    // Step 2: Fetch all poster images for this movie
    const imagesUrl = `${apiBase}movie/${tmdbId}/images?api_key=${apiKey}`;
    const imagesResponse = await fetch(imagesUrl);
    if (!imagesResponse.ok) return [];

    const imagesData = await imagesResponse.json();
    const posters: Array<{ file_path: string }> = imagesData.posters || [];

    return posters.map(p => p.file_path);
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
