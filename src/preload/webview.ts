import { ipcRenderer } from 'electron';

interface ExtractionPattern {
  field: string;
  jsonLdPath: string | null;
  domSelector: string | null;
  regexPattern: string | null;
  regexGroup: number | null;
}

let extractionPatterns: ExtractionPattern[] = [];
let pollTimer: ReturnType<typeof setInterval> | null = null;
let sentSearch = false;
let sentTitle = false;

// Renderer can push updated extraction patterns at any time
ipcRenderer.on('set-extraction-patterns', (_event, patterns: ExtractionPattern[]) => {
  extractionPatterns = patterns;
});

function extractSearchResults(): string | null {
  try {
    const results: Array<{
      tt: string;
      title: string;
      year: number | null;
      aka: null;
      thumbnailUrl: string | null;
    }> = [];
    const seen: Record<string, boolean> = {};

    const allLinks = document.querySelectorAll('a[href*="/title/tt"]');
    for (let i = 0; i < allLinks.length; i++) {
      const href = allLinks[i].getAttribute('href') || '';
      const m = href.match(/\/title\/(tt\d+)/);
      if (!m || seen[m[1]]) continue;

      const linkText = (allLinks[i].textContent || '').trim();
      if (!linkText || linkText.length < 2) continue;
      if (/^tt\d+$/.test(linkText)) continue;

      seen[m[1]] = true;

      let container = allLinks[i].closest('li, [class*="list-summary"], [class*="find-result"]');
      if (!container) container = allLinks[i].parentElement;

      let year: number | null = null;
      if (container) {
        const fullText = container.textContent || '';
        const metaText = fullText.replace(linkText, '');
        const parenYear = metaText.match(/\(((?:19|20)\d{2})\)/);
        if (parenYear) {
          year = parseInt(parenYear[1], 10);
        } else {
          const plainYear = metaText.match(/(?:^|\D)((?:19|20)\d{2})(?:\D|$)/);
          if (plainYear) year = parseInt(plainYear[1], 10);
        }
      }

      const imgEl = (container || allLinks[i]).querySelector('img');
      let thumbnailUrl: string | null = null;
      if (imgEl && (imgEl as HTMLImageElement).src && !(imgEl as HTMLImageElement).src.includes('nopicture')) {
        thumbnailUrl = (imgEl as HTMLImageElement).src;
      }

      results.push({ tt: m[1], title: linkText, year, aka: null, thumbnailUrl });
    }

    if (results.length === 0) return null;
    return JSON.stringify({ type: 'searchResults', results });
  } catch {
    return null;
  }
}

function extractTitleData(): string | null {
  try {
    const ldScript = document.querySelector('script[type="application/ld+json"]');
    if (!ldScript) return null;

    const ld = JSON.parse(ldScript.textContent || '{}');
    const data: Record<string, any> = {};

    for (const p of extractionPatterns) {
      let value: any = null;

      if (p.jsonLdPath && ld[p.jsonLdPath] !== undefined) {
        value = ld[p.jsonLdPath];
      }

      if (value === null && p.domSelector) {
        const el = document.querySelector(p.domSelector);
        if (el) value = (el.textContent || '').trim();
      }

      if (value === null && p.regexPattern) {
        const html = document.documentElement.innerHTML;
        const re = new RegExp(p.regexPattern);
        const m = re.exec(html);
        if (m) value = m[p.regexGroup || 0];
      }

      if (value !== null) data[p.field] = value;
    }

    let tt = '';
    const urlMatch = window.location.href.match(/title\/(tt\d+)/);
    if (urlMatch) tt = urlMatch[1];

    let directors: string[] = [];
    if (ld.director) {
      const dirArr = Array.isArray(ld.director) ? ld.director : [ld.director];
      directors = dirArr.map((d: any) => d.name || d);
    }

    let actors: string[] = [];
    if (ld.actor) {
      const actArr = Array.isArray(ld.actor) ? ld.actor : [ld.actor];
      actors = actArr.map((a: any) => a.name || a);
    }

    let genres: string[] = [];
    if (ld.genre) {
      genres = Array.isArray(ld.genre) ? ld.genre : [ld.genre];
    }

    let duration: number | null = null;
    if (ld.duration) {
      const durMatch = ld.duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
      if (durMatch) {
        duration = (parseInt(durMatch[1] || '0', 10) * 60) + parseInt(durMatch[2] || '0', 10);
      }
    }

    // AKA extraction: JSON-LD alternateName + DOM scrape
    const akas: string[] = [];
    if (ld.alternateName) {
      akas.push(ld.alternateName);
    }

    // Scrape inline "Also Known As" from details section
    const akaLi = document.querySelector('li[data-testid="title-details-aka"]');
    if (akaLi) {
      // The value is typically in a span/div after the label
      const spans = akaLi.querySelectorAll('span');
      for (const span of spans) {
        const text = (span.textContent || '').trim();
        if (text && text !== 'Also Known As' && !akas.includes(text)) {
          akas.push(text);
        }
      }
    }

    // Fallback: regex search for "Also Known As" followed by text
    if (akas.length === 0) {
      const html = document.documentElement.innerHTML;
      const akaMatch = html.match(/Also Known As<\/h4>\s*([^<(]*)/i)
        || html.match(/Also Known As<\/[^>]+>\s*<[^>]+>([^<]+)/i);
      if (akaMatch) {
        const text = akaMatch[1].trim();
        if (text) akas.push(text);
      }
    }

    return JSON.stringify({
      type: 'titleData',
      data: {
        tt,
        title: data.title || ld.name || '',
        year: data.year ? parseInt(data.year, 10) : (ld.datePublished ? parseInt(ld.datePublished, 10) : null),
        rating: ld.aggregateRating ? ld.aggregateRating.ratingValue : null,
        directors,
        genres,
        actors,
        duration,
        mpaa: ld.contentRating || null,
        aka: akas,
        posterUrl: ld.image || null,
      },
    });
  } catch {
    return null;
  }
}

// Fetch full AKA list from /releaseinfo page (lazy, after title data sent)
async function fetchMoreAkas(tt: string): Promise<void> {
  if (!tt) return;
  try {
    const res = await fetch(`https://www.imdb.com/title/${tt}/releaseinfo`);
    if (!res.ok) return;
    const html = await res.text();

    // Find the AKA table: rows with <td> pairs (country, title)
    const akaEntries: string[] = [];
    // Match table rows containing AKA data
    const rowRe = /<td[^>]*>(.*?)<\/td>\s*<td[^>]*>(.*?)<\/td>/gs;
    // Find the AKA section first
    const akaSection = html.match(/<a[^>]*id="akas"[^>]*>.*?<table[^>]*>([\s\S]*?)<\/table>/i);
    if (akaSection) {
      let match;
      while ((match = rowRe.exec(akaSection[1])) !== null) {
        const country = match[1].replace(/<[^>]+>/g, '').trim();
        const title = match[2].replace(/<[^>]+>/g, '').trim();
        if (title && country) {
          akaEntries.push(`${title} *${country}*`);
        }
      }
    }

    if (akaEntries.length > 0) {
      ipcRenderer.sendToHost('extraction-result', JSON.stringify({
        type: 'moreAkas',
        akas: akaEntries,
      }));
    }
  } catch { /* /releaseinfo fetch failed — not critical */ }
}

function stopPolling() {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
}

function startPolling() {
  stopPolling();
  sentSearch = false;
  sentTitle = false;
  let attempts = 0;

  pollTimer = setInterval(() => {
    if (sentSearch && sentTitle) { stopPolling(); return; }
    attempts++;
    if (attempts > 120) { stopPolling(); return; } // 30s max

    if (!sentSearch) {
      const searchResult = extractSearchResults();
      if (searchResult) {
        sentSearch = true;
        ipcRenderer.sendToHost('extraction-result', searchResult);
      }
    }

    if (!sentTitle) {
      const titleResult = extractTitleData();
      if (titleResult) {
        sentTitle = true;
        ipcRenderer.sendToHost('extraction-result', titleResult);
        // Kick off lazy fetch of full AKA list from /releaseinfo
        const urlMatch = window.location.href.match(/title\/(tt\d+)/);
        if (urlMatch) {
          void fetchMoreAkas(urlMatch[1]);
        }
      }
    }

    if (sentSearch && sentTitle) stopPolling();
  }, 250);
}

// Skip about:blank and empty pages
function shouldExtract(): boolean {
  const url = window.location.href;
  return url !== '' && url !== 'about:blank';
}

// Start extraction when DOM begins to populate
document.addEventListener('DOMContentLoaded', () => {
  if (shouldExtract()) startPolling();
});

// If DOMContentLoaded already fired (preload ran after it)
if (document.readyState !== 'loading' && shouldExtract()) {
  startPolling();
}
