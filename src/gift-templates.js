import { resolveRootUrl } from './utils.js';
import { getGeneratorCatalog } from './catalog.js';
import { openBooklet } from './detail-modal.js';
import { openBookletEditor, editorStorageKey } from './editor.js';
import { readGiftLink } from './gift-links.js';
import { GIFT_PHOTO_API } from './config.js';

let templatesPromise = null;

function loadGiftTemplates() {
  templatesPromise ||= fetch(resolveRootUrl('data/gift-templates.json'))
    .then(response => {
      if (!response.ok) throw new Error(`Failed to load gift templates: ${response.status}`);
      return response.json();
    })
    .catch(error => {
      templatesPromise = null;
      throw error;
    });
  return templatesPromise;
}

function fillName(value, name) {
  return typeof value === 'string' ? value.replaceAll('{name}', name) : value;
}

export function buildGiftBooklet(themeId, template, lang, name) {
  const style = getGeneratorCatalog()?.styles?.items?.find(item => item.id === template.profile);
  const contract = style?.contract || {};
  const palette = template.palette || contract.palette || ['#f2eee4', '#ed5d40', '#234fde', '#151515'];
  const fonts = [...new Set([...(template.fonts || contract.fonts || []), 'DM Sans'])];
  const sourcePages = template.pages[lang] || template.pages.en;
  const pages = sourcePages.map((page, pageIndex) => ({
    ...Object.fromEntries(Object.entries(page).map(([key, value]) => [key, fillName(value, name)])),
    textAlign: page.textAlign || 'left',
    pageIndex
  }));
  const label = style?.labels?.[lang] || style?.labels?.en || template.profile;

  return {
    id: `gift-${themeId}-${lang}`,
    isStarterDraft: true,
    gift: { template: themeId, lang, name },
    title: pages[0]?.title || name,
    topic: pages[0]?.title || name,
    audience: name,
    category: 'Gifts',
    era: '2026',
    style: label,
    layout: 'editorial',
    direction: `${label}.`,
    description: lang === 'ru'
      ? 'Готовый шаблон подарка. Меняйте текст, добавляйте фото и двигайте ползунки — всё сохраняется в этом браузере.'
      : 'A ready-made gift template. Change the text, add photos and move the sliders — everything is saved in this browser.',
    format: `A5 print / ${pages.length} pages`,
    palette,
    publishDate: new Date().toISOString().slice(0, 10),
    designDna: {
      styleFamily: template.profile,
      style: label,
      coverArchetype: template.coverArchetype || 'type-only',
      fontPalette: fonts,
      fontCount: fonts.length,
      palette,
      pageCount: pages.length
    },
    pages
  };
}

function giftLanguage() {
  return document.documentElement.lang === 'ru' ? 'ru' : 'en';
}

// Opens a gift received through a link. The sender's edits are copied into
// this browser's editor storage once, so the recipient can keep editing.
export async function openSharedGift() {
  const shared = await readGiftLink();
  if (!shared) return false;
  const data = await loadGiftTemplates();
  const template = data.templates?.[shared.template];
  if (!template) throw new Error(`Unknown gift template: ${shared.template}`);

  const booklet = buildGiftBooklet(shared.template, template, shared.lang, shared.name || (shared.lang === 'ru' ? 'Саша' : 'Alex'));
  booklet.id = `gift-shared-${shared.linkId}`;
  booklet.isReceivedGift = true;
  booklet.description = shared.lang === 'ru'
    ? 'Этот буклет сделали для вас. Листайте, скачайте PDF или сделайте ответный подарок.'
    : 'This booklet was made for you. Read it, download the PDF, or make one back.';
  const storageKey = editorStorageKey(booklet);
  try {
    if (!localStorage.getItem(storageKey)) localStorage.setItem(storageKey, JSON.stringify(shared.state));
  } catch {
    // Without storage the gift still opens, just without the sender's edits.
  }
  openBooklet(booklet, false);
  retryFreshGiftPhotos();
  return true;
}

// Workers KV can take up to a minute to serve a new photo everywhere, so a
// friend who opens the link straight away may briefly get 404s.
function retryFreshGiftPhotos() {
  const root = document.querySelector('#dialog-content');
  if (!root || !GIFT_PHOTO_API) return;
  root.addEventListener('error', event => {
    const img = event.target;
    if (!(img instanceof HTMLImageElement) || !img.src.startsWith(GIFT_PHOTO_API)) return;
    const attempt = Number(img.dataset.giftRetry || 0);
    if (attempt >= 4) return;
    img.dataset.giftRetry = String(attempt + 1);
    window.setTimeout(() => {
      const url = new URL(img.src);
      url.searchParams.set('retry', String(attempt + 1));
      img.src = url.toString();
    }, 15000);
  }, true);
}

export async function openGiftTemplate(themeId, name) {
  const data = await loadGiftTemplates();
  const template = data.templates?.[themeId];
  if (!template) throw new Error(`Unknown gift template: ${themeId}`);

  const lang = giftLanguage();
  const fallbackName = lang === 'ru' ? 'Саша' : 'Alex';
  const booklet = buildGiftBooklet(themeId, template, lang, String(name || '').trim() || fallbackName);
  openBooklet(booklet, false);
  requestAnimationFrame(() => openBookletEditor());
}

export function initGiftTemplates() {
  openSharedGift().catch(error => {
    console.error(error);
    window.alert(giftLanguage() === 'ru' ? 'Не удалось открыть подарок: ссылка повреждена.' : 'Could not open this gift: the link looks damaged.');
  });

  const demoName = () => document.querySelector('[data-demo-name]')?.value;

  // "Make a booklet" opens the template behind the style currently shown in the demo.
  document.querySelector('[data-gift-from-demo]')?.addEventListener('click', () => {
    const template = document.querySelector('[data-style-demo] .gift-cover')?.dataset.template || 'news';
    openGiftTemplate(template, demoName()).catch(error => console.error(error));
  });

  document.querySelectorAll('[data-gift-template]').forEach(tile => {
    tile.addEventListener('click', () => {
      const topic = document.querySelector('#booklet-topic');
      if (topic) topic.value = tile.dataset.themeTopic || '';
      openGiftTemplate(tile.dataset.giftTemplate, demoName()).catch(error => console.error(error));
    });
  });
}
