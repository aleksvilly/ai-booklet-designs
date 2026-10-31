import { resolveRootUrl, safeImageUrl } from './utils.js';
import { editorStateFor } from './editor.js';
import { readLocalPhoto, shrinkPhotoBlob } from './photo-library.js';
import { GIFT_PHOTO_API } from './config.js';

// A gift link carries the whole gift in the URL fragment, which browsers never
// send to a server: template id, language, name and the editor state.
// Format: #gift=<z|j><base64url>, where z = deflate-raw JSON and j = plain JSON.
export const GIFT_HASH_PREFIX = '#gift=';
const MAX_ENCODED_LENGTH = 60000;
const MAX_NAME_LENGTH = 40;
const UPLOAD_CACHE_KEY = 'ai-booklet-gift-uploads-v1';

function toBase64Url(bytes) {
  let binary = '';
  bytes.forEach(byte => { binary += String.fromCharCode(byte); });
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(value) {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(base64 + '='.repeat((4 - (base64.length % 4)) % 4));
  return Uint8Array.from(binary, character => character.charCodeAt(0));
}

async function streamBytes(bytes, transform) {
  const stream = new Blob([bytes]).stream().pipeThrough(transform);
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

async function encodePayload(payload) {
  const bytes = new TextEncoder().encode(JSON.stringify(payload));
  if (typeof CompressionStream === 'function') {
    return `z${toBase64Url(await streamBytes(bytes, new CompressionStream('deflate-raw')))}`;
  }
  return `j${toBase64Url(bytes)}`;
}

async function decodePayload(encoded) {
  const bytes = fromBase64Url(encoded.slice(1));
  if (encoded[0] === 'z') {
    if (typeof DecompressionStream !== 'function') throw new Error('This browser cannot open compressed gift links.');
    return JSON.parse(new TextDecoder().decode(await streamBytes(bytes, new DecompressionStream('deflate-raw'))));
  }
  if (encoded[0] === 'j') return JSON.parse(new TextDecoder().decode(bytes));
  throw new Error('Unknown gift link format.');
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function shareableImage(image) {
  return isPlainObject(image) && !image.localBlobId && safeImageUrl(image.url || '') !== '#'
    && !String(image.url).startsWith('blob:');
}

// Keeps only what can travel in a link: device-local uploads stay behind.
function shareableState(state) {
  let skippedPhotos = 0;
  const pages = {};
  Object.entries(state?.pages || {}).forEach(([key, page]) => {
    if (!isPlainObject(page)) return;
    const next = { ...page };
    if (Array.isArray(page.images)) {
      next.images = page.images.filter(shareableImage);
      skippedPhotos += page.images.length - next.images.length;
      if (Number.isFinite(Number(next.imageCount))) next.imageCount = Math.min(Number(next.imageCount), next.images.length);
    }
    pages[key] = next;
  });
  return {
    state: {
      version: state?.version || 3,
      pageCount: state?.pageCount ?? null,
      booklet: isPlainObject(state?.booklet) ? state.booklet : {},
      spreads: isPlainObject(state?.spreads) ? state.spreads : {},
      pages,
      photoLibrary: []
    },
    skippedPhotos
  };
}

export function giftPhotoUploadsEnabled() {
  return Boolean(GIFT_PHOTO_API);
}

function localPhotosIn(state) {
  return Object.values(state?.pages || {})
    .flatMap(page => (Array.isArray(page?.images) ? page.images : []))
    .filter(image => image?.localBlobId);
}

export function localPhotoCount(item) {
  return new Set(localPhotosIn(editorStateFor(item)).map(image => image.localBlobId)).size;
}

function readUploadCache() {
  try {
    return JSON.parse(localStorage.getItem(UPLOAD_CACHE_KEY) || '{}') || {};
  } catch {
    return {};
  }
}

function writeUploadCache(cache) {
  try {
    localStorage.setItem(UPLOAD_CACHE_KEY, JSON.stringify(cache));
  } catch {
    // Without the cache a re-send simply uploads again.
  }
}

export class GiftPhotoUploadError extends Error {
  constructor(code) {
    super(`Gift photo upload failed: ${code}`);
    this.code = code;
  }
}

async function uploadLocalPhoto(localBlobId) {
  const record = await readLocalPhoto(localBlobId);
  if (!record?.blob) throw new GiftPhotoUploadError('missing-local-photo');
  const blob = await shrinkPhotoBlob(record.blob);
  let response;
  try {
    response = await fetch(`${GIFT_PHOTO_API.replace(/\/$/, '')}/photos`, { method: 'POST', body: blob });
  } catch {
    throw new GiftPhotoUploadError('network');
  }
  const result = await response.json().catch(() => ({}));
  if (!response.ok || !result.url) throw new GiftPhotoUploadError(result.error || `http-${response.status}`);
  return result.url;
}

// Uploads each device-local photo once (cached across sends) and returns a
// copy of the state where those photos point at their uploaded URLs.
async function stateWithUploadedPhotos(state, onProgress) {
  const ids = [...new Set(localPhotosIn(state).map(image => image.localBlobId))];
  const cache = readUploadCache();
  let done = 0;
  for (const id of ids) {
    onProgress?.(done, ids.length);
    if (!cache[id]) {
      cache[id] = await uploadLocalPhoto(id);
      writeUploadCache(cache);
    }
    done += 1;
  }
  onProgress?.(done, ids.length);

  const copy = JSON.parse(JSON.stringify(state || {}));
  Object.values(copy.pages || {}).forEach(page => {
    if (!Array.isArray(page?.images)) return;
    page.images = page.images.map(image => {
      if (!image?.localBlobId || !cache[image.localBlobId]) return image;
      const { localBlobId, ...rest } = image;
      return { ...rest, url: cache[localBlobId], source: 'Gift photo', creator: 'Gift sender' };
    });
  });
  return copy;
}

export async function giftShareLink(item, { uploadPhotos = false, onProgress } = {}) {
  const editorState = uploadPhotos && giftPhotoUploadsEnabled()
    ? await stateWithUploadedPhotos(editorStateFor(item), onProgress)
    : editorStateFor(item);
  const { state, skippedPhotos } = shareableState(editorState);
  const encoded = await encodePayload({
    v: 1,
    t: item.gift.template,
    l: item.gift.lang,
    n: item.gift.name,
    s: state
  });
  const page = new URL(resolveRootUrl(item.gift.lang === 'ru' ? 'ru/' : ''), window.location.origin);
  page.hash = `${GIFT_HASH_PREFIX.slice(1)}${encoded}`;
  return { url: page.toString(), skippedPhotos, tooLong: encoded.length > MAX_ENCODED_LENGTH };
}

export async function readGiftLink(hash = window.location.hash) {
  if (!hash.startsWith(GIFT_HASH_PREFIX)) return null;
  const encoded = hash.slice(GIFT_HASH_PREFIX.length);
  if (!encoded || encoded.length > MAX_ENCODED_LENGTH) throw new Error('This gift link is damaged or too long.');
  const payload = await decodePayload(encoded);
  if (!isPlainObject(payload) || payload.v !== 1 || typeof payload.t !== 'string') {
    throw new Error('This gift link is not valid.');
  }
  return {
    template: payload.t,
    lang: payload.l === 'ru' ? 'ru' : 'en',
    name: String(payload.n || '').trim().slice(0, MAX_NAME_LENGTH),
    state: shareableState(isPlainObject(payload.s) ? payload.s : {}).state,
    // Stable per link, so a recipient's own edits survive a reload.
    linkId: [...encoded].reduce((hash, character) => Math.imul(hash ^ character.charCodeAt(0), 16777619) >>> 0, 2166136261).toString(36)
  };
}
