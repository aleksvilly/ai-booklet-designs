import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

const fileUrl = new URL('../data/booklets.json', import.meta.url);
const existing = JSON.parse(await readFile(fileUrl, 'utf8'));

const date = process.env.BOOKLET_DATE || new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Europe/Riga',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit'
}).format(new Date());

const requestedCount = clampInt(process.env.BOOKLET_COUNT, 1, 6, 3);
const force = process.env.FORCE_GENERATE === 'true';
const useAi = process.env.USE_AI !== 'false' && Boolean(process.env.OPENAI_API_KEY);
const runId = force ? (process.env.BOOKLET_RUN_ID || `${Date.now()}`) : date;
const alreadyToday = existing.filter(item => item.publishDate === date).length;
const count = force ? requestedCount : Math.max(0, requestedCount - alreadyToday);
const configuredChaos = clampInt(process.env.CHAOS_LEVEL, 0, 5, -1);

if (count === 0) {
  console.log(`${requestedCount} concepts already exist for ${date}. Use force_generate to create more today.`);
  process.exit(0);
}

const PAGE_TYPES = ['cover', 'full_bleed', 'editorial', 'facts', 'quote', 'timeline', 'collage', 'diagram', 'map', 'closing'];
const PAGE_LAYOUTS = ['minimal', 'split', 'overlap', 'grid', 'full', 'asymmetric', 'vertical', 'archive'];

const CATEGORIES = [
  {
    id: 'birthday', label: 'Birthday', weight: 10,
    audiences: ['a Child', 'a Teenager', 'a Friend', 'a Parent', 'a Grandparent', 'a Colleague'],
    subjects: ['a year of small joys', 'the story of one unforgettable age', 'a playful personal horoscope', 'favorite things as a tiny museum', 'a visual letter from friends', 'a future-self time capsule']
  },
  {
    id: 'nature', label: 'Nature', weight: 12,
    audiences: ['the Nature Lover', 'the Gardener', 'the Hiker', 'the Photographer', 'the Dreamer'],
    subjects: ['clouds', 'fog', 'rain', 'volcanoes', 'glaciers', 'deserts', 'forests at night', 'wildflowers', 'storms', 'rivers from above']
  },
  {
    id: 'music', label: 'Music', weight: 11,
    audiences: ['the Musician', 'the Vinyl Collector', 'the DJ', 'the Concert Lover', 'the Singer'],
    subjects: ['Japanese jazz', 'synthwave', 'punk scenes', 'classical piano', 'underground clubs', 'vinyl culture', 'women in electronic music', 'album-cover history', 'field recordings']
  },
  {
    id: 'cinema', label: 'Cinema', weight: 11,
    audiences: ['the Cinema Lover', 'the Director', 'the Actor', 'the Film Student', 'the Collector'],
    subjects: ['French New Wave', 'film noir', 'Italian cinema', 'silent cinema', 'cult science fiction', 'animation history', 'one fictional lost film', 'movie theaters after midnight']
  },
  {
    id: 'architecture', label: 'Architecture', weight: 10,
    audiences: ['the Architect', 'the Builder', 'the Engineer', 'the Urban Explorer', 'the Designer'],
    subjects: ['bridges', 'brutalism', 'glass towers', 'abandoned stations', 'future houses', 'Soviet modernism', 'tiny cabins', 'impossible staircases', 'cities built around water']
  },
  {
    id: 'travel', label: 'Travel', weight: 10,
    audiences: ['the Traveller', 'the Backpacker', 'the Pilot', 'the Railway Enthusiast', 'the City Explorer'],
    subjects: ['night trains', 'islands in winter', 'roads through nowhere', 'hidden courtyards', 'one city in four seasons', 'border towns', 'airport rituals', 'maps of imagined journeys']
  },
  {
    id: 'food', label: 'Food', weight: 8,
    audiences: ['the Chef', 'the Baker', 'the Food Lover', 'the Farmer', 'the Host'],
    subjects: ['potatoes', 'bread', 'coffee rituals', 'street food', 'fermentation', 'family recipes', 'midnight kitchens', 'one ingredient in ten cultures', 'fruit as architecture']
  },
  {
    id: 'technology', label: 'Technology', weight: 9,
    audiences: ['the Programmer', 'the Engineer', 'the Gamer', 'the Inventor', 'the Futurist'],
    subjects: ['personal computers', 'obsolete interfaces', 'robots at home', 'the visual history of buttons', 'AI dreams', 'cables and connectors', 'cybernetic gardens', 'machines that look emotional']
  },
  {
    id: 'space', label: 'Space', weight: 8,
    audiences: ['the Astronomer', 'the Pilot', 'the Scientist', 'the Dreamer', 'the Child Explorer'],
    subjects: ['the Moon as a destination', 'planetary weather', 'space suits', 'deep-space signals', 'imaginary exoplanet tourism', 'constellations as maps', 'retro space kitchens']
  },
  {
    id: 'ocean', label: 'Ocean', weight: 8,
    audiences: ['the Sailor', 'the Diver', 'the Fisher', 'the Marine Biologist', 'the Coastal Traveller'],
    subjects: ['deep-sea light', 'lighthouses', 'shipwreck maps', 'waves as geometry', 'underwater forests', 'harbors before sunrise', 'the archaeology of lost cargo']
  },
  {
    id: 'history', label: 'History', weight: 8,
    audiences: ['the Historian', 'the Collector', 'the Teacher', 'the Curious Reader'],
    subjects: ['forgotten inventions', 'one ordinary day in 1973', 'lost public signs', 'domestic objects through decades', 'small revolutions', 'postcards from vanished places', 'future archaeology of 2026']
  },
  {
    id: 'photography', label: 'Photography', weight: 8,
    audiences: ['the Photographer', 'the Visual Artist', 'the Traveler', 'the Collector'],
    subjects: ['reflections', 'motion blur', 'empty rooms', 'hands at work', 'night windows', 'accidental symmetry', 'one color across a city', 'contact sheets and mistakes']
  },
  {
    id: 'sports', label: 'Sports', weight: 7,
    audiences: ['the Cyclist', 'the Climber', 'the Runner', 'the Swimmer', 'the Football Fan'],
    subjects: ['the geometry of movement', 'training rituals', 'legendary routes', 'stadiums after everyone leaves', 'equipment close-ups', 'one second before the finish', 'weather and endurance']
  },
  {
    id: 'animals', label: 'Animals', weight: 7,
    audiences: ['the Animal Lover', 'the Dog Owner', 'the Cat Owner', 'the Birdwatcher', 'the Naturalist'],
    subjects: ['urban foxes', 'dogs as movie characters', 'cats and architecture', 'migrating birds', 'insects as jewelry', 'deep-sea animals', 'a personal pet biography']
  },
  {
    id: 'literature', label: 'Literature', weight: 7,
    audiences: ['the Writer', 'the Reader', 'the Poet', 'the Librarian'],
    subjects: ['marginal notes', 'imaginary book covers', 'one sentence in many forms', 'libraries at night', 'typewriters', 'unwritten chapters', 'a visual biography of a favorite book']
  },
  {
    id: 'fashion', label: 'Fashion', weight: 6,
    audiences: ['the Fashion Lover', 'the Stylist', 'the Designer', 'the Collector'],
    subjects: ['silhouettes through decades', 'street style', 'textile close-ups', 'future uniforms', 'one color wardrobe', 'accessories as sculpture', 'fashion mistakes worth repeating']
  },
  {
    id: 'science', label: 'Science', weight: 7,
    audiences: ['the Scientist', 'the Student', 'the Engineer', 'the Curious Child'],
    subjects: ['microscopic worlds', 'beautiful measurements', 'weather instruments', 'the history of one equation', 'laboratory glass', 'failed experiments', 'science-fiction objects explained seriously']
  },
  {
    id: 'design', label: 'Design', weight: 8,
    audiences: ['the Designer', 'the Illustrator', 'the Art Director', 'the Student'],
    subjects: ['the life of a grid', 'chairs as personalities', 'forgotten logos', 'color systems', 'packaging from imaginary countries', 'icons without interfaces', 'the future of printed matter']
  },
  {
    id: 'work', label: 'Profession', weight: 8,
    audiences: ['the Doctor', 'the Teacher', 'the Carpenter', 'the Driver', 'the Programmer', 'the Cleaner', 'the Cook', 'the Electrician'],
    subjects: ['tools of the trade', 'a day seen through objects', 'professional rituals', 'the invisible skill behind ordinary work', 'workplace sounds', 'before and after the shift']
  },
  {
    id: 'abstract', label: 'Abstract', weight: 5,
    audiences: ['the Dreamer', 'the Artist', 'the Experimental Reader', 'the Collector'],
    subjects: ['the shape of waiting', 'noise becoming color', 'soft machines', 'memory as architecture', 'gravity for imaginary objects', 'a museum of almost nothing', 'weather for one person']
  },
  {
    id: 'relationships', label: 'Relationships', weight: 6,
    audiences: ['a Couple', 'a Best Friend', 'a Family', 'a Parent and Child'],
    subjects: ['shared places', 'inside jokes as museum labels', 'a timeline of small moments', 'two perspectives on one day', 'objects that remember people', 'future plans as a travel guide']
  },
  {
    id: 'countries', label: 'Countries', weight: 7,
    audiences: ['the Traveller', 'the Expat', 'the Culture Lover', 'the Student'],
    subjects: ['Latvia through textures', 'Japan after rain', 'Italy through roadside signs', 'Iceland without landscapes', 'France through cinema objects', 'Estonia in winter light', 'Armenia through stone and fruit']
  }
];

const STYLE_FAMILIES = [
  { id: 'swiss-modernism', label: 'Swiss modernism', weight: 7, eras: ['1960s', '2010s', '2026'], layouts: ['grid', 'minimal', 'split'], typography: ['clean-sans', 'condensed-headlines', 'tiny-editorial'], colors: ['one-accent', 'black-white', 'high-contrast'], effects: ['oversized-number', 'frame-within-frame', 'diagonal-flow'] },
  { id: 'psychedelic-70s', label: '1970s psychedelic editorial', weight: 5, eras: ['1970s'], layouts: ['overlap', 'full', 'asymmetric'], typography: ['huge-serif', 'playful-rounded', 'mixed-serif-sans'], colors: ['neon', 'warm-analog', 'full-color'], effects: ['liquid-shapes', 'grain-texture', 'text-behind-image'] },
  { id: 'scientific-archive', label: 'Analogue scientific archive', weight: 6, eras: ['1960s', '1970s', '2026'], layouts: ['archive', 'grid', 'vertical'], typography: ['tech-mono', 'tiny-editorial', 'typewriter'], colors: ['muted', 'black-white', 'duotone'], effects: ['diagram-overlay', 'registration-marks', 'paper-fold'] },
  { id: 'memphis-play', label: 'Memphis playful geometry', weight: 5, eras: ['1980s', '2026'], layouts: ['asymmetric', 'grid', 'overlap'], typography: ['playful-rounded', 'poster-bold'], colors: ['pastel', 'full-color', 'neon'], effects: ['sticker-elements', 'cutout-shadow', 'floating-caption'] },
  { id: 'post-punk-zine', label: 'Post-punk xerox zine', weight: 6, eras: ['1980s', '1990s', '2026'], layouts: ['radical', 'overlap', 'archive'], typography: ['condensed-headlines', 'typewriter', 'tech-mono'], colors: ['black-white', 'one-accent', 'inverted'], effects: ['xerox-noise', 'tilted-photo', 'scribble-lines'] },
  { id: 'grunge-90s', label: '1990s grunge editorial', weight: 5, eras: ['1990s'], layouts: ['overlap', 'asymmetric', 'full'], typography: ['poster-bold', 'typewriter', 'condensed-headlines'], colors: ['muted', 'earthy', 'black-white'], effects: ['grain-texture', 'torn-edge', 'overlapping-panels'] },
  { id: 'rave-system', label: 'Rave flyer system', weight: 5, eras: ['1990s', '2000s'], layouts: ['grid', 'vertical', 'radical'], typography: ['tech-mono', 'condensed-headlines', 'poster-bold'], colors: ['neon', 'high-contrast', 'inverted'], effects: ['glow-accent', 'chromatic-shift', 'oversized-number'] },
  { id: 'y2k-liquid', label: 'Y2K liquid futurism', weight: 6, eras: ['2000s', '2026'], layouts: ['full', 'overlap', 'cinematic'], typography: ['tech-mono', 'clean-sans', 'playful-rounded'], colors: ['chrome', 'pastel', 'neon'], effects: ['chrome-type', 'micro-3d-layering', 'gradient-overlay'] },
  { id: 'early-web-maximalism', label: 'Early-web maximalism', weight: 4, eras: ['2000s', '2026'], layouts: ['grid', 'overlap', 'radical'], typography: ['tech-mono', 'playful-rounded', 'poster-bold'], colors: ['full-color', 'neon', 'high-contrast'], effects: ['pixel-grid', 'sticker-elements', 'glow-accent'] },
  { id: 'luxury-editorial', label: 'Luxury fashion editorial', weight: 7, eras: ['1990s', '2010s', '2026'], layouts: ['minimal', 'split', 'full'], typography: ['huge-serif', 'tiny-editorial', 'mixed-serif-sans'], colors: ['black-white', 'muted', 'one-accent'], effects: ['floating-caption', 'soft-shadow', 'text-behind-image'] },
  { id: 'neo-brutalism', label: 'Neo-brutalist publishing', weight: 7, eras: ['2020–2024', '2025', '2026'], layouts: ['radical', 'grid', 'asymmetric'], typography: ['poster-bold', 'tech-mono', 'condensed-headlines'], colors: ['high-contrast', 'one-accent', 'inverted'], effects: ['hard-shadow', 'oversized-border', 'diagonal-flow'] },
  { id: 'soft-3d-surreal', label: 'Soft 3D surrealism', weight: 6, eras: ['2020–2024', '2025', '2026'], layouts: ['cinematic', 'overlap', 'full'], typography: ['clean-sans', 'huge-serif'], colors: ['pastel', 'dreamy', 'full-color'], effects: ['micro-3d-layering', 'floating-object', 'blurred-depth'] },
  { id: 'childlike-paper-cut', label: 'Childlike paper-cut storybook', weight: 7, eras: ['1960s', '1980s', '2026'], layouts: ['asymmetric', 'minimal', 'overlap'], typography: ['playful-rounded', 'handwritten-accent'], colors: ['pastel', 'full-color', 'warm-analog'], effects: ['paper-cut', 'sticker-elements', 'scribble-lines'] },
  { id: 'black-white-noir', label: 'Black-and-white cinematic noir', weight: 7, eras: ['1960s', '1990s', '2026'], layouts: ['cinematic', 'full', 'split'], typography: ['huge-serif', 'condensed-headlines', 'tiny-editorial'], colors: ['black-white', 'inverted'], effects: ['film-grain', 'hard-light', 'mirrored-layout'] },
  { id: 'museum-clean', label: 'Museum catalogue restraint', weight: 7, eras: ['1960s', '2010s', '2026'], layouts: ['grid', 'minimal', 'archive'], typography: ['clean-sans', 'tiny-editorial', 'mixed-serif-sans'], colors: ['muted', 'black-white', 'one-accent'], effects: ['frame-within-frame', 'registration-marks', 'empty-space'] },
  { id: 'organic-futurism', label: 'Organic futurism', weight: 6, eras: ['2025', '2026'], layouts: ['full', 'overlap', 'asymmetric'], typography: ['huge-serif', 'clean-sans', 'playful-rounded'], colors: ['earthy', 'dreamy', 'full-color'], effects: ['liquid-shapes', 'translucent-blocks', 'micro-3d-layering'] },
  { id: 'neo-tech-interface', label: 'Neo-technological interface editorial', weight: 7, eras: ['2025', '2026'], layouts: ['grid', 'vertical', 'split'], typography: ['tech-mono', 'clean-sans', 'condensed-headlines'], colors: ['dark-tech', 'neon', 'one-accent'], effects: ['hud-lines', 'glow-accent', 'data-scan'] },
  { id: 'risograph-craft', label: 'Risograph craft print', weight: 6, eras: ['1970s', '2025', '2026'], layouts: ['archive', 'asymmetric', 'grid'], typography: ['typewriter', 'poster-bold', 'handwritten-accent'], colors: ['duotone', 'warm-analog', 'one-accent'], effects: ['misregistration', 'grain-texture', 'paper-fold'] },
  { id: 'documentary-clean', label: 'Clean documentary report', weight: 8, eras: ['2010s', '2020–2024', '2026'], layouts: ['grid', 'split', 'minimal'], typography: ['clean-sans', 'tiny-editorial'], colors: ['muted', 'black-white', 'one-accent'], effects: ['caption-rule', 'frame-within-frame', 'map-grid'] },
  { id: 'surreal-absurd', label: 'Surreal absurdist storytelling', weight: 5, eras: ['1970s', '2026'], layouts: ['overlap', 'asymmetric', 'full'], typography: ['huge-serif', 'poster-bold', 'playful-rounded'], colors: ['full-color', 'high-contrast', 'dreamy'], effects: ['impossible-scale', 'floating-object', 'mirrored-layout'] },
  { id: 'minimal-poetic', label: 'Poetic near-empty minimalism', weight: 6, eras: ['1960s', '2010s', '2026'], layouts: ['minimal', 'vertical', 'split'], typography: ['huge-serif', 'tiny-editorial'], colors: ['black-white', 'muted', 'one-accent'], effects: ['empty-space', 'floating-caption', 'soft-shadow'] },
  { id: 'comic-pop', label: 'Comic-pop halftone', weight: 5, eras: ['1960s', '1980s', '2026'], layouts: ['grid', 'overlap', 'radical'], typography: ['poster-bold', 'playful-rounded'], colors: ['full-color', 'high-contrast'], effects: ['halftone', 'speech-bubble', 'hard-shadow'] },
  { id: 'cinematic-color-field', label: 'Cinematic color-field', weight: 6, eras: ['1970s', '2010s', '2026'], layouts: ['cinematic', 'full', 'minimal'], typography: ['huge-serif', 'clean-sans'], colors: ['one-accent', 'dreamy', 'muted'], effects: ['gradient-overlay', 'blurred-depth', 'text-behind-image'] },
  { id: 'local-folk-future', label: 'Local folk culture remixed for 2026', weight: 6, eras: ['1960s', '1970s', '2026'], layouts: ['archive', 'asymmetric', 'grid'], typography: ['handwritten-accent', 'mixed-serif-sans', 'poster-bold'], colors: ['earthy', 'warm-analog', 'full-color'], effects: ['pattern-layer', 'paper-cut', 'registration-marks'] },
  { id: 'glassmorphism-editorial', label: 'Glassmorphism editorial', weight: 4, eras: ['2020–2024', '2026'], layouts: ['overlap', 'full', 'grid'], typography: ['clean-sans', 'tech-mono'], colors: ['dreamy', 'neon', 'dark-tech'], effects: ['translucent-blocks', 'blurred-depth', 'glow-accent'] },
  { id: 'kinetic-type', label: 'Kinetic typography system', weight: 5, eras: ['1980s', '2026'], layouts: ['vertical', 'radical', 'asymmetric'], typography: ['poster-bold', 'condensed-headlines', 'tech-mono'], colors: ['high-contrast', 'one-accent', 'inverted'], effects: ['type-wave', 'diagonal-flow', 'mirrored-layout'] },
  { id: 'scrapbook-memory', label: 'Scrapbook memory collage', weight: 7, eras: ['1970s', '1990s', '2026'], layouts: ['archive', 'overlap', 'asymmetric'], typography: ['handwritten-accent', 'typewriter', 'mixed-serif-sans'], colors: ['warm-analog', 'muted', 'full-color'], effects: ['tape-strips', 'torn-edge', 'tilted-photo'] },
  { id: 'eco-editorial', label: 'Ecological counterculture editorial', weight: 6, eras: ['1970s', '2026'], layouts: ['archive', 'split', 'asymmetric'], typography: ['huge-serif', 'typewriter', 'clean-sans'], colors: ['earthy', 'warm-analog', 'duotone'], effects: ['grain-texture', 'organic-border', 'paper-fold'] }
];

const ERAS = ['1960s', '1970s', '1980s', '1990s', '2000s', '2010s', '2020–2024', '2025', '2026'];
const ARCHETYPES = ['gift-booklet', 'editorial-magazine', 'museum-brochure', 'art-zine', 'travel-guide', 'personal-tribute', 'fact-book', 'visual-diary', 'poster-book', 'archive-booklet', 'children-storybook', 'futurist-dossier'];
const COLOR_MODES = ['full-color', 'black-white', 'duotone', 'pastel', 'neon', 'earthy', 'muted', 'one-accent', 'high-contrast', 'inverted', 'warm-analog', 'chrome', 'dark-tech', 'dreamy'];
const TYPOGRAPHY_MODES = ['huge-serif', 'tiny-editorial', 'clean-sans', 'mixed-serif-sans', 'poster-bold', 'typewriter', 'condensed-headlines', 'handwritten-accent', 'tech-mono', 'playful-rounded'];
const LAYOUT_SYSTEMS = ['single-hero-image', 'split-layout', 'strict-grid', 'chaotic-collage', 'poster-layout', 'text-heavy-editorial', 'image-heavy-magazine', 'white-space-minimal', 'full-bleed', 'framed-gallery', 'asymmetric-modern', 'timeline-flow', 'layered-overlap', 'modular-cards', 'vertical-rhythm'];
const IMAGE_TREATMENTS = ['clean-photo', 'grainy-photo', 'black-white-photo', 'cutout-collage', 'duotone-photo', 'archival-scan', 'posterized', 'blurred-dreamy', 'illustration-mix', 'diagram-overlay', 'photo-with-text-overlay', 'halftone-photo', 'chrome-reflection', 'infrared-color', 'xerox-copy'];
const TEXT_DENSITIES = ['very-low', 'low', 'medium', 'high', 'variable'];
const IMAGE_DENSITIES = ['very-low', 'low', 'balanced', 'high', 'maximal'];
const SHAPE_LANGUAGES = ['geometric', 'organic', 'mixed', 'cut-paper', 'technical', 'hand-drawn', 'liquid', 'rectilinear'];
const BACKGROUND_STYLES = ['pure', 'textured', 'noisy', 'gradient', 'photo-based', 'grid-paper', 'dark-field', 'paper', 'chrome', 'transparent-layers'];
const VISUAL_RHYTHMS = ['calm', 'balanced', 'dynamic', 'staccato', 'cinematic', 'chaotic', 'slow-luxury'];
const PRINT_FEELS = ['matte-book', 'glossy-magazine', 'newspaper', 'risograph', 'xerox-zine', 'museum-catalogue', 'screen-only', 'folded-poster'];
const CONTENT_MODES = ['factual', 'emotional', 'mixed', 'conceptual', 'playful', 'documentary', 'poetic'];
const REFERENCE_CULTURES = ['Nordic', 'Japanese', 'Italian', 'French', 'Baltic', 'Soviet-modernist', 'Latin American', 'West African', 'Mediterranean', 'global-digital', 'imaginary-local'];
const EFFECTS = [
  'micro-3d-layering', 'parallax-depth', 'text-behind-image', 'oversized-number', 'inverted-section',
  'mirrored-layout', 'tilted-photo', 'cutout-shadow', 'glow-accent', 'gradient-overlay', 'grain-texture',
  'scribble-lines', 'frame-within-frame', 'sticker-elements', 'floating-caption', 'overlapping-panels',
  'diagonal-flow', 'masked-image-shape', 'translucent-blocks', 'chrome-type', 'halftone', 'paper-cut',
  'hard-shadow', 'soft-shadow', 'torn-edge', 'tape-strips', 'hud-lines', 'data-scan', 'pixel-grid',
  'liquid-shapes', 'film-grain', 'registration-marks', 'misregistration', 'blurred-depth',
  'impossible-scale', 'floating-object', 'pattern-layer', 'type-wave', 'speech-bubble', 'empty-space'
];

const SURPRISE_ELEMENTS = [
  'potatoes', 'clouds', 'fish', 'mirrors', 'plastic toys', 'industrial pipes', 'old maps', 'birds',
  'televisions', 'flowers', 'cables', 'hands', 'masks', 'stairs', 'windows', 'rubber ducks', 'mushrooms',
  'shopping receipts', 'traffic cones', 'soap bubbles', 'forks', 'satellite dishes', 'umbrellas', 'teacups',
  'construction foam', 'ice cubes', 'ceramic tiles', 'bread crumbs', 'seaweed', 'balloons', 'keys',
  'cardboard boxes', 'laundry clips', 'elevator buttons', 'onions', 'toy dinosaurs', 'neon fruit'
];

const PALETTES = [
  { modes: ['black-white', 'inverted'], colors: ['#f5f5f2', '#111111', '#8a8a84', '#000000'] },
  { modes: ['one-accent', 'high-contrast'], colors: ['#f2eee5', '#ff3b30', '#151515', '#ffffff'] },
  { modes: ['pastel', 'dreamy'], colors: ['#f5e8f1', '#a8d8ff', '#ffd88a', '#302847'] },
  { modes: ['neon', 'dark-tech'], colors: ['#10131c', '#8dff00', '#ff3cac', '#f5f7ff'] },
  { modes: ['earthy', 'warm-analog'], colors: ['#eadfc8', '#b65432', '#66734b', '#27231d'] },
  { modes: ['duotone'], colors: ['#eee7d5', '#2748ff', '#ff5f3a', '#161616'] },
  { modes: ['chrome', 'dark-tech'], colors: ['#dce3ea', '#6f7b8f', '#9cffea', '#11141c'] },
  { modes: ['full-color'], colors: ['#fff0c8', '#ef436b', '#3559e0', '#18231f'] },
  { modes: ['muted'], colors: ['#dedbd4', '#8f8171', '#7e8c88', '#252525'] },
  { modes: ['full-color', 'high-contrast'], colors: ['#ffe600', '#ff4f00', '#2b59ff', '#111111'] },
  { modes: ['dreamy', 'pastel'], colors: ['#e8e2ff', '#ff8bc2', '#91d7c3', '#28233d'] },
  { modes: ['warm-analog'], colors: ['#f4dfb6', '#d95d39', '#1e7f74', '#27201b'] },
  { modes: ['black-white', 'one-accent'], colors: ['#ffffff', '#111111', '#c7ff00', '#000000'] },
  { modes: ['earthy'], colors: ['#e1d2aa', '#9c4f35', '#2f6657', '#231f18'] },
  { modes: ['inverted', 'neon'], colors: ['#090909', '#f6f2e8', '#ff334f', '#d9ff00'] }
];

const PAGE_MODULES = {
  cover: { type: 'cover', layouts: ['minimal', 'full', 'asymmetric'], image: 'optional', source: false },
  minimal_cover: { type: 'cover', layouts: ['minimal', 'vertical'], image: 'no', source: false },
  poster_cover: { type: 'cover', layouts: ['full', 'overlap', 'asymmetric'], image: 'optional', source: false },
  hero_photo: { type: 'full_bleed', layouts: ['full', 'asymmetric'], image: 'yes', source: false },
  photo_caption: { type: 'full_bleed', layouts: ['split', 'full'], image: 'yes', source: false },
  two_image_story: { type: 'collage', layouts: ['split', 'grid'], image: 'yes', source: false },
  four_image_grid: { type: 'collage', layouts: ['grid'], image: 'yes', source: false },
  fact_page: { type: 'facts', layouts: ['grid', 'split', 'archive'], image: 'optional', source: true },
  giant_fact: { type: 'facts', layouts: ['minimal', 'full'], image: 'optional', source: true },
  quote_page: { type: 'quote', layouts: ['minimal', 'vertical', 'full'], image: 'no', source: false },
  timeline_page: { type: 'timeline', layouts: ['vertical', 'grid', 'archive'], image: 'optional', source: true },
  map_page: { type: 'map', layouts: ['grid', 'full', 'archive'], image: 'optional', source: true },
  diagram_page: { type: 'diagram', layouts: ['grid', 'split', 'archive'], image: 'optional', source: true },
  micro_essay: { type: 'editorial', layouts: ['split', 'minimal', 'vertical'], image: 'optional', source: false },
  list_page: { type: 'facts', layouts: ['grid', 'vertical'], image: 'no', source: false },
  collage_page: { type: 'collage', layouts: ['overlap', 'asymmetric', 'grid'], image: 'yes', source: false },
  chapter_divider: { type: 'editorial', layouts: ['minimal', 'full'], image: 'no', source: false },
  full_bleed_image: { type: 'full_bleed', layouts: ['full'], image: 'yes', source: false },
  caption_gallery: { type: 'collage', layouts: ['grid', 'archive'], image: 'yes', source: false },
  archive_page: { type: 'editorial', layouts: ['archive', 'grid'], image: 'yes', source: true },
  object_closeup: { type: 'full_bleed', layouts: ['split', 'full'], image: 'yes', source: false },
  text_over_image: { type: 'full_bleed', layouts: ['overlap', 'full'], image: 'yes', source: false },
  index_page: { type: 'facts', layouts: ['grid', 'vertical'], image: 'no', source: false },
  contrast_page: { type: 'editorial', layouts: ['split', 'asymmetric'], image: 'optional', source: false },
  black_page: { type: 'quote', layouts: ['minimal', 'full'], image: 'no', source: false },
  white_page: { type: 'editorial', layouts: ['minimal'], image: 'no', source: false },
  duotone_poster: { type: 'cover', layouts: ['full', 'overlap'], image: 'yes', source: false },
  scrapbook_page: { type: 'collage', layouts: ['archive', 'overlap'], image: 'yes', source: false },
  dedication_page: { type: 'quote', layouts: ['minimal', 'split'], image: 'optional', source: false },
  before_after: { type: 'editorial', layouts: ['split', 'grid'], image: 'yes', source: true },
  data_page: { type: 'diagram', layouts: ['grid', 'vertical'], image: 'optional', source: true },
  empty_breath: { type: 'quote', layouts: ['minimal'], image: 'no', source: false },
  closing: { type: 'closing', layouts: ['full', 'minimal', 'split'], image: 'optional', source: false }
};

const ARCHETYPE_MODULES = {
  'gift-booklet': ['hero_photo', 'quote_page', 'fact_page', 'collage_page', 'dedication_page', 'empty_breath'],
  'editorial-magazine': ['micro_essay', 'photo_caption', 'fact_page', 'caption_gallery', 'contrast_page', 'giant_fact'],
  'museum-brochure': ['archive_page', 'fact_page', 'timeline_page', 'object_closeup', 'index_page', 'diagram_page'],
  'art-zine': ['collage_page', 'scrapbook_page', 'black_page', 'duotone_poster', 'text_over_image', 'empty_breath'],
  'travel-guide': ['map_page', 'hero_photo', 'fact_page', 'timeline_page', 'photo_caption', 'list_page'],
  'personal-tribute': ['dedication_page', 'hero_photo', 'quote_page', 'timeline_page', 'scrapbook_page', 'micro_essay'],
  'fact-book': ['fact_page', 'giant_fact', 'diagram_page', 'timeline_page', 'data_page', 'map_page'],
  'visual-diary': ['photo_caption', 'scrapbook_page', 'micro_essay', 'object_closeup', 'empty_breath', 'quote_page'],
  'poster-book': ['poster_cover', 'duotone_poster', 'giant_fact', 'text_over_image', 'black_page', 'full_bleed_image'],
  'archive-booklet': ['archive_page', 'timeline_page', 'index_page', 'object_closeup', 'fact_page', 'map_page'],
  'children-storybook': ['hero_photo', 'collage_page', 'quote_page', 'list_page', 'empty_breath', 'dedication_page'],
  'futurist-dossier': ['data_page', 'diagram_page', 'text_over_image', 'giant_fact', 'map_page', 'black_page']
};

function clampInt(value, min, max, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? Math.max(min, Math.min(max, parsed)) : fallback;
}

function hashBuffer(seed) {
  return createHash('sha256').update(String(seed)).digest();
}

function hashFloat(seed, salt = '') {
  return hashBuffer(`${seed}:${salt}`).readUInt32BE(0) / 0xffffffff;
}

function seededIndex(seed, size, salt = '') {
  return Math.floor(hashFloat(seed, salt) * size) % size;
}

function pick(array, seed, salt = '') {
  return array[seededIndex(seed, array.length, salt)];
}

function weightedPick(array, seed, salt = '') {
  const total = array.reduce((sum, item) => sum + (item.weight ?? 1), 0);
  let cursor = hashFloat(seed, salt) * total;
  for (const item of array) {
    cursor -= item.weight ?? 1;
    if (cursor <= 0) return item;
  }
  return array.at(-1);
}

function pickUnique(array, countToPick, seed, salt = '') {
  const scored = array.map((value, index) => ({ value, score: hashFloat(seed, `${salt}:${index}:${JSON.stringify(value)}`) }));
  return scored.sort((a, b) => a.score - b.score).slice(0, Math.min(countToPick, array.length)).map(item => item.value);
}

function slug(value) {
  return String(value).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function uniqueId(base, additions) {
  let id = base;
  let suffix = 2;
  while (existing.some(item => item.id === id) || additions.some(item => item.id === id)) id = `${base}-${suffix++}`;
  return id;
}

function titleCase(value) {
  return String(value).replace(/\b\w/g, char => char.toUpperCase());
}

function chooseExperimentalLevel(seed, slot) {
  if (configuredChaos >= 0) return configuredChaos;

  // Every group of three deliberately contains a safe, expressive and wild concept.
  // This prevents a daily batch from accidentally becoming six near-identical editorials.
  const lane = slot % 3;
  const roll = hashFloat(seed, 'experimental-level');
  if (lane === 0) return roll < 0.58 ? 1 : 2;
  if (lane === 1) return roll < 0.24 ? 2 : roll < 0.82 ? 3 : 4;
  return roll < 0.18 ? 3 : roll < 0.72 ? 4 : 5;
}

function chooseLogicMode(level, seed, slot) {
  const lane = slot % 3;
  const roll = hashFloat(seed, 'logic-mode');

  if (configuredChaos >= 0) {
    if (level <= 1) return 'coherent';
    if (level === 2) return roll < 0.72 ? 'coherent' : 'remix';
    if (level === 3) return roll < 0.34 ? 'coherent' : roll < 0.88 ? 'remix' : 'absurd';
    if (level === 4) return roll < 0.18 ? 'coherent' : roll < 0.65 ? 'remix' : 'absurd';
    return roll < 0.08 ? 'coherent' : roll < 0.35 ? 'remix' : 'absurd';
  }

  if (lane === 0) return roll < 0.90 ? 'coherent' : 'remix';
  if (lane === 1) return roll < 0.18 ? 'coherent' : roll < 0.90 ? 'remix' : 'absurd';
  return roll < 0.18 ? 'remix' : 'absurd';
}

function chooseStyleFamily(level, seed) {
  const weighted = STYLE_FAMILIES.map(style => {
    const experimentalStyle = ['surreal-absurd', 'early-web-maximalism', 'kinetic-type', 'post-punk-zine', 'neo-brutalism', 'soft-3d-surreal'].includes(style.id);
    const safeStyle = ['documentary-clean', 'museum-clean', 'minimal-poetic', 'luxury-editorial', 'swiss-modernism'].includes(style.id);
    let weight = style.weight;
    if (level <= 1 && safeStyle) weight *= 2.2;
    if (level <= 1 && experimentalStyle) weight *= 0.25;
    if (level >= 4 && experimentalStyle) weight *= 2.1;
    return { ...style, weight };
  });
  return weightedPick(weighted, seed, 'style-family');
}

function chooseEra(style, seed) {
  const fromStyle = hashFloat(seed, 'era-style-bias') < 0.82;
  return fromStyle ? pick(style.eras, seed, 'era-preferred') : pick(ERAS, seed, 'era-any');
}

function choosePalette(mode, seed) {
  const matches = PALETTES.filter(item => item.modes.includes(mode));
  return pick(matches.length ? matches : PALETTES, seed, 'palette').colors;
}

const PAGE_COUNT_OPTIONS = [
  { value: 6, weight: 10 },
  { value: 8, weight: 22 },
  { value: 10, weight: 26 },
  { value: 12, weight: 24 },
  { value: 14, weight: 12 },
  { value: 16, weight: 6 }
];

function pageCountFor(archetype, seed) {
  // Every booklet now has at least 6 and at most 16 pages.
  // Most concepts land between 8 and 12 pages, while archetype modifiers
  // gently favor shorter or longer formats without allowing 4-page results.
  const archetypeWeights = {
    'poster-book': { 6: 2.2, 8: 1.7, 10: 0.9, 12: 0.45, 14: 0.2, 16: 0.1 },
    'children-storybook': { 6: 1.2, 8: 1.5, 10: 1.5, 12: 1.2, 14: 0.55, 16: 0.3 },
    'museum-brochure': { 6: 0.35, 8: 1.0, 10: 1.35, 12: 1.5, 14: 1.1, 16: 0.65 },
    'fact-book': { 6: 0.2, 8: 0.75, 10: 1.15, 12: 1.5, 14: 1.45, 16: 1.15 },
    'visual-diary': { 6: 1.0, 8: 1.35, 10: 1.35, 12: 1.0, 14: 0.55, 16: 0.3 },
    'futurist-dossier': { 6: 0.7, 8: 1.15, 10: 1.4, 12: 1.25, 14: 0.75, 16: 0.45 }
  };

  const modifiers = archetypeWeights[archetype] || {};
  const options = PAGE_COUNT_OPTIONS.map(option => ({
    ...option,
    weight: option.weight * (modifiers[option.value] ?? 1)
  }));

  return weightedPick(options, seed, 'page-count').value;
}

function buildDesignDna(seed, slot) {
  const category = weightedPick(CATEGORIES, seed, 'category');
  const experimentalLevel = chooseExperimentalLevel(seed, slot);
  const logicMode = chooseLogicMode(experimentalLevel, seed, slot);
  const styleFamily = chooseStyleFamily(experimentalLevel, seed);
  const era = chooseEra(styleFamily, seed);
  const subject = pick(category.subjects, seed, 'subject');
  const audience = pick(category.audiences, seed, 'audience');

  const secondaryCategory = logicMode === 'coherent' ? null : pick(CATEGORIES.filter(item => item.id !== category.id), seed, 'secondary-category');
  const secondarySubject = secondaryCategory ? pick(secondaryCategory.subjects, seed, 'secondary-subject') : '';

  const surpriseCount = logicMode === 'coherent' ? (experimentalLevel >= 4 ? 1 : 0) : logicMode === 'remix' ? 1 : Math.min(3, 1 + Math.floor(hashFloat(seed, 'surprise-count') * 3));
  const surpriseElements = pickUnique(SURPRISE_ELEMENTS, surpriseCount, seed, 'surprise-elements');

  const archetype = pick(ARCHETYPES, seed, 'archetype');
  const colorMode = pick(styleFamily.colors.length ? styleFamily.colors : COLOR_MODES, seed, 'color-mode');
  const typographyMode = pick(styleFamily.typography.length ? styleFamily.typography : TYPOGRAPHY_MODES, seed, 'typography-mode');
  const layoutSystem = pick(LAYOUT_SYSTEMS, seed, 'layout-system');
  const imageTreatment = pick(IMAGE_TREATMENTS, seed, 'image-treatment');
  const textDensity = pick(TEXT_DENSITIES, seed, 'text-density');
  const imageDensity = pick(IMAGE_DENSITIES, seed, 'image-density');
  const shapeLanguage = pick(SHAPE_LANGUAGES, seed, 'shape-language');
  const backgroundStyle = pick(BACKGROUND_STYLES, seed, 'background-style');
  const visualRhythm = pick(VISUAL_RHYTHMS, seed, 'visual-rhythm');
  const printFeel = pick(PRINT_FEELS, seed, 'print-feel');
  const contentMode = pick(CONTENT_MODES, seed, 'content-mode');
  const referenceCulture = pick(REFERENCE_CULTURES, seed, 'reference-culture');
  const effectPool = [...new Set([...styleFamily.effects, ...EFFECTS])];
  const effectCount = Math.max(1, Math.min(5, experimentalLevel + (hashFloat(seed, 'effect-bonus') > 0.66 ? 1 : 0)));
  const effects = pickUnique(effectPool, effectCount, seed, 'effects');
  const pageCount = pageCountFor(archetype, seed);

  return {
    slot,
    category: category.label,
    categoryId: category.id,
    audience,
    subject,
    secondaryCategory: secondaryCategory?.label || '',
    secondarySubject,
    era,
    styleFamily: styleFamily.id,
    style: styleFamily.label,
    archetype,
    colorMode,
    typographyMode,
    layoutSystem,
    imageTreatment,
    textDensity,
    imageDensity,
    shapeLanguage,
    backgroundStyle,
    visualRhythm,
    printFeel,
    contentMode,
    referenceCulture,
    effects,
    experimentalLevel,
    logicMode,
    surpriseElements,
    pageCount,
    palette: choosePalette(colorMode, seed)
  };
}

function comparableDna(item) {
  const dna = item.designDna || {};
  return {
    category: dna.category || item.category || '',
    subject: dna.subject || item.subject || '',
    era: dna.era || item.era || '',
    styleFamily: dna.styleFamily || item.style || '',
    archetype: dna.archetype || '',
    colorMode: dna.colorMode || '',
    typographyMode: dna.typographyMode || '',
    layoutSystem: dna.layoutSystem || item.layout || '',
    imageTreatment: dna.imageTreatment || '',
    effects: dna.effects || []
  };
}

function similarityScore(a, b) {
  let score = 0;
  if (a.category === b.category) score += 2;
  if (a.subject && a.subject === b.subject) score += 3;
  if (a.era === b.era) score += 1;
  if (a.styleFamily === b.styleFamily) score += 4;
  if (a.archetype && a.archetype === b.archetype) score += 2;
  if (a.colorMode && a.colorMode === b.colorMode) score += 2;
  if (a.typographyMode && a.typographyMode === b.typographyMode) score += 2;
  if (a.layoutSystem && a.layoutSystem === b.layoutSystem) score += 2;
  if (a.imageTreatment && a.imageTreatment === b.imageTreatment) score += 1;
  const overlap = (a.effects || []).filter(effect => (b.effects || []).includes(effect)).length;
  score += overlap;
  return score;
}

function createDiverseDna(slot, additionsDna) {
  const recent = [...additionsDna, ...existing.slice(0, 30).map(comparableDna)];
  let best = null;
  let bestMaxScore = Number.POSITIVE_INFINITY;

  for (let attempt = 0; attempt < 80; attempt += 1) {
    const seed = `${runId}:${date}:${slot}:${attempt}`;
    const candidate = buildDesignDna(seed, slot);
    const comparable = comparableDna({ designDna: candidate });
    const maxScore = recent.length ? Math.max(...recent.map(item => similarityScore(comparable, item))) : 0;
    if (maxScore < bestMaxScore) {
      best = candidate;
      bestMaxScore = maxScore;
    }
    if (maxScore <= 5) break;
  }

  return best;
}

function choosePageModule(pool, used, seed, index) {
  const candidates = pool.filter(module => {
    const last = used.at(-1);
    if (module === last) return false;
    if (used.includes(module)) return false;
    return true;
  });
  return pick(candidates.length ? candidates : pool, seed, `page-module:${index}`);
}

function buildPagePlan(dna, seed) {
  const plan = [];
  const coverPool = dna.archetype === 'poster-book' ? ['poster_cover', 'duotone_poster'] : dna.archetype === 'children-storybook' ? ['cover', 'poster_cover'] : ['cover', 'minimal_cover', 'poster_cover'];
  plan.push(pick(coverPool, seed, 'cover-module'));

  const bodyForbidden = new Set(['cover', 'minimal_cover', 'poster_cover', 'closing']);
  const basePool = (ARCHETYPE_MODULES[dna.archetype] || ARCHETYPE_MODULES['editorial-magazine']).filter(module => !bodyForbidden.has(module));
  const extraPool = Object.keys(PAGE_MODULES).filter(module => !['cover', 'minimal_cover', 'poster_cover', 'closing'].includes(module));
  const mixedPool = [...new Set([...basePool, ...pickUnique(extraPool, 8, seed, 'extra-modules')])];

  if (dna.pageCount >= 8 && hashFloat(seed, 'divider') > 0.35) plan.push('chapter_divider');

  while (plan.length < dna.pageCount - 1) {
    plan.push(choosePageModule(mixedPool, plan, seed, plan.length));
  }

  plan.push('closing');

  return plan.slice(0, dna.pageCount).map((module, index) => {
    const config = PAGE_MODULES[module];
    const layout = pick(config.layouts, seed, `module-layout:${index}`);
    const effect = pick(dna.effects, seed, `page-effect:${index}`);
    const typography = hashFloat(seed, `page-typography-bias:${index}`) < 0.72 ? dna.typographyMode : pick(TYPOGRAPHY_MODES, seed, `page-typography:${index}`);
    const background = hashFloat(seed, `page-background-bias:${index}`) < 0.66 ? dna.backgroundStyle : pick(BACKGROUND_STYLES, seed, `page-background:${index}`);
    const imageTreatment = hashFloat(seed, `page-image-bias:${index}`) < 0.75 ? dna.imageTreatment : pick(IMAGE_TREATMENTS, seed, `page-image:${index}`);
    const textAlign = pick(['left', 'left', 'left', 'center', 'right'], seed, `text-align:${index}`);
    const rotation = Number(((hashFloat(seed, `rotation:${index}`) - 0.5) * (dna.experimentalLevel * 2.4)).toFixed(2));
    const imagePosition = pick(['center', 'center top', 'center bottom', 'left center', 'right center'], seed, `image-position:${index}`);

    return {
      module,
      type: config.type,
      layout,
      needsImage: config.image,
      needsSource: config.source,
      effect,
      typography,
      background,
      imageTreatment,
      textAlign,
      rotation,
      imagePosition
    };
  });
}

function makeTitle(dna, seed) {
  const subject = titleCase(dna.subject);
  const secondary = dna.secondarySubject ? titleCase(dna.secondarySubject) : '';
  const surprise = dna.surpriseElements[0] ? titleCase(dna.surpriseElements[0]) : '';
  const patterns = [
    `${subject}`,
    `A Small Atlas of ${subject}`,
    `${subject}: After the Last Light`,
    `The Secret Life of ${subject}`,
    `Notes on ${subject}`,
    `${subject} for One Person`,
    `An Unreasonable Guide to ${subject}`,
    `${subject} / ${dna.era}`,
    `The Shape of ${subject}`,
    `Everything Around ${subject}`
  ];
  if (secondary) patterns.push(`${subject} Meets ${secondary}`, `${subject} and the Problem of ${secondary}`);
  if (surprise) patterns.push(`${subject}, ${surprise}, and Other Evidence`, `Why ${subject} Dreams of ${surprise}`);
  return patterns[(seededIndex(seed, patterns.length, 'title') + dna.slot) % patterns.length];
}

function sentencePool(dna) {
  const mix = dna.secondarySubject ? ` It deliberately collides with ${dna.secondarySubject}` : '';
  const surprise = dna.surpriseElements.length ? ` Unexpected motifs such as ${dna.surpriseElements.join(', ')} appear without needing to behave logically` : '';
  return [
    `This page treats ${dna.subject} as a visual character rather than a conventional topic.${mix}.`,
    `The composition follows a ${dna.visualRhythm} rhythm, using ${dna.typographyMode.replaceAll('-', ' ')} and ${dna.imageTreatment.replaceAll('-', ' ')}.`,
    `The copy is intentionally ${dna.contentMode}, while the layout changes scale and silence from one page to the next.`,
    `The visual language borrows the discipline of ${dna.era} but interprets it as a contemporary ${dna.referenceCulture} object.`,
    `${surprise || 'A small unexpected detail interrupts the otherwise coherent sequence.'}.`,
    `Instead of repeating one grid, the booklet moves between image, pause, archive, diagram and oversized type.`,
    `This is designed as a gift for ${dna.audience}, with room for a name, date or private memory.`,
    `The page should feel printed as ${dna.printFeel.replaceAll('-', ' ')}, even when viewed on a screen.`
  ];
}

function bodyForDensity(dna, module, seed, index) {
  const density = dna.textDensity === 'variable' ? pick(TEXT_DENSITIES.filter(value => value !== 'variable'), seed, `variable-density:${index}`) : dna.textDensity;
  const sentenceCount = { 'very-low': 1, low: 2, medium: 3, high: 5 }[density] || 2;
  const pool = sentencePool(dna);
  const selected = pickUnique(pool, sentenceCount, seed, `body:${module}:${index}`);
  if (['quote_page', 'empty_breath', 'black_page'].includes(module)) return selected[0].split('.')[0] + '.';
  if (module === 'list_page') return selected.map((sentence, itemIndex) => `${itemIndex + 1}. ${sentence}`).join(' ');
  return selected.join(' ');
}

function titleForModule(module, dna, seed, index, bookletTitle) {
  const subject = titleCase(dna.subject);
  const titles = {
    cover: bookletTitle,
    minimal_cover: bookletTitle,
    poster_cover: bookletTitle,
    hero_photo: `Enter ${subject}`,
    photo_caption: `One Image, One Clue`,
    two_image_story: `Two Views of the Same Thing`,
    four_image_grid: `Fragments / 01–04`,
    fact_page: `Things Worth Verifying`,
    giant_fact: `One Number Changes the Scale`,
    quote_page: `A Sentence with Its Own Room`,
    timeline_page: `Before / During / After`,
    map_page: `A Route Through ${subject}`,
    diagram_page: `How the Invisible Part Works`,
    micro_essay: `A Short Note on ${subject}`,
    list_page: `A List Without a Ranking`,
    collage_page: `Memory in Fragments`,
    chapter_divider: `Chapter ${String(index).padStart(2, '0')}`,
    full_bleed_image: `The Central Image`,
    caption_gallery: `Details That Usually Escape`,
    archive_page: `From the Archive`,
    object_closeup: `The Object Knows More`,
    text_over_image: `Words Enter the Picture`,
    index_page: `Index of Motifs`,
    contrast_page: `Soft / Hard`,
    black_page: `Pause in Black`,
    white_page: `Almost Nothing`,
    duotone_poster: `${subject} in Two Colors`,
    scrapbook_page: `Evidence, Tape, Memory`,
    dedication_page: `For ${dna.audience.replace(/^the /i, '')}`,
    before_after: `Then and Now`,
    data_page: `Signals and Measurements`,
    empty_breath: `Leave Some Air`,
    closing: `Continue Beyond the Page`
  };
  return titles[module] || pick([`On ${subject}`, `Another Way to See It`, `A Change of Scale`], seed, `fallback-title:${index}`);
}

function imageQueryForPage(dna, pagePlan, seed, index) {
  if (pagePlan.needsImage === 'no') return '';
  if (pagePlan.needsImage === 'optional' && hashFloat(seed, `optional-image:${index}`) < 0.44) return '';
  const secondary = dna.secondarySubject ? ` ${dna.secondarySubject}` : '';
  const surprise = dna.surpriseElements.length && hashFloat(seed, `image-surprise:${index}`) > 0.45 ? ` ${pick(dna.surpriseElements, seed, `surprise-image:${index}`)}` : '';
  return `${dna.subject}${secondary}${surprise} ${pagePlan.imageTreatment.replaceAll('-', ' ')} ${dna.referenceCulture} editorial photography`;
}

function sourceQueryForPage(dna, pagePlan) {
  if (!pagePlan.needsSource) return '';
  return `${dna.subject} history facts timeline explanation`;
}

function fallbackPages(dna, pagePlan, title, seed) {
  return pagePlan.map((plan, index) => ({
    module: plan.module,
    type: plan.type,
    layout: plan.layout,
    title: titleForModule(plan.module, dna, seed, index, title),
    body: bodyForDensity(dna, plan.module, seed, index),
    imageQuery: imageQueryForPage(dna, plan, seed, index),
    sourceQuery: sourceQueryForPage(dna, plan),
    caption: plan.needsImage === 'no' ? '' : `Visual direction: ${plan.imageTreatment.replaceAll('-', ' ')}, ${plan.effect.replaceAll('-', ' ')}.`,
    effect: plan.effect,
    typography: plan.typography,
    background: plan.background,
    imageTreatment: plan.imageTreatment,
    textAlign: plan.textAlign,
    rotation: plan.rotation,
    imagePosition: plan.imagePosition
  }));
}

function bookletLayoutFromDna(dna) {
  if (['neo-brutalism', 'post-punk-zine', 'grunge-90s', 'early-web-maximalism', 'kinetic-type'].includes(dna.styleFamily)) return 'radical';
  if (['black-white-noir', 'soft-3d-surreal', 'cinematic-color-field', 'organic-futurism'].includes(dna.styleFamily)) return 'cinematic';
  if (['swiss-modernism', 'scientific-archive', 'museum-clean', 'neo-tech-interface', 'documentary-clean'].includes(dna.styleFamily)) return 'grid';
  return 'editorial';
}

function fallbackConceptFromDna(dna, pagePlan, seed) {
  const title = makeTitle(dna, seed);
  const mixText = dna.secondarySubject ? ` It intentionally combines ${dna.subject} with ${dna.secondarySubject}.` : '';
  const surpriseText = dna.surpriseElements.length ? ` Wild cards: ${dna.surpriseElements.join(', ')}.` : '';
  return {
    title,
    audience: dna.audience,
    category: dna.category,
    era: dna.era,
    style: dna.style,
    layout: bookletLayoutFromDna(dna),
    direction: `${dna.style} with ${dna.layoutSystem.replaceAll('-', ' ')}, ${dna.colorMode.replaceAll('-', ' ')} color, and a ${dna.visualRhythm} rhythm.${mixText}${surpriseText}`,
    description: `A ${dna.archetype.replaceAll('-', ' ')} about ${dna.subject}, designed for ${dna.audience}. The sequence deliberately varies image scale, text volume, typography, negative space and page effects instead of reskinning one template.`,
    format: `A5 / ${dna.pageCount} pages / ${dna.printFeel.replaceAll('-', ' ')}`,
    palette: dna.palette,
    designDna: dna,
    pages: fallbackPages(dna, pagePlan, title, seed)
  };
}

function aiSchema(itemCount) {
  const page = {
    type: 'object',
    additionalProperties: false,
    properties: {
      module: { type: 'string', enum: Object.keys(PAGE_MODULES) },
      type: { type: 'string', enum: PAGE_TYPES },
      layout: { type: 'string', enum: PAGE_LAYOUTS },
      title: { type: 'string' },
      body: { type: 'string' },
      imageQuery: { type: 'string' },
      sourceQuery: { type: 'string' },
      caption: { type: 'string' }
    },
    required: ['module', 'type', 'layout', 'title', 'body', 'imageQuery', 'sourceQuery', 'caption']
  };

  const booklet = {
    type: 'object',
    additionalProperties: false,
    properties: {
      title: { type: 'string' },
      direction: { type: 'string' },
      description: { type: 'string' },
      pages: { type: 'array', minItems: 6, maxItems: 16, items: page }
    },
    required: ['title', 'direction', 'description', 'pages']
  };

  return {
    type: 'object',
    additionalProperties: false,
    properties: {
      booklets: { type: 'array', minItems: itemCount, maxItems: itemCount, items: booklet }
    },
    required: ['booklets']
  };
}

function aiBrief(dna, pagePlan, index) {
  return {
    index,
    audience: dna.audience,
    category: dna.category,
    subject: dna.subject,
    secondarySubject: dna.secondarySubject,
    surpriseElements: dna.surpriseElements,
    era: dna.era,
    style: dna.style,
    archetype: dna.archetype,
    colorMode: dna.colorMode,
    typographyMode: dna.typographyMode,
    layoutSystem: dna.layoutSystem,
    imageTreatment: dna.imageTreatment,
    textDensity: dna.textDensity,
    imageDensity: dna.imageDensity,
    shapeLanguage: dna.shapeLanguage,
    backgroundStyle: dna.backgroundStyle,
    visualRhythm: dna.visualRhythm,
    printFeel: dna.printFeel,
    contentMode: dna.contentMode,
    referenceCulture: dna.referenceCulture,
    effects: dna.effects,
    experimentalLevel: dna.experimentalLevel,
    logicMode: dna.logicMode,
    pageCount: dna.pageCount,
    pagePlan: pagePlan.map(page => ({ module: page.module, type: page.type, layout: page.layout }))
  };
}

async function generateWithAi(dnas, pagePlans) {
  const recent = existing.slice(0, 24).map(item => ({
    title: item.title,
    category: item.category,
    era: item.era,
    style: item.style,
    designDna: item.designDna ? {
      styleFamily: item.designDna.styleFamily,
      colorMode: item.designDna.colorMode,
      typographyMode: item.designDna.typographyMode,
      archetype: item.designDna.archetype
    } : null
  }));

  const briefs = dnas.map((dna, index) => aiBrief(dna, pagePlans[index], index));
  const prompt = `Create exactly ${dnas.length} radically distinct but production-friendly mini-booklets for ${date}.

Follow each numbered design brief and its pagePlan. The pagePlan order is mandatory. Return one page object for every planned page, in the same order, using the specified module/type/layout.

Rules:
- Do not fall back to a generic art-magazine template.
- Vary text length strongly: some pages may contain one short line, others a compact paragraph or factual list.
- Vary page rhythm strongly: image-only feeling, tiny captions, huge type, archive, data, pause, collage and narrative pages should feel different.
- Keep copy concise enough to fit an A5 page.
- For factual, timeline, map, archive and diagram pages, provide a useful sourceQuery for Wikipedia verification. Do not invent precise claims that cannot be checked.
- imageQuery must work for Openverse or Unsplash search.
- If the brief is absurd, combine the subjects confidently instead of apologizing.
- Do not imitate one living designer or copy a particular published layout.
- Do not reuse title patterns, sentence structures or page wording across the booklets.
- Each booklet must contain exactly the number of pages specified by its pageCount and pagePlan.
- Never return fewer than 6 pages or more than 16 pages.
- The cover and closing page are included in the page count.
- Every additional page must have a distinct purpose; never pad the booklet with repetitive generic copy.

DESIGN BRIEFS:
${JSON.stringify(briefs, null, 2)}

RECENT WORK TO AVOID REPEATING:
${JSON.stringify(recent, null, 2)}`;

  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || 'gpt-5-mini',
      store: false,
      max_output_tokens: 20000,
      input: [
        {
          role: 'system',
          content: [{
            type: 'input_text',
            text: 'You are an unusually versatile editorial art director, copy editor and gift-book designer. You treat each design brief as a different visual universe. Produce original structured JSON only.'
          }]
        },
        { role: 'user', content: [{ type: 'input_text', text: prompt }] }
      ],
      text: {
        verbosity: 'medium',
        format: {
          type: 'json_schema',
          name: 'diverse_daily_booklets',
          strict: true,
          schema: aiSchema(dnas.length)
        }
      }
    })
  });

  if (!response.ok) throw new Error(`OpenAI ${response.status}: ${await response.text()}`);
  const json = await response.json();
  const text = json.output_text || json.output?.flatMap(item => item.content || []).find(part => part.type === 'output_text')?.text;
  if (!text) throw new Error('OpenAI response contained no output_text.');
  return JSON.parse(text).booklets;
}

function mergeAiBooklet(aiItem, dna, pagePlan, seed) {
  const fallback = fallbackConceptFromDna(dna, pagePlan, seed);
  const pages = pagePlan.map((plan, index) => {
    const aiPage = aiItem?.pages?.[index] || {};
    const fallbackPage = fallback.pages[index];
    return {
      ...fallbackPage,
      ...aiPage,
      module: plan.module,
      type: plan.type,
      layout: plan.layout,
      effect: plan.effect,
      typography: plan.typography,
      background: plan.background,
      imageTreatment: plan.imageTreatment,
      textAlign: plan.textAlign,
      rotation: plan.rotation,
      imagePosition: plan.imagePosition,
      title: aiPage.title?.trim() || fallbackPage.title,
      body: aiPage.body?.trim() || fallbackPage.body,
      imageQuery: aiPage.imageQuery?.trim() || fallbackPage.imageQuery,
      sourceQuery: aiPage.sourceQuery?.trim() || fallbackPage.sourceQuery,
      caption: aiPage.caption?.trim() || fallbackPage.caption
    };
  });

  return {
    ...fallback,
    title: aiItem?.title?.trim() || fallback.title,
    direction: aiItem?.direction?.trim() || fallback.direction,
    description: aiItem?.description?.trim() || fallback.description,
    pages
  };
}

function normalizeBooklet(item, index, additions) {
  const base = `${slug(item.audience.replace(/^the /i, ''))}-${slug(item.title)}-${date}`;
  const id = uniqueId(base, additions);
  const palette = Array.isArray(item.palette) && item.palette.length === 4 ? item.palette : PALETTES[index % PALETTES.length].colors;
  const pages = Array.isArray(item.pages) && item.pages.length >= 6 ? item.pages.slice(0, 16) : [];
  return { ...item, id, publishDate: date, palette, pages };
}

async function fetchOpenverse(query, seed) {
  const url = new URL('https://api.openverse.org/v1/images/');
  url.searchParams.set('q', query);
  url.searchParams.set('license', 'pdm,cc0,by,by-sa');
  url.searchParams.set('page_size', '20');
  url.searchParams.set('mature', 'false');

  const response = await fetch(url, {
    headers: {
      'User-Agent': 'AI-Booklet-Designs/3.0 (https://github.com/aleksvilly/ai-booklet-designs)'
    }
  });

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
  url.searchParams.set('per_page', '20');
  url.searchParams.set('content_filter', 'high');

  const response = await fetch(url, {
    headers: {
      Authorization: `Client-ID ${process.env.UNSPLASH_ACCESS_KEY}`,
      'Accept-Version': 'v1'
    }
  });

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

  const response = await fetch(url, {
    headers: {
      'User-Agent': 'AI-Booklet-Designs/3.0 (https://github.com/aleksvilly/ai-booklet-designs)'
    }
  });

  if (!response.ok) return null;
  const data = await response.json();
  const page = data.pages?.[0];
  if (!page) return null;

  return {
    title: page.title,
    provider: 'Wikipedia',
    url: `https://en.wikipedia.org/wiki/${encodeURIComponent(page.key)}`
  };
}

function imageLimitFor(dna) {
  return {
    'very-low': 2,
    low: 3,
    balanced: 5,
    high: 7,
    maximal: 10
  }[dna.imageDensity] || 5;
}

async function enrichBooklet(booklet, bookletIndex) {
  if (process.env.SKIP_ENRICHMENT === 'true') return booklet;

  let imageCount = 0;
  const imageLimit = imageLimitFor(booklet.designDna || {});

  for (let pageIndex = 0; pageIndex < booklet.pages.length; pageIndex += 1) {
    const page = booklet.pages[pageIndex];
    const seed = `${runId}-${bookletIndex}-${pageIndex}-${page.imageQuery}`;

    if (page.imageQuery && imageCount < imageLimit) {
      try {
        const provider = process.env.IMAGE_PROVIDER || 'mixed';
        const canUseUnsplash = Boolean(process.env.UNSPLASH_ACCESS_KEY);
        const useUnsplash = provider === 'unsplash' || (provider === 'mixed' && canUseUnsplash && seededIndex(seed, 3, 'provider') === 0);
        page.image = useUnsplash ? await fetchUnsplash(page.imageQuery, seed) : await fetchOpenverse(page.imageQuery, seed);
        if (!page.image && useUnsplash) page.image = await fetchOpenverse(page.imageQuery, seed);
        if (page.image) imageCount += 1;
      } catch (error) {
        console.warn(`Image search failed for "${page.imageQuery}": ${error.message}`);
      }
    }

    if (page.sourceQuery) {
      try {
        page.source = await findWikipediaSource(page.sourceQuery);
      } catch (error) {
        console.warn(`Wikipedia source lookup failed: ${error.message}`);
      }
    }
  }

  return booklet;
}

const dnas = [];
const pagePlans = [];
const comparableAdditions = [];

for (let index = 0; index < count; index += 1) {
  const dna = createDiverseDna(index, comparableAdditions);
  dnas.push(dna);
  comparableAdditions.push(comparableDna({ designDna: dna }));
  pagePlans.push(buildPagePlan(dna, `${runId}:plan:${index}`));
}

let generated;
if (useAi) {
  try {
    const aiBooklets = await generateWithAi(dnas, pagePlans);
    generated = dnas.map((dna, index) => mergeAiBooklet(aiBooklets[index], dna, pagePlans[index], `${runId}:merge:${index}`));
    console.log(`Generated ${generated.length} diverse concepts with OpenAI.`);
  } catch (error) {
    console.error(`AI generation failed; using local design-DNA fallback. ${error.message}`);
    generated = dnas.map((dna, index) => fallbackConceptFromDna(dna, pagePlans[index], `${runId}:fallback:${index}`));
  }
} else {
  generated = dnas.map((dna, index) => fallbackConceptFromDna(dna, pagePlans[index], `${runId}:fallback:${index}`));
  console.log('OpenAI disabled or key missing; using local design-DNA generator.');
}

const additions = [];
for (let index = 0; index < generated.length; index += 1) {
  const normalized = normalizeBooklet(generated[index], index, additions);
  additions.push(await enrichBooklet(normalized, index));
}

await writeFile(fileUrl, `${JSON.stringify([...additions, ...existing], null, 2)}\n`);

console.log(`Added ${additions.length} booklet concepts for ${date}:`);
for (const item of additions) {
  const dna = item.designDna || {};
  console.log(`- ${item.era} / ${item.style}: ${item.title} — ${item.pages.length} pages, ${dna.colorMode}, ${dna.typographyMode}, ${dna.logicMode}`);
}
