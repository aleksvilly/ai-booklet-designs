import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

const fileUrl = new URL('../data/booklets.json', import.meta.url);
const existing = JSON.parse(await readFile(fileUrl, 'utf8'));
const date = process.env.BOOKLET_DATE || new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Europe/Riga', year: 'numeric', month: '2-digit', day: '2-digit'
}).format(new Date());
const requestedCount = Math.max(1, Math.min(6, Number.parseInt(process.env.BOOKLET_COUNT || '3', 10) || 3));
const force = process.env.FORCE_GENERATE === 'true';
const useAi = process.env.USE_AI !== 'false' && Boolean(process.env.OPENAI_API_KEY);
const runId = force ? (process.env.BOOKLET_RUN_ID || `${Date.now()}`) : date;
const alreadyToday = existing.filter(item => item.publishDate === date).length;
const count = force ? requestedCount : Math.max(0, requestedCount - alreadyToday);

if (count === 0) {
  console.log(`${requestedCount} concepts already exist for ${date}. Use force_generate to create more today.`);
  process.exit(0);
}

const audiences = [
  ['the Sailor', 'Sea'], ['the Pilot', 'Aviation'], ['the Architect', 'Architecture'],
  ['the Photographer', 'Photography'], ['the Musician', 'Music'], ['the Gardener', 'Nature'],
  ['the Engineer', 'Engineering'], ['the Traveller', 'Travel'], ['the Astronomer', 'Space'],
  ['the Cyclist', 'Cycling'], ['the Chef', 'Food'], ['the Cinema Lover', 'Cinema'],
  ['the Climber', 'Mountains'], ['the Railway Enthusiast', 'Railways'], ['the Dreamer', 'Abstract'],
  ['the Diver', 'Ocean'], ['the Writer', 'Literature'], ['the Dancer', 'Dance'],
  ['the Collector', 'Collecting'], ['the Scientist', 'Science'], ['the Designer', 'Design']
];

const worlds = [
  ['Maps of Silence', 'routes, empty spaces and the emotional meaning of distance'],
  ['After the Last Light', 'the visual transformation that begins when daylight disappears'],
  ['Machines with a Soul', 'objects shaped by human hands, repetition and memory'],
  ['A Field Guide to Motion', 'speed, balance, direction and the body moving through space'],
  ['Invisible Structures', 'systems that quietly hold the visible world together'],
  ['The Beautiful Unknown', 'discovery, uncertainty and places beyond ordinary scale'],
  ['Fragments of a Ritual', 'tools, gestures and repeated actions that become personal'],
  ['Weather for One Person', 'atmosphere used as a portrait of character and memory'],
  ['The Shape of Waiting', 'pauses, anticipation and moments just before change'],
  ['Night Geometry', 'artificial light, shadow and structures revealed after dark'],
  ['The Archive of Touch', 'materials, surfaces and evidence of human use'],
  ['A Small History of Wonder', 'facts, discoveries and objects that change how a person sees the world']
];

const eraPools = [
  { era: '1960s', styles: [['Swiss international editorial', 'grid'], ['Space-age modernism', 'cinematic'], ['Op-art geometry', 'radical'], ['Pop editorial collage', 'editorial']] },
  { era: '1970s', styles: [['Psychedelic editorial', 'radical'], ['Ecological counterculture', 'editorial'], ['Analogue scientific journal', 'grid'], ['Soft-focus cinematic print', 'cinematic']] },
  { era: '1980s', styles: [['Post-punk zine', 'radical'], ['Memphis geometry', 'editorial'], ['New-wave typography', 'grid'], ['Chrome airbrush futurism', 'cinematic']] },
  { era: '1990s', styles: [['Grunge editorial', 'radical'], ['Rave flyer system', 'grid'], ['Minimal fashion magazine', 'editorial'], ['Early digital collage', 'cinematic']] },
  { era: '2000s', styles: [['Y2K liquid futurism', 'cinematic'], ['Glossy techno editorial', 'grid'], ['Indie magazine collage', 'editorial'], ['Early-web maximalism', 'radical']] },
  { era: '2010s', styles: [['Neo-Swiss digital editorial', 'grid'], ['Luxury minimalism', 'editorial'], ['Glitch culture', 'radical'], ['Cinematic image-first layout', 'cinematic']] },
  { era: '2020–2024', styles: [['Neo-brutalist publishing', 'radical'], ['Layered maximalist collage', 'editorial'], ['Soft 3D surrealism', 'cinematic'], ['Variable-type systems', 'grid']] },
  { era: '2025', styles: [['Human-centred AI collage', 'editorial'], ['Warm digital craft', 'cinematic'], ['Expressive serif minimalism', 'grid'], ['Imperfect tactile systems', 'radical']] },
  { era: '2026', styles: [['Sensory maximalism', 'cinematic'], ['Surreal absurdist storytelling', 'radical'], ['Organic freeform editorial', 'editorial'], ['Local-culture visual identity', 'grid']] }
];

const palettes = [
  ['#efe4cd','#df5537','#247c82','#172527'], ['#161827','#f06449','#55b9ae','#f4e9d8'],
  ['#e9dfca','#b84155','#657a49','#262219'], ['#d8d1c5','#ff5a36','#6c67b7','#171717'],
  ['#1c2b33','#e6b34c','#8d3843','#f0e8d7'], ['#f1e6cc','#ef6b40','#1f8993','#21312e'],
  ['#e9e3ff','#ff784f','#3944bc','#161423'], ['#f4efe5','#adff2f','#ef4a85','#252525']
];

const pageTypes = ['cover', 'full_bleed', 'editorial', 'facts', 'quote', 'timeline', 'collage', 'diagram', 'map', 'closing'];
const layouts = ['minimal', 'split', 'overlap', 'grid', 'full', 'asymmetric', 'vertical', 'archive'];

function seededIndex(seed, size, salt) {
  const hash = createHash('sha256').update(`${seed}:${salt}`).digest();
  return hash.readUInt32BE(0) % size;
}
function slug(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}
function uniqueId(base, additions) {
  let id = base;
  let suffix = 2;
  while (existing.some(item => item.id === id) || additions.some(item => item.id === id)) id = `${base}-${suffix++}`;
  return id;
}
function pageCountFor(seed) {
  return [4, 6, 8, 10, 12][seededIndex(seed, 5, 'page-count')];
}
function fallbackPages({ title, audience, category, subject, seed }) {
  const count = pageCountFor(seed);
  const narrative = [
    ['cover', title, `A visual gift for ${audience}.`, `${category} portrait editorial`],
    ['full_bleed', 'Enter the world', `One image establishes ${subject}.`, `${category} atmospheric landscape`],
    ['facts', 'Three things worth knowing', `Short verified facts make the booklet useful as well as beautiful.`, `${category} archive detail`],
    ['editorial', 'Objects and traces', `Tools, surfaces and small details reveal the person behind the subject.`, `${category} objects close up`],
    ['quote', 'A pause', `One sentence receives an entire page and changes the rhythm.`, ''],
    ['collage', 'Memory in fragments', `Documents, photographs and abstract forms overlap without copying one reference layout.`, `${category} vintage archive`],
    ['timeline', 'Then and now', `A compact timeline connects the history of the subject with the present.`, `${category} historical photograph`],
    ['diagram', 'How it works', `A simple visual explanation turns complexity into a memorable page.`, `${category} technical diagram`],
    ['full_bleed', 'The central image', `The largest composition crosses the fold and becomes the emotional centre.`, `${category} cinematic dramatic`],
    ['editorial', 'A personal chapter', `A page designed to accept the recipient’s name, date or private message.`, `${category} intimate portrait`],
    ['map', 'A route through the subject', `A map, constellation or conceptual path connects the chapters.`, `${category} map illustration`],
    ['closing', 'Continue beyond the page', `The ending stays open and feels written for one person.`, '']
  ];
  return narrative.slice(0, Math.max(4, count - 1)).concat([narrative.at(-1)]).map(([type, pageTitle, body, imageQuery], index) => ({
    type,
    title: index === 0 ? title : pageTitle,
    body,
    imageQuery,
    sourceQuery: type === 'facts' || type === 'timeline' || type === 'diagram' ? `${category} history facts` : '',
    caption: imageQuery ? `Image direction: ${imageQuery}.` : '',
    layout: layouts[seededIndex(`${seed}-${index}`, layouts.length, 'page-layout')]
  }));
}

function aiSchema(itemCount) {
  const page = {
    type: 'object', additionalProperties: false,
    properties: {
      type: { type: 'string', enum: pageTypes },
      title: { type: 'string' }, body: { type: 'string' }, imageQuery: { type: 'string' },
      sourceQuery: { type: 'string' }, caption: { type: 'string' }, layout: { type: 'string', enum: layouts }
    },
    required: ['type','title','body','imageQuery','sourceQuery','caption','layout']
  };
  const booklet = {
    type: 'object', additionalProperties: false,
    properties: {
      title: { type: 'string' }, audience: { type: 'string' }, category: { type: 'string' },
      era: { type: 'string' }, style: { type: 'string' }, layout: { type: 'string', enum: ['grid','editorial','radical','cinematic'] },
      direction: { type: 'string' }, description: { type: 'string' }, format: { type: 'string' },
      palette: { type: 'array', minItems: 4, maxItems: 4, items: { type: 'string' } },
      pages: { type: 'array', minItems: 4, maxItems: 12, items: page }
    },
    required: ['title','audience','category','era','style','layout','direction','description','format','palette','pages']
  };
  return {
    type: 'object', additionalProperties: false,
    properties: { booklets: { type: 'array', minItems: itemCount, maxItems: itemCount, items: booklet } },
    required: ['booklets']
  };
}

async function generateWithAi(itemCount) {
  const recent = existing.slice(0, 18).map(({ title, audience, era, style }) => ({ title, audience, era, style }));
  const prompt = `Create exactly ${itemCount} original gift-booklet concepts for ${date}. Each booklet is designed for a concrete type of person. Vary eras across 1960s–2026 and do not repeat recent combinations. Each booklet must contain 4–12 actual preview pages, with intentionally varied page types and layouts. Some pages may be image-only, some factual, some typographic, some collage, diagram, map, quote or timeline. Use concise English copy. Facts must be stable and sourceQuery must describe what should be verified on Wikipedia. imageQuery must be useful for an open-license image search. Avoid imitating one living designer or copying one existing work. Recent concepts: ${JSON.stringify(recent)}.`;
  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || 'gpt-5.6-luna',
      store: false,
      input: [
        { role: 'system', content: [{ type: 'input_text', text: 'You are an experimental editorial art director and factual gift-book editor. Produce original, production-friendly structured concepts.' }] },
        { role: 'user', content: [{ type: 'input_text', text: prompt }] }
      ],
      text: { format: { type: 'json_schema', name: 'daily_booklets', strict: true, schema: aiSchema(itemCount) } }
    })
  });
  if (!response.ok) throw new Error(`OpenAI ${response.status}: ${await response.text()}`);
  const json = await response.json();
  const text = json.output?.flatMap(item => item.content || []).find(part => part.type === 'output_text')?.text;
  if (!text) throw new Error('OpenAI response contained no output_text.');
  return JSON.parse(text).booklets;
}

function fallbackConcepts(itemCount) {
  const eraStart = seededIndex(runId, eraPools.length, 'era-start');
  const additions = [];
  for (let i = 0; i < itemCount; i += 1) {
    const seed = `${runId}-${i}-${alreadyToday}`;
    const [audience, category] = audiences[seededIndex(seed, audiences.length, 'audience')];
    const [title, subject] = worlds[seededIndex(seed, worlds.length, 'world')];
    const selectedEra = eraPools[(eraStart + i * 3) % eraPools.length];
    const [style, layout] = selectedEra.styles[seededIndex(seed, selectedEra.styles.length, 'style')];
    additions.push({
      title, audience, category, era: selectedEra.era, style, layout,
      direction: `${style} interprets ${subject} with a deliberately varied sequence of image, fact, pause and typographic pages.`,
      description: `A personal gift-booklet for ${audience}, built around ${subject}. References are mixed across several sources so the result feels original rather than like a reskinned template.`,
      format: `A5 / ${pageCountFor(seed)} pages`,
      palette: palettes[seededIndex(seed, palettes.length, 'palette')],
      pages: fallbackPages({ title, audience, category, subject, seed })
    });
  }
  return additions;
}

function normalizeBooklet(item, index, additions) {
  const base = `${slug(item.audience.replace(/^the /, ''))}-${slug(item.title)}-${date}`;
  const id = uniqueId(base, additions);
  const palette = Array.isArray(item.palette) && item.palette.length === 4 ? item.palette : palettes[index % palettes.length];
  const pages = Array.isArray(item.pages) && item.pages.length >= 4 ? item.pages.slice(0, 12) : fallbackPages({
    title: item.title, audience: item.audience, category: item.category, subject: item.description, seed: `${runId}-${index}`
  });
  return { ...item, id, publishDate: date, palette, pages };
}

async function fetchOpenverse(query, seed) {
  const url = new URL('https://api.openverse.org/v1/images/');
  url.searchParams.set('q', query);
  url.searchParams.set('license', 'pdm,cc0,by,by-sa');
  url.searchParams.set('page_size', '12');
  const response = await fetch(url, { headers: { 'User-Agent': 'AI-Booklet-Designs/2.0 (https://github.com/aleksvilly/ai-booklet-designs)' } });
  if (!response.ok) throw new Error(`Openverse ${response.status}`);
  const data = await response.json();
  const results = (data.results || []).filter(item => item.thumbnail && item.foreign_landing_url);
  if (!results.length) return null;
  const item = results[seededIndex(seed, results.length, 'openverse')];
  return {
    url: item.thumbnail,
    fullUrl: item.url || item.thumbnail,
    alt: item.title || query,
    creator: item.creator || 'Unknown creator',
    creatorUrl: item.creator_url || item.foreign_landing_url,
    source: item.source || item.provider || 'Openverse',
    sourceUrl: item.foreign_landing_url,
    license: item.license ? `${item.license.toUpperCase()}${item.license_version ? ` ${item.license_version}` : ''}` : 'See source',
    licenseUrl: item.license_url || item.foreign_landing_url,
    attribution: item.attribution || ''
  };
}

async function fetchUnsplash(query, seed) {
  if (!process.env.UNSPLASH_ACCESS_KEY) return null;
  const url = new URL('https://api.unsplash.com/search/photos');
  url.searchParams.set('query', query);
  url.searchParams.set('per_page', '12');
  url.searchParams.set('content_filter', 'high');
  const response = await fetch(url, { headers: { Authorization: `Client-ID ${process.env.UNSPLASH_ACCESS_KEY}`, 'Accept-Version': 'v1' } });
  if (!response.ok) throw new Error(`Unsplash ${response.status}`);
  const data = await response.json();
  if (!data.results?.length) return null;
  const item = data.results[seededIndex(seed, data.results.length, 'unsplash')];
  return {
    url: item.urls.regular,
    fullUrl: item.urls.full,
    alt: item.alt_description || item.description || query,
    creator: item.user.name,
    creatorUrl: `${item.user.links.html}?utm_source=ai_booklet_designs&utm_medium=referral`,
    source: 'Unsplash',
    sourceUrl: `${item.links.html}?utm_source=ai_booklet_designs&utm_medium=referral`,
    license: 'Unsplash License',
    licenseUrl: 'https://unsplash.com/license',
    attribution: `Photo by ${item.user.name} on Unsplash`
  };
}

async function findWikipediaSource(query) {
  const url = new URL('https://en.wikipedia.org/w/rest.php/v1/search/page');
  url.searchParams.set('q', query);
  url.searchParams.set('limit', '1');
  const response = await fetch(url, { headers: { 'User-Agent': 'AI-Booklet-Designs/2.0 (https://github.com/aleksvilly/ai-booklet-designs)' } });
  if (!response.ok) return null;
  const data = await response.json();
  const page = data.pages?.[0];
  if (!page) return null;
  return { title: page.title, provider: 'Wikipedia', url: `https://en.wikipedia.org/wiki/${encodeURIComponent(page.key)}` };
}

async function enrichBooklet(booklet, bookletIndex) {
  let imageCount = 0;
  for (let pageIndex = 0; pageIndex < booklet.pages.length; pageIndex += 1) {
    const page = booklet.pages[pageIndex];
    const seed = `${runId}-${bookletIndex}-${pageIndex}-${page.imageQuery}`;
    if (page.imageQuery && imageCount < 4) {
      try {
        const provider = process.env.IMAGE_PROVIDER || 'openverse';
        const useUnsplash = provider === 'unsplash' || (provider === 'mixed' && process.env.UNSPLASH_ACCESS_KEY && seededIndex(seed, 3, 'provider') === 0);
        page.image = useUnsplash ? await fetchUnsplash(page.imageQuery, seed) : await fetchOpenverse(page.imageQuery, seed);
        if (page.image) imageCount += 1;
      } catch (error) {
        console.warn(`Image search failed for "${page.imageQuery}": ${error.message}`);
      }
    }
    if (page.sourceQuery) {
      try { page.source = await findWikipediaSource(page.sourceQuery); }
      catch (error) { console.warn(`Wikipedia source lookup failed: ${error.message}`); }
    }
  }
  return booklet;
}

let generated;
if (useAi) {
  try {
    generated = await generateWithAi(count);
    console.log(`Generated ${generated.length} concepts with OpenAI.`);
  } catch (error) {
    console.error(`AI generation failed; using local fallback. ${error.message}`);
    generated = fallbackConcepts(count);
  }
} else {
  generated = fallbackConcepts(count);
  console.log('OPENAI_API_KEY not configured; using the richer local generator.');
}

const additions = [];
for (let index = 0; index < generated.length; index += 1) {
  const normalized = normalizeBooklet(generated[index], index, additions);
  additions.push(await enrichBooklet(normalized, index));
}

await writeFile(fileUrl, `${JSON.stringify([...additions, ...existing], null, 2)}\n`);
console.log(`Added ${additions.length} booklet concepts for ${date}:`);
for (const item of additions) console.log(`- ${item.era} / ${item.style}: ${item.title} — ${item.pages.length} pages for ${item.audience}`);
