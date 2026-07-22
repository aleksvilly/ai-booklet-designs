const grid = document.querySelector('#booklet-grid');
const filtersNode = document.querySelector('#filters');
const template = document.querySelector('#booklet-card-template');
const dialog = document.querySelector('#booklet-dialog');
const dialogContent = document.querySelector('#dialog-content');
const countNode = document.querySelector('#published-count');
const emptyState = document.querySelector('#empty-state');

let allBooklets = [];
let activeFilter = 'All';
const loadedFontRequests = new Set();
const today = new Date();
today.setHours(23, 59, 59, 999);

function escapeHtml(value = '') {
  return String(value).replace(/[&<>'"]/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  })[char]);
}

function safeUrl(value = '') {
  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol) ? url.href : '#';
  } catch {
    return '#';
  }
}

function safeClass(value = '') {
  return String(value).toLowerCase().replace(/[^a-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '');
}

function safeFontName(value = 'DM Sans') {
  const cleaned = String(value).replace(/[^a-zA-Z0-9 \-]+/g, '').trim();
  return cleaned || 'DM Sans';
}

function fontStack(value = 'DM Sans') {
  const family = safeFontName(value);
  const serif = /serif|garamond|baskerville|baskerville|lora|spectral|fraunces|prata|cinzel|cardo|merriweather|gloock|bodoni|yeseva|abril/i.test(family);
  const mono = /mono|code|vt323/i.test(family);
  return `"${family}", ${mono ? 'monospace' : serif ? 'serif' : 'sans-serif'}`;
}

function safeRotation(value) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(-12, Math.min(12, number)) : 0;
}

function safeImagePosition(value = 'center') {
  const allowed = new Set(['center', 'center top', 'center bottom', 'left center', 'right center']);
  return allowed.has(value) ? value : 'center';
}

function applyPalette(node, palette = []) {
  const fallback = ['#f2eee4', '#ed5d40', '#234fde', '#151515'];
  [...fallback].map((color, index) => palette[index] || color).forEach((color, index) => {
    node.style.setProperty(`--c${index + 1}`, color);
  });
}

function designClasses(item) {
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

function fontsFor(item) {
  const dna = item.designDna || {};
  const fonts = Array.isArray(dna.fontPalette) ? dna.fontPalette : [];
  return [...new Set(fonts.map(safeFontName).filter(Boolean))].slice(0, 20);
}

function loadGoogleFonts(families, requestName = 'booklet') {
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

function setFontVariables(node, item, page = null) {
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

function isPublished(item) {
  return new Date(`${item.publishDate}T00:00:00`) <= today;
}

function visibleBooklets() {
  return allBooklets
    .filter(isPublished)
    .filter(item => activeFilter === 'All' || item.category === activeFilter)
    .sort((a, b) => b.publishDate.localeCompare(a.publishDate));
}

function coverTitle(title = '') {
  const words = String(title).split(' ').filter(Boolean);
  return words.length < 3 ? title : `${words.slice(0, -1).join(' ')}\n${words.at(-1)}`;
}

function legacyPages(item) {
  const titles = item.spreads || ['Opening statement', 'A world in fragments', 'The central visual story', 'A quiet final note'];
  return titles.map((title, index) => ({
    type: index === 0 ? 'cover' : index === titles.length - 1 ? 'closing' : 'editorial',
    module: index === 0 ? 'cover' : index === titles.length - 1 ? 'closing' : 'micro_essay',
    title,
    body: item.spreadNotes?.[index] || 'A distinct editorial moment using scale, contrast and controlled asymmetry.',
    layout: ['minimal', 'split', 'overlap', 'full'][index % 4]
  }));
}

function pagesFor(item) {
  return Array.isArray(item.pages) && item.pages.length ? item.pages : legacyPages(item);
}

function imagesForPage(page = {}) {
  const images = Array.isArray(page.images) && page.images.length
    ? page.images
    : page.image
      ? [page.image]
      : [];
  return images.filter(image => safeUrl(image?.url || '') !== '#');
}

function imageCredit(image, compact = false) {
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

function createCardCoverMedia(cover, item, page, index) {
  const images = imagesForPage(page);
  if (!images.length) return;

  const media = document.createElement('span');
  media.className = `cover-media cover-media-${Math.min(20, images.length)}`;

  images.slice(0, 20).forEach((image, imageIndex) => {
    const img = document.createElement('img');
    img.src = safeUrl(image.url);
    img.alt = image.alt || item.title;
    img.decoding = 'async';
    img.loading = index < 3 ? 'eager' : 'lazy';
    img.style.setProperty('--media-index', imageIndex);
    media.append(img);
  });

  const credit = document.createElement('small');
  credit.className = 'cover-credit';
  credit.innerHTML = imageCredit(images[0], true);
  media.append(credit);
  cover.prepend(media);
  cover.classList.add('has-cover-media');
}

function renderFilters() {
  const categories = ['All', ...new Set(allBooklets.filter(isPublished).map(item => item.category))];
  filtersNode.innerHTML = '';
  for (const category of categories) {
    const button = document.createElement('button');
    button.className = `filter-button${category === activeFilter ? ' active' : ''}`;
    button.type = 'button';
    button.textContent = category;
    button.addEventListener('click', () => {
      activeFilter = category;
      renderFilters();
      renderCards();
    });
    filtersNode.append(button);
  }
}

function renderCards() {
  const items = visibleBooklets();
  grid.innerHTML = '';
  emptyState.hidden = items.length > 0;

  const collectionFonts = items.slice(0, 18).flatMap(item => fontsFor(item).slice(0, 2));
  loadGoogleFonts(collectionFonts, 'collection');

  items.forEach((item, index) => {
    const pages = pagesFor(item);
    const firstPage = pages[0] || {};
    const dna = item.designDna || {};
    const card = template.content.firstElementChild.cloneNode(true);
    const cover = card.querySelector('.cover');

    card.dataset.layout = item.layout;
    card.dataset.cover = dna.coverArchetype || 'type-only';
    card.classList.add(...designClasses(item).split(' '));
    cover.classList.add(`cover-${safeClass(dna.coverArchetype || 'type-only')}`);
    applyPalette(card, item.palette);
    setFontVariables(card, item, firstPage);

    card.querySelector('.cover-kicker').textContent = `${item.era} / ${item.style}`;
    card.querySelector('.cover-title').textContent = coverTitle(item.title);
    card.querySelector('.cover-number').textContent = String(index + 1).padStart(2, '0');
    card.querySelector('.card-audience').textContent = `For ${item.audience} · ${pages.length} print pages · ${dna.fontCount || fontsFor(item).length || 2} fonts`;
    card.querySelector('.card-title').textContent = item.title;
    card.querySelector('.card-direction').textContent = item.direction;

    createCardCoverMedia(cover, item, firstPage, index);
    cover.addEventListener('click', () => openBooklet(item));
    grid.append(card);
  });
}

function imageMarkup(image, page, index, total) {
  const imageUrl = safeUrl(image?.url || '');
  if (imageUrl === '#') return '';
  const alt = escapeHtml(image.alt || page.title || 'Booklet image');
  const label = escapeHtml(String(image.alt || `Image ${index + 1}`).slice(0, 58));
  return `<figure class="gallery-image gallery-image-${index + 1}">
    <img data-src="${escapeHtml(imageUrl)}" alt="${alt}" decoding="async">
    <figcaption><span>${String(index + 1).padStart(2, '0')} / ${label}</span><small>${imageCredit(image, true)}</small></figcaption>
  </figure>`;
}

function mediaMarkup(page) {
  const images = imagesForPage(page);
  if (!images.length) return '<span class="page-art" aria-hidden="true"></span>';

  if (images.length === 1) {
    const image = images[0];
    return `<figure class="page-image">
      <img data-src="${escapeHtml(safeUrl(image.url))}" alt="${escapeHtml(image.alt || page.title)}" decoding="async">
      <figcaption>${imageCredit(image)}</figcaption>
    </figure>`;
  }

  return `<div class="page-gallery gallery-count-${Math.min(20, images.length)}">
    ${images.slice(0, 20).map((image, index) => imageMarkup(image, page, index, images.length)).join('')}
  </div>`;
}

function sourceMarkup(page) {
  if (!page.source?.url) return '';
  return `<a class="page-source" href="${safeUrl(page.source.url)}" target="_blank" rel="noopener">Source suggestion: ${escapeHtml(page.source.title)} ↗</a>`;
}

function pageMarkup(page, index, item) {
  const hasMedia = imagesForPage(page).length > 0;
  const classes = [
    hasMedia ? 'has-image' : 'no-image',
    `effect-${safeClass(page.effect || 'none')}`,
    `typeface-${safeClass(page.typography || 'clean-sans')}`,
    `background-${safeClass(page.background || 'pure')}`,
    `image-treatment-${safeClass(page.imageTreatment || 'clean-photo')}`,
    `align-${safeClass(page.textAlign || 'left')}`,
    `module-${safeClass(page.module || page.type || 'editorial')}`,
    `type-${safeClass(page.type || 'editorial')}`,
    `layout-${safeClass(page.layout || 'minimal')}`,
    `headline-${safeClass(page.headlineScale || 'medium')}`,
    `body-${safeClass(page.bodyScale || 'normal')}`,
    `columns-${Math.max(1, Math.min(4, Number(page.textColumns || 1)))}`,
    page.spreadRole ? `spread-role-${safeClass(page.spreadRole)}` : '',
    page.spreadKind ? `spread-kind-${safeClass(page.spreadKind)}` : ''
  ].filter(Boolean).join(' ');

  const fontFamily = safeFontName(page.fontFamily || fontsFor(item)[index % Math.max(1, fontsFor(item).length)] || 'DM Sans');
  const style = [
    `--page-rotation:${safeRotation(page.rotation)}deg`,
    `--image-position:${safeImagePosition(page.imagePosition)}`,
    `--page-font:${fontStack(fontFamily)}`,
    `--page-weight:${Math.max(100, Math.min(900, Number(page.fontWeight || 600)))}`
  ].join(';');

  return `<article style="${escapeHtml(style)}" class="book-page ${classes}" data-spread-id="${escapeHtml(page.spreadId || '')}">
    <span class="book-page-number">${String(index + 1).padStart(2, '0')}</span>
    ${mediaMarkup(page)}
    <div class="book-page-copy">
      <p class="book-page-type">${escapeHtml((page.module || page.type || 'editorial').replaceAll('_', ' '))}</p>
      <h4>${escapeHtml(page.title || '')}</h4>
      <p class="page-body">${escapeHtml(page.body || '')}</p>
      ${page.caption ? `<small class="page-caption">${escapeHtml(page.caption)}</small>` : ''}
      ${sourceMarkup(page)}
    </div>
  </article>`;
}

function spreadsMarkup(pages, item) {
  const spreads = [];
  for (let index = 0; index < pages.length; index += 2) {
    const left = pages[index];
    const right = pages[index + 1];
    const continuous = left?.spreadId && right?.spreadId && left.spreadId === right.spreadId;
    const kind = continuous ? left.spreadKind || 'continuous' : 'standard';
    spreads.push(`<section class="print-spread ${continuous ? 'continuous-spread' : ''} spread-${safeClass(kind)}">
      ${pageMarkup(left, index, item)}
      ${right ? pageMarkup(right, index + 1, item) : '<article class="book-page blank-page"></article>'}
    </section>`);
  }
  return spreads.join('');
}

function coverVisualMarkup(item, page) {
  const images = imagesForPage(page).slice(0, 20);
  if (!images.length) return '<span class="detail-cover-art detail-cover-art-a"></span><span class="detail-cover-art detail-cover-art-b"></span>';
  return `<div class="detail-cover-media detail-cover-media-${images.length}">
    ${images.map((image, index) => `<figure><img data-src="${escapeHtml(safeUrl(image.url))}" alt="${escapeHtml(image.alt || item.title)}" decoding="async"><figcaption>${imageCredit(image, true)}</figcaption></figure>`).join('')}
  </div>`;
}

function detailHtml(item) {
  const pages = pagesFor(item);
  const firstPage = pages[0] || {};
  const dna = item.designDna || {};
  const classes = designClasses(item);
  const palette = item.palette || ['#f2eee4', '#ed5d40', '#234fde', '#151515'];
  const style = `--c1:${palette[0]};--c2:${palette[1]};--c3:${palette[2]};--c4:${palette[3]};--font-cover:${fontStack(dna.fontPalette?.[0] || 'Playfair Display')};--font-body:${fontStack(dna.fontPalette?.[1] || 'DM Sans')}`;

  return `<section class="detail-hero ${classes}" style="${escapeHtml(style)}">
      <div class="detail-cover cover-${safeClass(dna.coverArchetype || 'type-only')}">
        ${coverVisualMarkup(item, firstPage)}
        <p class="eyebrow">For ${escapeHtml(item.audience)}</p>
        <h2 class="detail-title">${escapeHtml(coverTitle(item.title))}</h2>
        <p class="detail-cover-code">${escapeHtml(dna.coverArchetype || 'cover')} / ${dna.fontCount || fontsFor(item).length || 2} fonts</p>
      </div>
      <div class="detail-meta">
        <p class="eyebrow">Concept ${escapeHtml(item.publishDate)}</p>
        <p class="detail-description">${escapeHtml(item.description)}</p>
        <div class="detail-facts">
          <div><span>Era</span><strong>${escapeHtml(item.era)}</strong></div>
          <div><span>Direction</span><strong>${escapeHtml(item.style)}</strong></div>
          <div><span>Format</span><strong>${escapeHtml(item.format)}</strong></div>
          <div><span>Typography</span><strong>${escapeHtml((dna.fontPalette || []).slice(0, 4).join(' / ') || dna.typographyMode || 'Mixed')}</strong></div>
        </div>
      </div>
    </section>
    <section class="spread-section ${classes}" style="${escapeHtml(style)}">
      <div class="spread-heading">
        <h3>Print spreads</h3>
        <p>${escapeHtml(item.direction)} Each row represents one A4 landscape print spread containing two A5 pages.</p>
      </div>
      <div class="spreads-list">${spreadsMarkup(pages, item)}</div>
      <div class="detail-actions">
        <button type="button" data-action="copy">Copy share link</button>
        <button type="button" data-action="print">Print / save PDF</button>
        <button type="button" data-action="close">Back to collection</button>
      </div>
    </section>`;
}

function loadDialogImages(root) {
  const images = root.querySelectorAll('img[data-src]');
  images.forEach(image => {
    const container = image.closest('figure, .page-image, .detail-cover-media');
    const source = image.dataset.src;
    if (!source) return;

    const markLoaded = () => container?.classList.add('is-loaded');
    const markFailed = () => {
      container?.classList.add('is-error');
      image.remove();
    };

    image.addEventListener('load', markLoaded, { once: true });
    image.addEventListener('error', markFailed, { once: true });
    image.loading = 'eager';
    image.src = source;
    image.removeAttribute('data-src');

    if (image.complete) {
      if (image.naturalWidth > 0) markLoaded();
      else markFailed();
    }
  });
}

function activateGeneratedEffects(root) {
  const observer = 'IntersectionObserver' in window
    ? new IntersectionObserver(entries => {
        entries.forEach(entry => entry.target.classList.toggle('in-view', entry.isIntersecting));
      }, { root: dialog, threshold: 0.12 })
    : null;

  root.querySelectorAll('.book-page').forEach(page => observer?.observe(page));

  root.querySelectorAll('.effect-parallax-depth').forEach(page => {
    const images = page.querySelectorAll('img');
    if (!images.length || !window.matchMedia('(pointer:fine)').matches) return;

    page.addEventListener('pointermove', event => {
      const rect = page.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / rect.width - 0.5) * 14;
      const y = ((event.clientY - rect.top) / rect.height - 0.5) * 14;
      images.forEach(image => {
        image.style.setProperty('--parallax-x', `${x}px`);
        image.style.setProperty('--parallax-y', `${y}px`);
      });
    });

    page.addEventListener('pointerleave', () => {
      images.forEach(image => {
        image.style.setProperty('--parallax-x', '0px');
        image.style.setProperty('--parallax-y', '0px');
      });
    });
  });
}

function openBooklet(item, updateUrl = true) {
  loadGoogleFonts(fontsFor(item), `booklet-${safeClass(item.id)}`);
  dialogContent.innerHTML = detailHtml(item);
  applyPalette(dialogContent, item.palette);
  setFontVariables(dialogContent, item, pagesFor(item)[0]);

  if (updateUrl) {
    const url = new URL(window.location.href);
    url.searchParams.set('booklet', item.id);
    history.pushState({ booklet: item.id }, '', url);
  }

  dialog.showModal();
  requestAnimationFrame(() => {
    loadDialogImages(dialogContent);
    activateGeneratedEffects(dialogContent);
  });

  dialogContent.querySelector('[data-action="close"]').addEventListener('click', closeDialog);
  dialogContent.querySelector('[data-action="print"]').addEventListener('click', () => window.print());
  dialogContent.querySelector('[data-action="copy"]').addEventListener('click', async event => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      event.currentTarget.textContent = 'Link copied';
    } catch {
      event.currentTarget.textContent = 'Copy failed';
    }
  });
}

function closeDialog() {
  dialog.close();
  const url = new URL(window.location.href);
  url.searchParams.delete('booklet');
  history.pushState({}, '', url);
}

document.querySelector('#dialog-close').addEventListener('click', closeDialog);
dialog.addEventListener('click', event => {
  const rect = dialog.getBoundingClientRect();
  const outside = event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom;
  if (outside) closeDialog();
});
window.addEventListener('popstate', () => {
  const id = new URL(window.location.href).searchParams.get('booklet');
  if (!id) return dialog.close();
  const item = allBooklets.find(booklet => booklet.id === id);
  if (item) openBooklet(item, false);
});
document.querySelector('#surprise-button').addEventListener('click', () => {
  const items = allBooklets.filter(isPublished);
  if (items.length) openBooklet(items[Math.floor(Math.random() * items.length)]);
});

async function init() {
  const response = await fetch('./data/booklets.json', { cache: 'no-store' });
  if (!response.ok) throw new Error(`Failed to load booklets: ${response.status}`);
  allBooklets = await response.json();
  countNode.textContent = `${allBooklets.filter(isPublished).length} published`;
  renderFilters();
  renderCards();

  const requestedId = new URL(window.location.href).searchParams.get('booklet');
  const requested = allBooklets.find(item => item.id === requestedId && isPublished(item));
  if (requested) openBooklet(requested, false);
}

init().catch(error => {
  console.error(error);
  grid.innerHTML = '<p>Unable to load the collection. Please refresh the page.</p>';
});
