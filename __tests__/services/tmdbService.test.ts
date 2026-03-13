import { describe, it, expect, vi, beforeEach } from 'vitest';
import { searchPosters, buildPosterUrl, fetchPosterBinary } from '../../src/services/tmdbService';

global.fetch = vi.fn() as ReturnType<typeof vi.fn>;

describe('tmdbService', () => {
  beforeEach(() => vi.clearAllMocks());

  it('fetches all poster images via find + images endpoints', async () => {
    const mockFetch = global.fetch as ReturnType<typeof vi.fn>;
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          movie_results: [{ id: 278, poster_path: '/main.jpg' }],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          posters: [
            { file_path: '/en_poster.jpg' },
            { file_path: '/de_poster.jpg' },
            { file_path: '/fr_poster.jpg' },
          ],
        }),
      });

    const results = await searchPosters('tt0111161', 'https://api.themoviedb.org/3/', 'fake-key');
    expect(results).toHaveLength(3);
    expect(results[0]).toBe('/en_poster.jpg');
    expect(results[2]).toBe('/fr_poster.jpg');
    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(mockFetch.mock.calls[1][0]).toContain('/movie/278/images');
  });

  it('returns empty array when find returns no movie results', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ movie_results: [] }),
    });

    const results = await searchPosters('tt9999999', 'https://api.themoviedb.org/3/', 'fake-key');
    expect(results).toEqual([]);
  });

  it('builds full poster URL from path', () => {
    const url = buildPosterUrl('/abc123.jpg', 'w500');
    expect(url).toBe('https://image.tmdb.org/t/p/w500/abc123.jpg');
  });

  it('fetches poster binary data', async () => {
    const fakeBytes = new Uint8Array([0xFF, 0xD8, 0xFF]);
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      arrayBuffer: () => Promise.resolve(fakeBytes.buffer),
    });

    const data = await fetchPosterBinary('/abc123.jpg', 'w780');
    expect(data).toBeInstanceOf(Uint8Array);
    expect(data.length).toBe(3);
    expect(global.fetch).toHaveBeenCalledWith('https://image.tmdb.org/t/p/w780/abc123.jpg');
  });

  it('throws on fetchPosterBinary network failure', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      status: 404,
    });

    await expect(fetchPosterBinary('/bad.jpg', 'w780')).rejects.toThrow();
  });

  it('returns empty array on API error', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: false, status: 404 });
    const results = await searchPosters('tt9999999', 'https://api.themoviedb.org/3/', 'fake-key');
    expect(results).toEqual([]);
  });
});
