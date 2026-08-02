const loadedFontRequests = new Set();

export function escapeHtml(value = '') {
  return String(value).replace(/[&<>'"]/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  })[char]);
}

export function safeUrl(value = '') {
  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol) ? url.href : '#';
  } catch {
    return '#';
  }
}

export function safeClass(value = '') {
  return String(value).toLowerCase().replace(/[^a-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '');
}

export function safeFontName(value = 'DM Sans') {
  const cleaned = String(value).replace(/[^a-zA-Z0-9 \-]+/g, '').trim();
  return cleaned || 'DM Sans';
}

export function fontStack(value = 'DM Sans') {
  const family = safeFontName(value);
  const serif = /serif|garamond|baskerville|lora|spectral|fraunces|prata|cinzel|cardo|merriweather|gloock|bodoni|yeseva|abril/i.test(family);
  const mono = /mono|code|vt323/i.test(family);
  return `"${family}", ${mono ? 'monospace' : serif ? 'serif' : 'sans-serif'}`;
}

export function safeRotation(value) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(-12, Math.min(12, number)) : 0;
}

export function safeImagePosition(value = 'center') {
  const allowed = new Set(['center', 'center top', 'center bottom', 'left center', 'right center']);
  return allowed.has(value) ? value : 'center';
}

export function applyPalette(node, palette = []) {
  const fallback = ['#f2eee4', '#ed5d40', '#234fde', '#151515'];
  [...fallback].map((color, index) => palette[index] || color).forEach((color, index) => {
    node.style.setProperty(`--c${index + 1}`, color);
  });
}

export function designClasses(item) {
  const dna = item.designDna || {};
  return [
    `style-${safeClass(dna.styleFamily || item.layout || 'editorial')}`,
    `color-${safeClass(dna.colorMode || 'default')}`,
    `archetype-${safeClass(dna.archetype || 'booklet')}`,
    `rhythm-${safeClass(dna.visualRhythm || 'balanced')}`,
    `shape-${safeClass(dna.shapeLanguage || 'mixed')}`,
    `cover-system-${safeClass(dna.coverArchetype || 'type-only')}`,
    `font-strategy-${safeClass(dna.fontStrategy || 'disciplined-pair')}`
  ].join(' ');
}

export function fontsFor(item) {
  const dna = item.designDna || {};
  const fonts = Array.isArray(dna.fontPalette) ? dna.fontPalette : [];
  return [...new Set(fonts.map(safeFontName).filter(Boolean))].slice(0, 20);
}

export function loadGoogleFonts(families, requestName = 'booklet') {
  const cleanFamilies = [...new Set((families || []).map(safeFontName).filter(Boolean))].slice(0, 24);
  if (!cleanFamilies.length) return;

  const key = cleanFamilies.slice().sort().join('|');
  if (loadedFontRequests.has(key)) return;
  loadedFontRequests.add(key);

  const url = new URL('https://fonts.googleapis.com/css2');
  cleanFamilies.forEach(family => url.searchParams.append('family', family));
  url.searchParams.set('display', 'swap');

  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = url.href;
  link.dataset.fontRequest = requestName;
  document.head.append(link);
}

export function setFontVariables(node, item, page = null) {
  const fonts = fontsFor(item);
  const pageFont = page?.fontFamily || fonts[0] || 'DM Sans';
  const display = fonts[0] || pageFont;
  const body = fonts[1] || fonts[0] || 'DM Sans';
  const accent = fonts[2] || fonts[0] || 'IBM Plex Mono';
  const cover = fonts[3] || fonts[0] || 'Playfair Display';

  node.style.setProperty('--font-page', fontStack(pageFont));
  node.style.setProperty('--font-display', fontStack(display));
  node.style.setProperty('--font-body', fontStack(body));
  node.style.setProperty('--font-accent', fontStack(accent));
  node.style.setProperty('--font-cover', fontStack(cover));
}

export function coverTitle(title = '') {
  const words = String(title).split(' ').filter(Boolean);
  return words.length < 3 ? title : `${words.slice(0, -1).join(' ')}\n${words.at(-1)}`;
}

export function imageCredit(image, compact = false) {
  const creator = escapeHtml(image.creator || 'Creator');
  const source = escapeHtml(image.source || 'Source');
  const creatorUrl = safeUrl(image.creatorUrl || image.sourceUrl);
  const sourceUrl = safeUrl(image.sourceUrl || image.creatorUrl);
  const licenseUrl = safeUrl(image.licenseUrl || image.sourceUrl);
  const license = escapeHtml(image.license || 'Licence');
  if (compact) {
    return `<a href="${creatorUrl}" target="_blank" rel="noopener">${creator}</a> / <a href="${sourceUrl}" target="_blank" rel="noopener">${source}</a>`;
  }
  return `© <a href="${creatorUrl}" target="_blank" rel="noopener">${creator}</a> · <a href="${sourceUrl}" target="_blank" rel="noopener">${source}</a> · <a href="${licenseUrl}" target="_blank" rel="noopener">${license}</a>`;
}

export function nextPaint() {
  return new Promise(resolve => {
    requestAnimationFrame(() => requestAnimationFrame(resolve));
  });
}

export function promiseWithin(promise, timeout, message) {
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => reject(new Error(message)), timeout);
    Promise.resolve(promise).then(
      value => {
        window.clearTimeout(timer);
        resolve(value);
      },
      error => {
        window.clearTimeout(timer);
        reject(error);
      }
    );
  });
}

export function averageCanvasEdgeColor(canvas) {
  try {
    const context = canvas.getContext('2d', { willReadFrequently: true });
    const insetX = Math.max(1, Math.floor(canvas.width * .015));
    const insetY = Math.max(1, Math.floor(canvas.height * .015));
    const points = [
      [insetX, insetY],
      [canvas.width - insetX - 1, insetY],
      [insetX, canvas.height - insetY - 1],
      [canvas.width - insetX - 1, canvas.height - insetY - 1]
    ];
    const totals = points.reduce((sum, [x, y]) => {
      const pixel = context.getImageData(x, y, 1, 1).data;
      return [sum[0] + pixel[0], sum[1] + pixel[1], sum[2] + pixel[2]];
    }, [0, 0, 0]);
    return totals.map(value => Math.round(value / points.length));
  } catch {
    return [255, 255, 255];
  }
}

export async function copyText(text) {
  if (window.isSecureContext && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Some mobile browsers expose the API but still deny clipboard access.
    }
  }

  const input = document.createElement('textarea');
  input.value = text;
  input.readOnly = true;
  input.setAttribute('aria-hidden', 'true');
  input.style.position = 'fixed';
  input.style.left = '-9999px';
  input.style.top = '0';
  document.body.append(input);
  input.focus();
  input.select();
  input.setSelectionRange(0, input.value.length);

  let copied = false;
  try {
    copied = document.execCommand('copy');
  } catch {
    copied = false;
  }
  input.remove();
  return copied;
}

export function resolveRootUrl(relativePath = '') {
  const cleanPath = relativePath.replace(/^\.\//, '').replace(/^\//, '');
  const canonical = document.querySelector('link[rel="canonical"]')?.getAttribute('href');
  if (canonical) {
    try {
      const url = new URL(canonical);
      const basePath = url.pathname.endsWith('/') ? url.pathname : url.pathname + '/';
      return `${basePath}${cleanPath}`;
    } catch {
      // Fallback below
    }
  }
  const base = window.BASE_URL || '/ai-booklet-designs';
  const cleanBase = base.endsWith('/') ? base.slice(0, -1) : base;
  return `${cleanBase}/${cleanPath}`;
}
