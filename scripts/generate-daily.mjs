import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

const fileUrl = new URL('../data/booklets.json', import.meta.url);
const existing = JSON.parse(await readFile(fileUrl, 'utf8'));
const date = process.env.BOOKLET_DATE || new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Europe/Riga', year: 'numeric', month: '2-digit', day: '2-digit'
}).format(new Date());

if (existing.filter(item => item.publishDate === date).length >= 3) {
  console.log(`Three concepts already exist for ${date}. Nothing to add.`);
  process.exit(0);
}

const audiences = [
  ['the Sailor', 'Sea'], ['the Pilot', 'Aviation'], ['the Architect', 'Architecture'],
  ['the Photographer', 'Photography'], ['the Musician', 'Music'], ['the Gardener', 'Nature'],
  ['the Engineer', 'Engineering'], ['the Traveller', 'Travel'], ['the Astronomer', 'Space'],
  ['the Cyclist', 'Cycling'], ['the Chef', 'Food'], ['the Cinema Lover', 'Cinema'],
  ['the Climber', 'Mountains'], ['the Railway Enthusiast', 'Railways'], ['the Dreamer', 'Abstract']
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
  ['Night Geometry', 'artificial light, shadow and structures revealed after dark']
];

// The creative range intentionally starts in the 1960s and runs through 2026.
// Each era contains several distinct directions so an era does not become one fixed template.
const eraPools = [
  {
    era: '1960s',
    styles: [
      ['Swiss international editorial', 'grid'],
      ['Space-age modernism', 'cinematic'],
      ['Op-art geometry', 'radical'],
      ['Pop editorial collage', 'editorial']
    ]
  },
  {
    era: '1970s',
    styles: [
      ['Psychedelic editorial', 'radical'],
      ['Ecological counterculture', 'editorial'],
      ['Analogue scientific journal', 'grid'],
      ['Soft-focus cinematic print', 'cinematic']
    ]
  },
  {
    era: '1980s',
    styles: [
      ['Post-punk zine', 'radical'],
      ['Memphis geometry', 'editorial'],
      ['New-wave typography', 'grid'],
      ['Chrome airbrush futurism', 'cinematic']
    ]
  },
  {
    era: '1990s',
    styles: [
      ['Grunge editorial', 'radical'],
      ['Rave flyer system', 'grid'],
      ['Minimal fashion magazine', 'editorial'],
      ['Early digital collage', 'cinematic']
    ]
  },
  {
    era: '2000s',
    styles: [
      ['Y2K liquid futurism', 'cinematic'],
      ['Glossy techno editorial', 'grid'],
      ['Indie magazine collage', 'editorial'],
      ['Early-web maximalism', 'radical']
    ]
  },
  {
    era: '2010s',
    styles: [
      ['Neo-Swiss digital editorial', 'grid'],
      ['Luxury minimalism', 'editorial'],
      ['Glitch culture', 'radical'],
      ['Cinematic image-first layout', 'cinematic']
    ]
  },
  {
    era: '2020–2024',
    styles: [
      ['Neo-brutalist publishing', 'radical'],
      ['Layered maximalist collage', 'editorial'],
      ['Soft 3D surrealism', 'cinematic'],
      ['Variable-type systems', 'grid']
    ]
  },
  {
    era: '2025',
    styles: [
      ['Human-centred AI collage', 'editorial'],
      ['Warm digital craft', 'cinematic'],
      ['Expressive serif minimalism', 'grid'],
      ['Imperfect tactile systems', 'radical']
    ]
  },
  {
    era: '2026',
    styles: [
      ['Sensory maximalism', 'cinematic'],
      ['Surreal absurdist storytelling', 'radical'],
      ['Organic freeform editorial', 'editorial'],
      ['Local-culture visual identity', 'grid']
    ]
  }
];

const palettes = [
  ['#efe4cd','#df5537','#247c82','#172527'], ['#161827','#f06449','#55b9ae','#f4e9d8'],
  ['#e9dfca','#b84155','#657a49','#262219'], ['#d8d1c5','#ff5a36','#6c67b7','#171717'],
  ['#1c2b33','#e6b34c','#8d3843','#f0e8d7'], ['#f1e6cc','#ef6b40','#1f8993','#21312e'],
  ['#e9e3ff','#ff784f','#3944bc','#161423'], ['#f4efe5','#adff2f','#ef4a85','#252525']
];

function seededIndex(seed, size, salt) {
  const hash = createHash('sha256').update(`${seed}:${salt}`).digest();
  return hash.readUInt32BE(0) % size;
}
function slug(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

// Select three different era pools every day. Across consecutive days the deterministic
// seed rotates through the full 1960s–2026 range instead of favouring only retro or current work.
const eraStart = seededIndex(date, eraPools.length, 'era-start');
const dailyEraPools = [0, 1, 2].map((offset) => eraPools[(eraStart + offset * 3) % eraPools.length]);

const additions = [];
for (let i = 0; i < 3; i += 1) {
  const seed = `${date}-${i}`;
  const [audience, category] = audiences[seededIndex(seed, audiences.length, 'audience')];
  const [titleBase, subject] = worlds[seededIndex(seed, worlds.length, 'world')];
  const selectedEra = dailyEraPools[i];
  const [style, layout] = selectedEra.styles[seededIndex(seed, selectedEra.styles.length, 'style')];
  const palette = palettes[seededIndex(seed, palettes.length, 'palette')];
  const title = `${titleBase}`;
  let id = `${slug(audience.replace(/^the /, ''))}-${slug(title)}-${date}`;
  if (existing.some(item => item.id === id) || additions.some(item => item.id === id)) id += `-${i + 1}`;

  additions.push({
    id,
    title,
    audience,
    category,
    era: selectedEra.era,
    style,
    layout,
    direction: `${style} interprets ${subject}, using a page rhythm, type hierarchy and image treatment distinct from recently generated concepts.`,
    description: `A personal gift-booklet concept for ${audience}, built around ${subject}. References should be mixed across several sources so the result feels original rather than like a reskinned template.`,
    format: i % 2 ? 'A5 / 20 pages' : 'A5 / 16 pages',
    publishDate: date,
    palette,
    spreads: ['Opening signal', 'Objects and traces', 'The central visual movement', 'A personal ending'],
    spreadNotes: [
      `A first spread that establishes the ${selectedEra.era} visual language without becoming a costume copy.`,
      'A collage of details, documents and image fragments from licensed or open sources.',
      'A larger composition where the main visual idea crosses the fold.',
      'A restrained final page written directly for the recipient.'
    ]
  });
}

await writeFile(fileUrl, `${JSON.stringify([...additions, ...existing], null, 2)}\n`);
console.log(`Added ${additions.length} concepts for ${date}:`);
for (const item of additions) console.log(`- ${item.era} / ${item.style}: ${item.title} — for ${item.audience}`);
