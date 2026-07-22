import https from 'node:https';
import http from 'node:http';

if (typeof globalThis.fetch !== 'function') {
  globalThis.fetch = function polyfillFetch(urlInput, options = {}) {
    return new Promise((resolve, reject) => {
      const urlObj = typeof urlInput === 'string' ? new URL(urlInput) : urlInput;
      const client = urlObj.protocol === 'https:' ? https : http;

      const reqOptions = {
        method: options.method || 'GET',
        headers: options.headers || {}
      };

      const req = client.request(urlObj, reqOptions, res => {
        if ([301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location) {
          const redirectUrl = new URL(res.headers.location, urlObj);
          return polyfillFetch(redirectUrl, options).then(resolve, reject);
        }

        const chunks = [];
        res.on('data', chunk => chunks.push(chunk));
        res.on('end', () => {
          const buffer = Buffer.concat(chunks);
          const bodyText = buffer.toString('utf8');

          const response = {
            ok: res.statusCode >= 200 && res.statusCode < 300,
            status: res.statusCode,
            statusText: res.statusMessage || '',
            headers: {
              get(name) {
                const val = res.headers[String(name).toLowerCase()];
                return Array.isArray(val) ? val.join(', ') : (val || null);
              }
            },
            async text() {
              return bodyText;
            },
            async json() {
              return JSON.parse(bodyText);
            }
          };
          resolve(response);
        });
      });

      req.on('error', reject);

      if (options.body) {
        req.write(options.body);
      }
      req.end();
    });
  };
}

export const ABSTRACT_IMAGE_FALLBACKS = {
  minimal: [
    'minimal gradient background',
    'soft shadows on wall',
    'paper texture minimal',
    'light and shadow abstract',
    'empty sky minimal landscape'
  ],
  cinematic: [
    'cinematic clouds',
    'moody night lights',
    'rain reflections at night',
    'blurred city lights',
    'fog and light beams'
  ],
  archive: [
    'old paper texture',
    'vintage document texture',
    'archival photography',
    'grainy monochrome texture',
    'old map texture'
  ],
  playful: [
    'colorful shapes',
    'paper cut collage',
    'toy objects composition',
    'bright playful abstract',
    'confetti minimal photo'
  ],
  tech: [
    'chrome reflections',
    'neon lights abstract',
    'glass reflections futuristic',
    'interface glow abstract',
    'dark technology texture'
  ],
  brutalist: [
    'concrete texture',
    'staircase geometry',
    'architectural shadows',
    'empty parking lot aerial',
    'brutalist facade abstract'
  ],
  surreal: [
    'cosmos abstract',
    'dreamy clouds',
    'floating objects surreal',
    'mist and mirrors',
    'strange still life'
  ]
};

export const PROVIDER_ORDER = {
  modern: ['unsplash', 'pexels', 'pixabay', 'openverse'],
  archive: ['wikimedia', 'openverse', 'pixabay'],
  general: ['unsplash', 'pexels', 'pixabay', 'openverse', 'wikimedia']
};

export const PAGE_IMAGE_STRATEGY = {
  'hero-photo-page': 'exact-then-atmospheric',
  'full-bleed-image': 'exact-then-atmospheric',
  'dense-grid-page': 'pool-mix',
  'contact-sheet-page': 'pool-mix',
  'catalog-page': 'pool-mix',
  'archival-page': 'archive-first',
  'timeline-page': 'archive-first',
  'technical-diagram-page': 'decorative-ok',
  'quote-page': 'decorative-ok',
  'essay-page': 'atmospheric-ok',
  default: 'exact-then-simplified'
};

export const imageStats = {
  unsplashSearches: 0,
  unsplashImages: 0,
  pexelsSearches: 0,
  pexelsImages: 0,
  pixabaySearches: 0,
  pixabayImages: 0,
  openverseSearches: 0,
  openverseImages: 0,
  wikimediaSearches: 0,
  wikimediaImages: 0,
  singleImageFallbacks: 0,
  gridImageFallbacks: 0,
  decorativePageArtFallbacks: 0
};

const STOPWORDS = new Set([
  'editorial', 'photography', 'photo', 'imaginary-local', 'imaginary', 'local',
  'coherent', 'booklet', 'layout', 'design', 'style', 'visual', 'report',
  'near-empty', 'minimalism', 'minimalist', 'cinematic', 'documentary', 'poetic',
  'surreal', 'dreamy', 'blurred', 'halftone', 'clean', 'scan', 'archival'
]);

export function pickRandom(arr, random = Math.random) {
  return arr[Math.floor(random() * arr.length)];
}

export function uniq(arr) {
  return [...new Set(arr.filter(Boolean))];
}

export function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function normalizeText(value = '') {
  return String(value)
    .toLowerCase()
    .replace(/[–—]/g, ' ')
    .replace(/[^a-z0-9\s-]/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function simplifyTopic(topic = '') {
  const tokens = normalizeText(topic)
    .split(' ')
    .filter(Boolean)
    .filter(token => !STOPWORDS.has(token));

  if (!tokens.length) {
    return topic;
  }

  return tokens.slice(0, 4).join(' ');
}

export function extractCoreNouns(topic = '') {
  const tokens = normalizeText(topic)
    .split(' ')
    .filter(Boolean)
    .filter(token => !STOPWORDS.has(token));

  return uniq([
    tokens.slice(0, 2).join(' '),
    tokens.slice(0, 3).join(' '),
    tokens[0],
    tokens[1]
  ]);
}

export function detectMood({ mood = '', styleFamily = '', colorMode = '' } = {}) {
  const source = `${mood} ${styleFamily} ${colorMode}`.toLowerCase();

  if (/playful|child|kids|bright/.test(source)) return 'playful';
  if (/tech|chrome|neon|interface|digital|cyber/.test(source)) return 'tech';
  if (/archive|vintage|museum|document|history|mono|black-white/.test(source)) return 'archive';
  if (/brutal|concrete|architect|grid|industrial/.test(source)) return 'brutalist';
  if (/surreal|dream|cosmos|poetic/.test(source)) return 'surreal';
  if (/cinematic|noir|night|moody/.test(source)) return 'cinematic';

  return 'minimal';
}

export function buildMoodQueries(mood) {
  switch (mood) {
    case 'playful':
      return ['colorful shapes', 'playful still life', 'bright paper cut collage'];
    case 'tech':
      return ['chrome reflections', 'neon abstract', 'dark technology texture'];
    case 'archive':
      return ['archival photography', 'old paper texture', 'vintage document texture'];
    case 'brutalist':
      return ['concrete texture', 'architectural shadows', 'brutalist facade'];
    case 'surreal':
      return ['dreamy clouds', 'cosmos abstract', 'mist and mirrors'];
    case 'cinematic':
      return ['moody night lights', 'rain reflections', 'cinematic clouds'];
    default:
      return ['soft shadows', 'minimal gradient', 'paper texture'];
  }
}

export function buildVisualSubstitutes(topic = '', category = '') {
  const core = simplifyTopic(topic);
  const source = `${topic} ${category}`.toLowerCase();

  if (/bread|bakery|pastry|wheat|flour/.test(source)) {
    return ['bakery', 'wheat', 'flour texture', 'warm food still life', 'kitchen table'];
  }

  if (/coffee|espresso|cafe/.test(source)) {
    return ['coffee cup', 'morning coffee', 'hands with cup', 'steam', 'warm table'];
  }

  if (/train|rail|station/.test(source)) {
    return ['train station at night', 'railway lights', 'motion blur lights', 'industrial night', 'dark travel'];
  }

  if (/architecture|building|brutal|bridge|facade/.test(source)) {
    return ['concrete', 'geometry', 'facade', 'windows', 'staircase'];
  }

  if (/ocean|sea|water|diver/.test(source)) {
    return ['water texture', 'waves', 'horizon', 'underwater light', 'coastal fog'];
  }

  if (/space|cosmos|planet|galaxy/.test(source)) {
    return ['cosmos', 'stars', 'nebula', 'moon texture', 'space abstract'];
  }

  return uniq([core, ...extractCoreNouns(core)]).filter(Boolean);
}

export function buildQueryChain({
  topic = '',
  category = '',
  mood = '',
  styleFamily = '',
  pageType = 'default',
  allowAbstract = true
} = {}) {
  const simplified = simplifyTopic(topic);
  const coreNouns = extractCoreNouns(topic);
  const substitutes = buildVisualSubstitutes(topic, category);
  const moodQueries = buildMoodQueries(mood || detectMood({ styleFamily }));
  const abstractPool = ABSTRACT_IMAGE_FALLBACKS[detectMood({ mood, styleFamily })] || ABSTRACT_IMAGE_FALLBACKS.minimal;
  const strategy = PAGE_IMAGE_STRATEGY[pageType] || PAGE_IMAGE_STRATEGY.default;

  const exact = uniq([
    `${topic}`.trim(),
    `${simplified}`.trim(),
    ...coreNouns,
  ]).filter(Boolean);

  const atmospheric = uniq([
    ...substitutes,
    ...moodQueries
  ]);

  let chain = [];

  switch (strategy) {
    case 'archive-first':
      chain = [...atmospheric, ...exact];
      break;
    case 'pool-mix':
      chain = [...exact, ...substitutes, ...moodQueries];
      break;
    case 'decorative-ok':
      chain = [...moodQueries, ...substitutes, ...exact];
      break;
    case 'atmospheric-ok':
      chain = [...exact, ...moodQueries, ...substitutes];
      break;
    default:
      chain = [...exact, ...substitutes, ...moodQueries];
      break;
  }

  if (allowAbstract) {
    chain.push(...abstractPool);
  }

  return uniq(chain).slice(0, 12);
}

export function buildGridQueryPool({ topic = '', category = '', mood = '', styleFamily = '' } = {}) {
  const simplified = simplifyTopic(topic);
  const substitutes = buildVisualSubstitutes(topic, category);
  const moodQueries = buildMoodQueries(mood || detectMood({ styleFamily }));

  return uniq([
    simplified,
    ...extractCoreNouns(topic),
    ...substitutes,
    ...moodQueries
  ]).filter(Boolean);
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, options);
  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`${response.status}: ${text || response.statusText}`);
  }
  return response.json();
}

export async function fetchUnsplash(query) {
  const key = process.env.UNSPLASH_ACCESS_KEY;
  if (!key) return [];

  const url = new URL('https://api.unsplash.com/search/photos');
  url.searchParams.set('query', query);
  url.searchParams.set('per_page', '12');
  url.searchParams.set('content_filter', 'high');
  url.searchParams.set('orientation', 'landscape');

  imageStats.unsplashSearches += 1;

  const response = await fetch(url, {
    headers: {
      Authorization: `Client-ID ${key}`,
      'Accept-Version': 'v1'
    }
  });

  const remaining = response.headers.get('x-ratelimit-remaining');

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`Unsplash ${response.status}: ${text || response.statusText}`);
  }

  const data = await response.json();
  const results = (data.results || []).map(item => ({
    provider: 'Unsplash',
    url: item.urls?.regular,
    fullUrl: item.urls?.full || item.urls?.regular,
    thumb: item.urls?.small,
    alt: item.alt_description || item.description || query,
    creator: item.user?.name || 'Unknown',
    creatorUrl: item.user?.links?.html ? `${item.user.links.html}?utm_source=ai_booklet_designs&utm_medium=referral` : '',
    source: 'Unsplash',
    sourceUrl: item.links?.html ? `${item.links.html}?utm_source=ai_booklet_designs&utm_medium=referral` : '',
    license: 'Unsplash License',
    licenseUrl: 'https://unsplash.com/license',
    attribution: item.user?.name ? `Photo by ${item.user.name} on Unsplash` : ''
  })).filter(item => item.url);

  imageStats.unsplashImages += results.length;
  console.log(`[Unsplash] ${results.length} images for "${query}"; rate limit remaining: ${remaining ?? 'unknown'}.`);

  return results;
}

export async function fetchPexels(query) {
  const key = process.env.PEXELS_API_KEY;
  if (!key) return [];

  const url = new URL('https://api.pexels.com/v1/search');
  url.searchParams.set('query', query);
  url.searchParams.set('per_page', '12');
  url.searchParams.set('orientation', 'landscape');

  imageStats.pexelsSearches += 1;

  const data = await fetchJson(url, {
    headers: {
      Authorization: key
    }
  });

  const results = (data.photos || []).map(item => ({
    provider: 'Pexels',
    url: item.src?.large2x || item.src?.large || item.src?.medium,
    fullUrl: item.src?.original || item.src?.large2x,
    thumb: item.src?.small,
    alt: item.alt || query,
    creator: item.photographer || 'Unknown',
    creatorUrl: item.photographer_url || '',
    source: 'Pexels',
    sourceUrl: item.url || '',
    license: 'Pexels License',
    licenseUrl: 'https://www.pexels.com/license/',
    attribution: item.photographer ? `Photo by ${item.photographer} on Pexels` : ''
  })).filter(item => item.url);

  imageStats.pexelsImages += results.length;
  console.log(`[Pexels] ${results.length} images for "${query}".`);

  return results;
}

export async function fetchPixabay(query) {
  const key = process.env.PIXABAY_API_KEY;
  if (!key) return [];

  const url = new URL('https://pixabay.com/api/');
  url.searchParams.set('key', key);
  url.searchParams.set('q', query);
  url.searchParams.set('image_type', 'photo');
  url.searchParams.set('per_page', '12');
  url.searchParams.set('safesearch', 'true');

  imageStats.pixabaySearches += 1;

  const data = await fetchJson(url);
  const results = (data.hits || []).map(item => ({
    provider: 'Pixabay',
    url: item.largeImageURL || item.webformatURL,
    fullUrl: item.imageURL || item.largeImageURL,
    thumb: item.previewURL,
    alt: item.tags || query,
    creator: item.user || 'Unknown',
    creatorUrl: item.pageURL || '',
    source: 'Pixabay',
    sourceUrl: item.pageURL || '',
    license: 'Pixabay License',
    licenseUrl: 'https://pixabay.com/service/license-summary/',
    attribution: item.user ? `Image by ${item.user} on Pixabay` : ''
  })).filter(item => item.url);

  imageStats.pixabayImages += results.length;
  console.log(`[Pixabay] ${results.length} images for "${query}".`);

  return results;
}

export async function fetchOpenverse(query) {
  const url = new URL('https://api.openverse.org/v1/images/');
  url.searchParams.set('q', query);
  url.searchParams.set('page_size', '12');
  url.searchParams.set('license_type', 'commercial');
  url.searchParams.set('mature', 'false');

  imageStats.openverseSearches += 1;

  const data = await fetchJson(url, {
    headers: {
      'User-Agent': 'AI-Booklet-Designs/4.0 (https://github.com/aleksvilly/ai-booklet-designs)'
    }
  });

  const results = (data.results || []).map(item => ({
    provider: item.source || item.provider || 'Openverse',
    url: item.url || item.thumbnail,
    fullUrl: item.url || item.thumbnail,
    thumb: item.thumbnail,
    alt: item.title || query,
    creator: item.creator || 'Unknown',
    creatorUrl: item.creator_url || item.foreign_landing_url || '',
    source: item.source || item.provider || 'Openverse',
    sourceUrl: item.foreign_landing_url || item.url || '',
    license: item.license ? `${item.license.toUpperCase()}${item.license_version ? ` ${item.license_version}` : ''}` : 'Open license',
    licenseUrl: item.license_url || item.foreign_landing_url || '',
    attribution: item.attribution || ''
  })).filter(item => item.url);

  imageStats.openverseImages += results.length;
  console.log(`[Openverse] ${results.length} images for "${query}".`);

  return results;
}

export async function fetchWikimedia(query) {
  const url = new URL('https://commons.wikimedia.org/w/api.php');
  url.searchParams.set('action', 'query');
  url.searchParams.set('generator', 'search');
  url.searchParams.set('gsrsearch', query);
  url.searchParams.set('gsrnamespace', '6');
  url.searchParams.set('gsrlimit', '12');
  url.searchParams.set('prop', 'imageinfo|info');
  url.searchParams.set('iiprop', 'url|extmetadata');
  url.searchParams.set('inprop', 'url');
  url.searchParams.set('format', 'json');
  url.searchParams.set('origin', '*');

  imageStats.wikimediaSearches += 1;

  const data = await fetchJson(url);
  const pages = Object.values(data.query?.pages || {});

  const results = pages.map(page => {
    const info = page.imageinfo?.[0];
    const meta = info?.extmetadata || {};
    return {
      provider: 'Wikimedia Commons',
      url: info?.url,
      fullUrl: info?.url,
      thumb: info?.thumburl || info?.url,
      alt: meta.ObjectName?.value || page.title || query,
      creator: meta.Artist?.value?.replace(/<[^>]+>/g, '') || 'Unknown',
      creatorUrl: page.fullurl || '',
      source: 'Wikimedia Commons',
      sourceUrl: page.fullurl || info?.descriptionurl || '',
      license: meta.LicenseShortName?.value || 'Open license',
      licenseUrl: page.fullurl || '',
      attribution: page.title || ''
    };
  }).filter(item => item.url);

  imageStats.wikimediaImages += results.length;
  console.log(`[Wikimedia] ${results.length} images for "${query}".`);

  return results;
}

export async function searchProvider(provider, query) {
  switch (provider) {
    case 'unsplash':
      return fetchUnsplash(query);
    case 'pexels':
      return fetchPexels(query);
    case 'pixabay':
      return fetchPixabay(query);
    case 'openverse':
      return fetchOpenverse(query);
    case 'wikimedia':
      return fetchWikimedia(query);
    default:
      return [];
  }
}

export async function findBestImage(options = {}) {
  const {
    topic = '',
    category = '',
    mood = '',
    styleFamily = '',
    pageType = 'default',
    providerMode = 'general'
  } = options;

  const providers = PROVIDER_ORDER[providerMode] || PROVIDER_ORDER.general;
  const queries = buildQueryChain({ topic, category, mood, styleFamily, pageType, allowAbstract: true });

  const tried = [];

  for (const query of queries) {
    for (const provider of providers) {
      tried.push(`${provider}:${query}`);
      try {
        const results = await searchProvider(provider, query);
        if (results?.length) {
          return {
            image: results[0],
            tried,
            query,
            provider,
            strategy: 'single'
          };
        }
      } catch (error) {
        console.warn(`Image search failed for "${query}": ${error.message}`);
      }
    }
  }

  return {
    image: null,
    tried,
    query: null,
    provider: null,
    strategy: 'none'
  };
}

export async function findGridImages(options = {}) {
  const {
    topic = '',
    category = '',
    mood = '',
    styleFamily = '',
    providerMode = 'general',
    desiredCount = 12
  } = options;

  const providers = PROVIDER_ORDER[providerMode] || PROVIDER_ORDER.general;
  const pool = buildGridQueryPool({ topic, category, mood, styleFamily });
  const images = [];
  const seen = new Set();
  const tried = [];

  for (const query of pool) {
    for (const provider of providers) {
      tried.push(`${provider}:${query}`);
      try {
        const results = await searchProvider(provider, query);
        for (const item of results) {
          if (!item.url || seen.has(item.url)) continue;
          seen.add(item.url);
          images.push(item);
          if (images.length >= desiredCount) {
            return { images, tried, strategy: 'grid-pool' };
          }
        }
      } catch (error) {
        console.warn(`Grid image search failed for "${query}": ${error.message}`);
      }
    }
  }

  return { images, tried, strategy: 'grid-pool' };
}

export function buildDecorativeFallbackPageArt({ mood = '', styleFamily = '' } = {}) {
  const resolved = detectMood({ mood, styleFamily });
  switch (resolved) {
    case 'tech':
      return { variant: 'gradient-grid', palette: 'tech' };
    case 'archive':
      return { variant: 'paper-lines', palette: 'mono' };
    case 'playful':
      return { variant: 'cutout-shapes', palette: 'playful' };
    case 'brutalist':
      return { variant: 'hard-geometry', palette: 'concrete' };
    case 'surreal':
      return { variant: 'mist-orbit', palette: 'surreal' };
    case 'cinematic':
      return { variant: 'light-beam', palette: 'dark' };
    default:
      return { variant: 'soft-gradient', palette: 'minimal' };
  }
}
