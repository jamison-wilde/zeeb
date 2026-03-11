import type { ExtractionPattern, MovieMatch, MovieMetadata } from '../types';

export function buildSearchUrl(query: string, baseUrl: string): string {
  return baseUrl + encodeURIComponent(query);
}

export function buildTitleUrl(tt: string, baseUrl: string): string {
  return `${baseUrl}${tt}/`;
}

export function generateSearchExtractionScript(): string {
  return `
    (function() {
      var attempts = 0;
      function extract() {
        try {
          var results = [];
          var seen = {};

          // Modern IMDB: list items within the search results section
          var items = document.querySelectorAll('[class*="ipc-metadata-list-summary-item"], .findResult, .find-result-item');
          if (items.length > 0) {
            for (var i = 0; i < items.length; i++) {
              var link = items[i].querySelector('a[href*="/title/tt"]');
              if (!link) continue;
              var href = link.getAttribute('href') || '';
              var m = href.match(/\\/title\\/(tt\\d+)/);
              if (!m || seen[m[1]]) continue;
              seen[m[1]] = true;
              // Title is the link text
              var title = link.textContent.trim();
              // Year and other metadata are in sibling/child spans
              var containerText = items[i].textContent || '';
              var yearMatch = containerText.match(/(?:^|\\D)((?:19|20)\\d{2})(?:\\D|$)/);
              var img = items[i].querySelector('img');
              // Check for aka text
              var akaEl = items[i].querySelector('[class*="aka"], .result_text i');
              var aka = akaEl ? akaEl.textContent.trim() : null;
              results.push({
                tt: m[1],
                title: title,
                year: yearMatch ? parseInt(yearMatch[1], 10) : null,
                aka: aka,
                thumbnailUrl: img ? img.src : null,
              });
            }
          }

          // Fallback: scan all title links if structured selectors found nothing
          if (results.length === 0) {
            var links = document.querySelectorAll('a[href*="/title/tt"]');
            for (var j = 0; j < links.length; j++) {
              var h = links[j].getAttribute('href') || '';
              var mt = h.match(/\\/title\\/(tt\\d+)/);
              if (!mt || seen[mt[1]]) continue;
              // Skip tiny nav/utility links
              var linkText = links[j].textContent.trim();
              if (!linkText || linkText.length < 2) continue;
              seen[mt[1]] = true;
              var parent = links[j].closest('li, [class*="list"], [class*="result"]') || links[j].parentElement;
              var pText = parent ? parent.textContent : linkText;
              var ym = pText.match(/(?:^|\\D)((?:19|20)\\d{2})(?:\\D|$)/);
              var pImg = (parent || links[j]).querySelector('img');
              results.push({
                tt: mt[1],
                title: linkText,
                year: ym ? parseInt(ym[1], 10) : null,
                aka: null,
                thumbnailUrl: pImg ? pImg.src : null,
              });
            }
          }

          if (results.length === 0 && attempts < 3) {
            attempts++;
            setTimeout(extract, 300);
            return;
          }
          window.zeebIpc.sendToHost(JSON.stringify({
            type: 'searchResults',
            results: results,
          }));
        } catch(e) {
          window.zeebIpc.sendToHost(JSON.stringify({
            type: 'searchResults',
            results: [],
            error: e.message,
          }));
        }
      }
      extract();
    })();
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

          // Try JSON-LD first
          if (p.jsonLdPath && ld[p.jsonLdPath] !== undefined) {
            value = ld[p.jsonLdPath];
          }

          // Fallback to DOM selector
          if (value === null && p.domSelector) {
            var el = document.querySelector(p.domSelector);
            if (el) value = el.textContent.trim();
          }

          // Fallback to regex
          if (value === null && p.regexPattern) {
            var html = document.documentElement.innerHTML;
            var re = new RegExp(p.regexPattern);
            var m = re.exec(html);
            if (m) value = m[p.regexGroup || 0];
          }

          if (value !== null) data[p.field] = value;
        }

        // Extract standard fields from JSON-LD
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

        var result = {
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
        };

        window.zeebIpc.sendToHost(JSON.stringify({
          type: 'titleData',
          data: result,
        }));
      } catch(e) {
        window.zeebIpc.sendToHost(JSON.stringify({
          type: 'titleData',
          data: null,
          error: e.message,
        }));
      }
    })();
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
