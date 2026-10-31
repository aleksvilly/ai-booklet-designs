// Gift photo storage for ai-booklet-designs.
//
// POST   /photos    upload one image (WebP, JPEG or PNG, max 3 MB) from an
//                   allowed site origin; returns { id, url }.
// GET    /p/<id>    serve a stored image.
// DELETE /p/<id>    remove an image; requires the ADMIN_TOKEN secret.
//
// Photos live in Workers KV and expire automatically. When the free KV write
// quota is exhausted, uploads fail with 503 instead of costing money.

const MAX_BYTES = 3 * 1024 * 1024;
const ID_PATTERN = /^[A-Za-z0-9_-]{22}$/;
const DAY_SECONDS = 24 * 60 * 60;

function allowedOrigins(env) {
  return String(env.ALLOWED_ORIGINS || '').split(',').map(origin => origin.trim()).filter(Boolean);
}

function originAllowed(origin, env) {
  if (!origin) return false;
  return allowedOrigins(env).some(allowed => {
    if (allowed.endsWith(':*')) return origin.startsWith(allowed.slice(0, -1));
    return origin === allowed;
  });
}

function corsHeaders(request, env) {
  const origin = request.headers.get('Origin') || '';
  return originAllowed(origin, env)
    ? {
        'Access-Control-Allow-Origin': origin,
        'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Max-Age': '86400',
        Vary: 'Origin'
      }
    : { Vary: 'Origin' };
}

function json(body, status, headers = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...headers }
  });
}

// Trust the bytes, not the declared Content-Type.
function sniffImageType(bytes) {
  if (bytes.length > 12
    && bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46
    && bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50) return 'image/webp';
  if (bytes.length > 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg';
  if (bytes.length > 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return 'image/png';
  return '';
}

function randomId() {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function uploadPhoto(request, env, cors) {
  if (!originAllowed(request.headers.get('Origin') || '', env)) {
    return json({ error: 'origin-not-allowed' }, 403, cors);
  }
  const declaredLength = Number(request.headers.get('Content-Length') || 0);
  if (declaredLength > MAX_BYTES) return json({ error: 'too-large' }, 413, cors);

  const bytes = new Uint8Array(await request.arrayBuffer());
  if (!bytes.length) return json({ error: 'empty' }, 400, cors);
  if (bytes.length > MAX_BYTES) return json({ error: 'too-large' }, 413, cors);
  const type = sniffImageType(bytes);
  if (!type) return json({ error: 'not-an-image' }, 415, cors);

  const id = randomId();
  const ttlDays = Math.max(1, Number(env.PHOTO_TTL_DAYS || 365));
  try {
    await env.GIFT_PHOTOS.put(`p/${id}`, bytes, {
      expirationTtl: ttlDays * DAY_SECONDS,
      metadata: { type, size: bytes.length, createdAt: Date.now() }
    });
  } catch (error) {
    // Most likely the free daily write quota; never fall back to anything billable.
    console.error('KV put failed', error);
    return json({ error: 'storage-full' }, 503, cors);
  }

  const url = new URL(`/p/${id}`, request.url).toString();
  return json({ id, url }, 201, cors);
}

async function servePhoto(id, env) {
  if (!ID_PATTERN.test(id)) return new Response('Not found', { status: 404 });
  const { value, metadata } = await env.GIFT_PHOTOS.getWithMetadata(`p/${id}`, { type: 'arrayBuffer' });
  if (!value) return new Response('Not found', { status: 404, headers: { 'Cache-Control': 'no-store' } });
  return new Response(value, {
    headers: {
      'Content-Type': metadata?.type || 'application/octet-stream',
      'Cache-Control': 'public, max-age=31536000, immutable',
      'X-Content-Type-Options': 'nosniff',
      'Content-Security-Policy': "default-src 'none'; sandbox",
      'Access-Control-Allow-Origin': '*',
      'Cross-Origin-Resource-Policy': 'cross-origin'
    }
  });
}

async function deletePhoto(request, id, env) {
  const expected = env.ADMIN_TOKEN ? `Bearer ${env.ADMIN_TOKEN}` : '';
  if (!expected || request.headers.get('Authorization') !== expected) return json({ error: 'forbidden' }, 403);
  if (!ID_PATTERN.test(id)) return json({ error: 'not-found' }, 404);
  await env.GIFT_PHOTOS.delete(`p/${id}`);
  return json({ deleted: id }, 200);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const cors = corsHeaders(request, env);

    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    if (url.pathname === '/photos' && request.method === 'POST') return uploadPhoto(request, env, cors);

    const match = url.pathname.match(/^\/p\/([^/]+)$/);
    if (match && request.method === 'GET') return servePhoto(match[1], env);
    if (match && request.method === 'DELETE') return deletePhoto(request, match[1], env);

    return json({ error: 'not-found' }, 404, cors);
  }
};
