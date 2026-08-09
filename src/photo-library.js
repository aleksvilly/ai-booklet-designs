const PHOTO_DB_NAME = 'ai-booklet-photo-library-v1';
const PHOTO_STORE_NAME = 'photos';
const SEARCH_LIMIT = 18;

function openPhotoDatabase() {
  return new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) {
      reject(new Error('Local photo storage is not supported in this browser.'));
      return;
    }

    const request = indexedDB.open(PHOTO_DB_NAME, 1);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(PHOTO_STORE_NAME)) {
        database.createObjectStore(PHOTO_STORE_NAME, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Could not open local photo storage.'));
  });
}

async function withPhotoStore(mode, operation) {
  const database = await openPhotoDatabase();
  try {
    return await new Promise((resolve, reject) => {
      const transaction = database.transaction(PHOTO_STORE_NAME, mode);
      const store = transaction.objectStore(PHOTO_STORE_NAME);
      const request = operation(store);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error('Photo storage failed.'));
    });
  } finally {
    database.close();
  }
}

export function storeLocalPhoto(record) {
  return withPhotoStore('readwrite', store => store.put(record));
}

export function readLocalPhoto(id) {
  return withPhotoStore('readonly', store => store.get(id));
}

function canvasBlob(canvas, type, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('Could not prepare this image.')), type, quality);
  });
}

export async function prepareLocalPhoto(file) {
  if (!file?.type?.startsWith('image/')) throw new Error('Choose an image file.');
  if (file.size > 25 * 1024 * 1024) throw new Error('The image is too large. Maximum file size is 25 MB.');

  const source = await createImageBitmap(file);
  const maxSide = 2200;
  const scale = Math.min(1, maxSide / Math.max(source.width, source.height));
  const width = Math.max(1, Math.round(source.width * scale));
  const height = Math.max(1, Math.round(source.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  context.drawImage(source, 0, 0, width, height);
  source.close();

  let blob;
  try {
    blob = await canvasBlob(canvas, 'image/webp', .88);
  } catch {
    blob = await canvasBlob(canvas, 'image/jpeg', .9);
  }

  const id = `local-${Date.now()}-${crypto.randomUUID?.() || Math.random().toString(36).slice(2)}`;
  return {
    record: { id, blob, name: file.name, type: blob.type, width, height, createdAt: Date.now() },
    image: {
      id,
      localBlobId: id,
      url: '',
      alt: file.name.replace(/\.[^.]+$/, '') || 'Local photo',
      creator: 'Your upload',
      source: 'This device',
      license: 'Private upload'
    }
  };
}

export function cleanPhotoMetadataText(value = '', fallback = '') {
  const entities = {
    amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' '
  };
  const decoded = String(value || '').replace(/&(#x?[0-9a-f]+|amp|lt|gt|quot|apos|nbsp);/gi, (match, entity) => {
    const lower = entity.toLowerCase();
    if (lower[0] === '#') {
      const hexadecimal = lower[1] === 'x';
      const codePoint = Number.parseInt(lower.slice(hexadecimal ? 2 : 1), hexadecimal ? 16 : 10);
      return Number.isFinite(codePoint) ? String.fromCodePoint(codePoint) : ' ';
    }
    return entities[lower] || ' ';
  });
  const cleaned = decoded
    .replace(/<(script|style|template)\b[^>]*>[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/[\u0000-\u001f\u007f-\u009f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return cleaned.slice(0, 240) || fallback;
}

const text = cleanPhotoMetadataText;

function httpsUrl(value = '') {
  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol) ? url.href : '';
  } catch {
    return '';
  }
}

async function searchOpenverse(query, signal) {
  const url = new URL('https://api.openverse.org/v1/images/');
  url.searchParams.set('q', query);
  url.searchParams.set('page_size', String(SEARCH_LIMIT));
  url.searchParams.set('mature', 'false');
  const response = await fetch(url, { signal, headers: { Accept: 'application/json' } });
  if (!response.ok) throw new Error('Openverse search is temporarily unavailable.');
  const data = await response.json();
  return (data.results || []).map(photo => ({
    id: `openverse-${photo.id}`,
    url: httpsUrl(photo.url),
    thumbnailUrl: httpsUrl(photo.thumbnail || photo.url),
    alt: text(photo.title, 'Openverse image'),
    creator: text(photo.creator, 'Unknown creator'),
    creatorUrl: httpsUrl(photo.creator_url),
    source: 'Openverse',
    sourceUrl: httpsUrl(photo.foreign_landing_url || photo.detail_url),
    license: text([photo.license, photo.license_version].filter(Boolean).join(' '), 'Open licence'),
    licenseUrl: httpsUrl(photo.license_url)
  })).filter(photo => photo.url && photo.thumbnailUrl);
}

async function searchWikimedia(query, signal) {
  const url = new URL('https://commons.wikimedia.org/w/api.php');
  const params = {
    action: 'query', format: 'json', origin: '*', generator: 'search',
    gsrsearch: `filetype:bitmap ${query}`, gsrnamespace: '6', gsrlimit: String(SEARCH_LIMIT),
    prop: 'imageinfo', iiprop: 'url|extmetadata', iiurlwidth: '720'
  };
  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));
  const response = await fetch(url, { signal, headers: { Accept: 'application/json' } });
  if (!response.ok) throw new Error('Wikimedia search is temporarily unavailable.');
  const data = await response.json();
  return Object.values(data.query?.pages || {}).map(page => {
    const info = page.imageinfo?.[0] || {};
    const metadata = info.extmetadata || {};
    const pageUrl = `https://commons.wikimedia.org/?curid=${page.pageid}`;
    return {
      id: `wikimedia-${page.pageid}`,
      url: httpsUrl(info.thumburl || info.url),
      thumbnailUrl: httpsUrl(info.thumburl || info.url),
      alt: text(metadata.ImageDescription?.value, text(page.title?.replace(/^File:/, ''), 'Wikimedia image')),
      creator: text(metadata.Artist?.value, 'Wikimedia contributor'),
      creatorUrl: httpsUrl(metadata.Credit?.value),
      source: 'Wikimedia Commons',
      sourceUrl: pageUrl,
      license: text(metadata.LicenseShortName?.value, 'See source'),
      licenseUrl: httpsUrl(metadata.LicenseUrl?.value) || pageUrl
    };
  }).filter(photo => photo.url);
}

export async function searchPhotoProviders(query, provider = 'all', signal) {
  const cleanQuery = String(query || '').trim().slice(0, 120);
  if (cleanQuery.length < 2) throw new Error('Enter at least two characters.');

  const searches = [];
  if (provider === 'all' || provider === 'openverse') searches.push(searchOpenverse(cleanQuery, signal));
  if (provider === 'all' || provider === 'wikimedia') searches.push(searchWikimedia(cleanQuery, signal));
  const settled = await Promise.allSettled(searches);
  const results = settled.flatMap(result => result.status === 'fulfilled' ? result.value : []);
  if (!results.length && settled.every(result => result.status === 'rejected')) {
    throw new Error('Photo search is temporarily unavailable. Try a URL or local upload.');
  }
  return results.slice(0, provider === 'all' ? SEARCH_LIMIT * 2 : SEARCH_LIMIT);
}

export function validateRemotePhotoUrl(value = '') {
  const url = httpsUrl(value);
  if (!url) throw new Error('Enter a valid http or https image URL.');
  return url;
}

export function testRemotePhoto(url) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const timer = window.setTimeout(() => {
      image.src = '';
      reject(new Error('The image took too long to load.'));
    }, 12000);
    image.onload = () => {
      window.clearTimeout(timer);
      resolve({ width: image.naturalWidth, height: image.naturalHeight });
    };
    image.onerror = () => {
      window.clearTimeout(timer);
      reject(new Error('This URL does not return a usable image.'));
    };
    image.src = url;
  });
}
