import type { ExtractionPattern, MovieMatch, MovieMetadata } from '../types';

export function buildSearchUrl(query: string, baseUrl: string): string {
  return baseUrl + encodeURIComponent(query);
}

export function buildTitleUrl(tt: string, baseUrl: string): string {
  return `${baseUrl}${tt}/`;
}

export function generateSearchExtractionScript(): string {
  return `
    new Promise(function(resolve) {
      var attempts = 0;
      var maxAttempts = 20;
      var interval = 150;

      function extract() {
        try {
          var results = [];
          var seen = {};

          var allLinks = document.querySelectorAll('a[href*="/title/tt"]');
          for (var i = 0; i < allLinks.length; i++) {
            var href = allLinks[i].getAttribute('href') || '';
            var m = href.match(/\\/title\\/(tt\\d+)/);
            if (!m || seen[m[1]]) continue;

            var linkText = allLinks[i].textContent.trim();
            if (!linkText || linkText.length < 2) continue;
            if (/^tt\\d+$/.test(linkText)) continue;

            seen[m[1]] = true;

            var container = allLinks[i].closest('li, [class*="list-summary"], [class*="find-result"]');
            if (!container) container = allLinks[i].parentElement;

            var year = null;
            if (container) {
              var fullText = container.textContent || '';
              var metaText = fullText.replace(linkText, '');
              var parenYear = metaText.match(/\\(((?:19|20)\\d{2})\\)/);
              if (parenYear) {
                year = parseInt(parenYear[1], 10);
              } else {
                var plainYear = metaText.match(/(?:^|\\D)((?:19|20)\\d{2})(?:\\D|$)/);
                if (plainYear) year = parseInt(plainYear[1], 10);
              }
            }

            var img = (container || allLinks[i]).querySelector('img');
            var thumbnailUrl = null;
            if (img && img.src && !img.src.includes('nopicture')) {
              thumbnailUrl = img.src;
            }

            results.push({
              tt: m[1],
              title: linkText,
              year: year,
              aka: null,
              thumbnailUrl: thumbnailUrl,
            });
          }

          if (results.length === 0 && attempts < maxAttempts) {
            attempts++;
            setTimeout(extract, interval);
            return;
          }
          resolve(JSON.stringify({ type: 'searchResults', results: results }));
        } catch(e) {
          if (attempts < maxAttempts) {
            attempts++;
            setTimeout(extract, interval);
          } else {
            resolve(JSON.stringify({ type: 'searchResults', results: [], error: e.message }));
          }
        }
      }
      extract();
    })
  `;
}

export function generateTitleExtractionScript(patterns: ExtractionPattern[]): string {
  const patternJson = JSON.stringify(patterns);
  return `
    (function() {
      try {
        var data = {};
        var ldScript = document.querySelector('script[type="application/ld+json"]');
        var ld = ldScript ? JSON.parse(ldScript.textContent || '{}') : {};
        var patterns = ${patternJson};

        for (var i = 0; i < patterns.length; i++) {
          var p = patterns[i];
          var value = null;

          if (p.jsonLdPath && ld[p.jsonLdPath] !== undefined) {
            value = ld[p.jsonLdPath];
          }

          if (value === null && p.domSelector) {
            var el = document.querySelector(p.domSelector);
            if (el) value = el.textContent.trim();
          }

          if (value === null && p.regexPattern) {
            var html = document.documentElement.innerHTML;
            var re = new RegExp(p.regexPattern);
            var m = re.exec(html);
            if (m) value = m[p.regexGroup || 0];
          }

          if (value !== null) data[p.field] = value;
        }

        var tt = '';
        var urlMatch = window.location.href.match(/title\\/(tt\\d+)/);
        if (urlMatch) tt = urlMatch[1];

        var directors = [];
        if (ld.director) {
          var dirArr = Array.isArray(ld.director) ? ld.director : [ld.director];
          directors = dirArr.map(function(d) { return d.name || d; });
        }

        var actors = [];
        if (ld.actor) {
          var actArr = Array.isArray(ld.actor) ? ld.actor : [ld.actor];
          actors = actArr.map(function(a) { return a.name || a; });
        }

        var genres = [];
        if (ld.genre) {
          genres = Array.isArray(ld.genre) ? ld.genre : [ld.genre];
        }

        var duration = null;
        if (ld.duration) {
          var durMatch = ld.duration.match(/PT(?:(\\d+)H)?(?:(\\d+)M)?/);
          if (durMatch) {
            duration = (parseInt(durMatch[1] || '0', 10) * 60) + parseInt(durMatch[2] || '0', 10);
          }
        }

        return JSON.stringify({
          type: 'titleData',
          data: {
            tt: tt,
            title: data.title || ld.name || '',
            year: data.year ? parseInt(data.year, 10) : (ld.datePublished ? parseInt(ld.datePublished, 10) : null),
            rating: ld.aggregateRating ? ld.aggregateRating.ratingValue : null,
            directors: directors,
            genres: genres,
            actors: actors,
            duration: duration,
            mpaa: ld.contentRating || null,
            aka: [],
            posterUrl: ld.image || null,
          }
        });
      } catch(e) {
        return JSON.stringify({ type: 'titleData', data: null, error: e.message });
      }
    })()
  `;
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
