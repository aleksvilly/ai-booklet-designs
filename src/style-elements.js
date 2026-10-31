import { getGeneratorCatalog } from './catalog.js';
import { safeClass } from './utils.js';

// Renders a style's decorative elements (data/catalog/style-elements.json) into
// one layer per page. Every style shares the same five controls:
//   amount     0–5    how many of the style's elements appear
//   scale   -100–100  element size
//   position   0–100  moves elements clockwise around the page edge
//   variation  0–100  how differently each page is decorated
//   color      auto | c1 | c2 | c3 | c4 | ink (palette slot or text colour)
// An element's own colour may also be a profile variable (--sports-yellow)
// or a hex value, for styles whose colours are not in palette slots.
// Text may contain {page}, replaced with the page number.
// Layout is seeded by page index, so a booklet always renders the same way.
// Per-element overrides ({ [id]: { visible, scale, position, variation, color } })
// replace the shared values for one element; visible is auto | show | hide.

export const ELEMENT_COLORS = ['auto', 'c1', 'c2', 'c3', 'c4', 'ink'];
const COLOR_TOKENS = { c1: 'var(--c1)', c2: 'var(--c2)', c3: 'var(--c3)', c4: 'var(--c4)', ink: 'currentColor' };
// Kinds that sit inside the page; the rest may bleed off the edge.
const INSET_KINDS = new Set(['stamp', 'text', 'label', 'bar', 'pill', 'star', 'cross', 'petal', 'slash',
  'barcode', 'chart', 'play', 'progress', 'tapebit']);

function colorValue(token) {
  if (COLOR_TOKENS[token]) return COLOR_TOKENS[token];
  if (/^--[a-z0-9-]+$/.test(token)) return `var(${token}, var(--c2))`;
  if (/^#[0-9a-f]{3,8}$/i.test(token)) return token;
  return COLOR_TOKENS.c2;
}

function elementCatalog() {
  return getGeneratorCatalog()?.styleElements || null;
}

export function styleElementSet(profile) {
  const catalog = elementCatalog();
  if (!catalog?.styles) return null;
  return catalog.styles[profile] || catalog.styles.default || null;
}

export function defaultElementAmount(profile) {
  const set = styleElementSet(profile);
  return set ? Math.max(0, Math.min(5, Number(set.defaultAmount ?? 1))) : 0;
}

function kindPlacement(kind) {
  const kinds = elementCatalog()?.kinds || {};
  if (kinds.edge?.includes(kind)) return 'edge';
  if (kinds.fill?.includes(kind)) return 'fill';
  return 'point';
}

// Small deterministic PRNG (mulberry32).
function seededRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function hashString(value) {
  return [...String(value)].reduce((hash, character) => Math.imul(hash ^ character.charCodeAt(0), 16777619) >>> 0, 2166136261);
}

// Point on the page edge, clockwise from the top-left corner, in percent.
function perimeterPoint(t) {
  const position = ((t % 1) + 1) % 1 * 4;
  const side = Math.floor(position);
  const along = (position - side) * 100;
  if (side === 0) return { x: along, y: 0, side: 'top' };
  if (side === 1) return { x: 100, y: along, side: 'right' };
  if (side === 2) return { x: 100 - along, y: 100, side: 'bottom' };
  return { x: 0, y: 100 - along, side: 'left' };
}

export function elementLabel(element) {
  const id = String(element.id || element.kind || '');
  return id.charAt(0).toUpperCase() + id.slice(1).replace(/-/g, ' ');
}

function chooseElements(elements, count, variation, random) {
  const order = elements.map((element, index) => ({ element, index }));
  if (variation >= 50) {
    // Strong variation: each page draws its own subset, primary element first more often.
    order.forEach(entry => { entry.weight = random() + (entry.index === 0 ? 0.35 : 0); });
    order.sort((a, b) => b.weight - a.weight);
  }
  return order.slice(0, count).map(entry => entry.element);
}

function elementNode(element, settings, seed, lang, pageNumber) {
  const random = seededRandom(hashString(`${seed}:${element.id || element.kind}`));
  const variation = settings.variation / 100;
  const jitter = amount => (random() - 0.5) * 2 * amount * variation;
  const scale = 2 ** (settings.scale / 60);
  const size = Math.max(0.005, Number(element.size || 0.2) * scale * (1 + jitter(0.35)));
  const rotate = Number(element.rotate || 0) + jitter(35);
  const placement = kindPlacement(element.kind);
  const colorToken = settings.color !== 'auto' ? settings.color : element.color || 'c2';

  const node = document.createElement('i');
  node.className = `se se-${safeClass(element.kind)} se-${placement}`;
  node.dataset.element = element.id || element.kind;
  node.style.setProperty('--se-size', `${(size * 100).toFixed(2)}cqw`);
  node.style.setProperty('--se-rotate', `${rotate.toFixed(1)}deg`);
  node.style.setProperty('--se-opacity', String(Math.max(0, Math.min(1, Number(element.opacity ?? 1)))));
  node.style.setProperty('--se-color', colorValue(colorToken));
  node.style.setProperty('--se-rand', random().toFixed(3));
  // Text on filled shapes uses the paper colour, or the accent when the shape itself is paper-coloured.
  node.style.setProperty('--se-on', colorToken === 'c1' ? 'var(--c2)' : 'var(--c1)');
  if (element.variant) node.dataset.variant = safeClass(element.variant);
  if (element.thickness) node.style.setProperty('--se-thickness', String(Number(element.thickness)));

  if (placement !== 'fill') {
    const anchor = Number(element.anchor || 0) + settings.position / 100 + jitter(0.16);
    const point = perimeterPoint(anchor);
    if (placement === 'point' && INSET_KINDS.has(element.kind)) {
      // .se-inset aligns the element by the same percentage of its own size,
      // so labels near an edge stay fully on the page.
      node.classList.add('se-inset');
      point.x = 6 + point.x * 0.88;
      point.y = 6 + point.y * 0.88;
    }
    node.dataset.side = point.side;
    node.style.setProperty('--se-x', `${point.x.toFixed(2)}%`);
    node.style.setProperty('--se-y', `${point.y.toFixed(2)}%`);
  }

  const label = element.text?.[lang] || element.text?.en;
  if (label) {
    const text = document.createElement('span');
    const filled = label.replaceAll('{page}', String(pageNumber));
    text.textContent = element.kind === 'ticker' || element.kind === 'tape' ? filled.repeat(6) : filled;
    node.append(text);
  }
  return node;
}

function normalizedSettings({ scale = 0, position = 0, variation = 40, color = 'auto' }) {
  return {
    scale: Math.max(-100, Math.min(100, Number(scale) || 0)),
    position: Math.max(0, Math.min(100, Number(position) || 0)),
    variation: Math.max(0, Math.min(100, Number(variation) || 0)),
    color: ELEMENT_COLORS.includes(color) ? color : 'auto'
  };
}

export function renderStyleElements(pageNode, {
  profile, pageIndex, amount, scale = 0, position = 0, variation = 40, color = 'auto',
  overrides = {}, selected = ''
}) {
  pageNode.querySelector(':scope > .style-elements')?.remove();
  const set = styleElementSet(profile);
  pageNode.classList.toggle('has-style-elements', Boolean(set));
  if (!set || !Array.isArray(set.elements) || !set.elements.length) return;

  const level = Math.max(0, Math.min(5, Number(amount ?? set.defaultAmount ?? 1)));
  const forced = set.elements.filter(element => overrides[element.id]?.visible === 'show');
  if (!level && !forced.length) return;
  const count = level ? Math.max(1, Math.round((level / 5) * set.elements.length)) : 0;
  const settings = normalizedSettings({ scale, position, variation, color });
  const seed = `${profile}:${pageIndex}`;
  const random = seededRandom(hashString(seed));
  const lang = document.documentElement.lang === 'ru' ? 'ru' : 'en';

  const layer = document.createElement('div');
  layer.className = 'style-elements';
  layer.setAttribute('aria-hidden', 'true');
  const chosen = chooseElements(set.elements, count, settings.variation, random)
    .filter(element => overrides[element.id]?.visible !== 'hide');
  forced.forEach(element => { if (!chosen.includes(element)) chosen.push(element); });
  chosen.forEach(element => {
    const own = overrides[element.id] || {};
    const node = elementNode(element, normalizedSettings({ ...settings, ...own }), seed, lang, pageIndex + 1);
    if (selected && element.id === selected) node.classList.add('se-selected');
    layer.append(node);
  });
  pageNode.append(layer);
}
