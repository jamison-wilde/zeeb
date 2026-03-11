import { searchPosters, buildPosterUrl } from '../../src/services/tmdbService';

global.fetch = jest.fn() as jest.Mock;

describe('tmdbService', () => {
  beforeEach(() => jest.clearAllMocks());

  it('searches TMDB for movie posters by IMDB id', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        movie_results: [{
          poster_path: '/abc123.jpg',
          title: 'The Shawshank Redemption',
        }],
      }),
    });

    const results = await searchPosters('tt0111161', 'https://api.themoviedb.org/3/', 'fake-key');
    expect(results).toHaveLength(1);
    expect(results[0]).toContain('abc123.jpg');
  });

  it('builds full poster URL from path', () => {
    const url = buildPosterUrl('/abc123.jpg', 'w500');
    expect(url).toBe('https://image.tmdb.org/t/p/w500/abc123.jpg');
  });

  it('returns empty array on API error', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({ ok: false, status: 404 });
    const results = await searchPosters('tt9999999', 'https://api.themoviedb.org/3/', 'fake-key');
    expect(results).toEqual([]);
  });
});
