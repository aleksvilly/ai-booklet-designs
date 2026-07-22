const grid = document.querySelector('#booklet-grid');
const filtersNode = document.querySelector('#filters');
const template = document.querySelector('#booklet-card-template');
const dialog = document.querySelector('#booklet-dialog');
const dialogContent = document.querySelector('#dialog-content');
const countNode = document.querySelector('#published-count');
const emptyState = document.querySelector('#empty-state');

let allBooklets = [];
let activeFilter = 'All';
const today = new Date();
today.setHours(23, 59, 59, 999);

function escapeHtml(value = '') {
  return String(value).replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[char]);
}
function safeUrl(value = '') {
  try { const url = new URL(value); return ['http:', 'https:'].includes(url.protocol) ? url.href : '#'; }
  catch { return '#'; }
}
function safeClass(value = '') {
  return String(value).toLowerCase().replace(/[^a-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '');
}
function safeRotation(value) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(-12, Math.min(12, number)) : 0;
}
function safeImagePosition(value = 'center') {
  const allowed = new Set(['center', 'center top', 'center bottom', 'left center', 'right center']);
  return allowed.has(value) ? value : 'center';
}
function designClasses(item) {
  const dna = item.designDna || {};
  return [
    `style-${safeClass(dna.styleFamily || item.layout || 'editorial')}`,
    `color-${safeClass(dna.colorMode || 'default')}`,
    `archetype-${safeClass(dna.archetype || 'booklet')}`,
    `rhythm-${safeClass(dna.visualRhythm || 'balanced')}`,
    `shape-${safeClass(dna.shapeLanguage || 'mixed')}`
  ].join(' ');
}
function isPublished(item) { return new Date(`${item.publishDate}T00:00:00`) <= today; }
function visibleBooklets() {
  return allBooklets.filter(isPublished).filter(item => activeFilter === 'All' || item.category === activeFilter)
    .sort((a, b) => b.publishDate.localeCompare(a.publishDate));
}
function coverTitle(title) {
  const words = title.split(' ');
  return words.length < 3 ? title : `${words.slice(0, -1).join(' ')}\n${words.at(-1)}`;
}
function applyPalette(node, palette) { palette.forEach((color, index) => node.style.setProperty(`--c${index + 1}`, color)); }

function legacyPages(item) {
  const titles = item.spreads || ['Opening statement', 'A world in fragments', 'The central visual story', 'A quiet final note'];
  return titles.map((title, index) => ({
    type: index === 0 ? 'cover' : index === titles.length - 1 ? 'closing' : 'editorial',
    title,
    body: item.spreadNotes?.[index] || 'A distinct editorial moment using scale, contrast and controlled asymmetry.',
    layout: ['minimal', 'split', 'overlap', 'full'][index % 4]
  }));
}
function pagesFor(item) { return Array.isArray(item.pages) && item.pages.length ? item.pages : legacyPages(item); }

function renderFilters() {
  const categories = ['All', ...new Set(allBooklets.filter(isPublished).map(item => item.category))];
  filtersNode.innerHTML = '';
  for (const category of categories) {
    const button = document.createElement('button');
    button.className = `filter-button${category === activeFilter ? ' active' : ''}`;
    button.type = 'button';
    button.textContent = category;
    button.addEventListener('click', () => { activeFilter = category; renderFilters(); renderCards(); });
    filtersNode.append(button);
  }
}

function renderCards() {
  const items = visibleBooklets();
  grid.innerHTML = '';
  emptyState.hidden = items.length > 0;
  items.forEach((item, index) => {
    const card = template.content.firstElementChild.cloneNode(true);
    card.dataset.layout = item.layout;
    card.classList.add(...designClasses(item).split(' '));
    applyPalette(card, item.palette);
    card.querySelector('.cover-kicker').textContent = `${item.era} / ${item.style}`;
    card.querySelector('.cover-title').textContent = coverTitle(item.title);
    card.querySelector('.cover-number').textContent = String(index + 1).padStart(2, '0');
    card.querySelector('.card-audience').textContent = `For ${item.audience} · ${pagesFor(item).length} pages`;
    card.querySelector('.card-title').textContent = item.title;
    card.querySelector('.card-direction').textContent = item.direction;
    card.querySelector('.cover').addEventListener('click', () => openBooklet(item));
    grid.append(card);
  });
}

function imageMarkup(page) {
  const imageUrl = safeUrl(page.image?.url || '');

  if (imageUrl === '#') {
    return '<span class="page-art" aria-hidden="true"></span>';
  }

  const image = page.image;

  // Keep the real URL in data-src. The src is assigned only after the
  // <dialog> becomes visible; this avoids mobile lazy-loading bugs.
  return `<figure class="page-image">
    <img
      data-src="${escapeHtml(imageUrl)}"
      alt="${escapeHtml(image.alt || page.title)}"
      decoding="async"
    >
    <figcaption>© <a href="${safeUrl(image.creatorUrl || image.sourceUrl)}" target="_blank" rel="noopener">${escapeHtml(image.creator || 'Creator')}</a> · <a href="${safeUrl(image.sourceUrl)}" target="_blank" rel="noopener">${escapeHtml(image.source || 'Source')}</a> · <a href="${safeUrl(image.licenseUrl || image.sourceUrl)}" target="_blank" rel="noopener">${escapeHtml(image.license || 'Licence')}</a></figcaption>
  </figure>`;
}
function sourceMarkup(page) {
  if (!page.source?.url) return '';
  return `<a class="page-source" href="${safeUrl(page.source.url)}" target="_blank" rel="noopener">Source suggestion: ${escapeHtml(page.source.title)} ↗</a>`;
}
function pageMarkup(page, index) {
  const hasImage = safeUrl(page.image?.url || '') !== '#';
  const imageClass = hasImage ? ' has-image' : '';
  const generatedClasses = [
    `effect-${safeClass(page.effect || 'none')}`,
    `typeface-${safeClass(page.typography || 'clean-sans')}`,
    `background-${safeClass(page.background || 'pure')}`,
    `image-treatment-${safeClass(page.imageTreatment || 'clean-photo')}`,
    `align-${safeClass(page.textAlign || 'left')}`,
    `module-${safeClass(page.module || page.type || 'editorial')}`
  ].join(' ');
  const style = `--page-rotation:${safeRotation(page.rotation)}deg;--image-position:${safeImagePosition(page.imagePosition)}`;

  return `<article style="${style}" class="book-page${imageClass} ${generatedClasses} type-${escapeHtml(page.type || 'editorial')} layout-${escapeHtml(page.layout || 'minimal')}">
    <span class="book-page-number">${String(index + 1).padStart(2, '0')}</span>
    ${imageMarkup(page)}
    <div class="book-page-copy">
      <p class="book-page-type">${escapeHtml((page.type || 'editorial').replaceAll('_', ' '))}</p>
      <h4>${escapeHtml(page.title)}</h4>
      <p>${escapeHtml(page.body)}</p>
      ${page.caption ? `<small>${escapeHtml(page.caption)}</small>` : ''}
      ${sourceMarkup(page)}
    </div>
  </article>`;
}

function detailHtml(item) {
  const pages = pagesFor(item);
  const classes = designClasses(item);
  return `<section class="detail-hero ${classes}" style="--c1:${item.palette[0]};--c2:${item.palette[1]};--c3:${item.palette[2]};--c4:${item.palette[3]}">
      <div class="detail-cover"><span class="detail-shape-a"></span><span class="detail-shape-b"></span><p class="eyebrow">For ${escapeHtml(item.audience)}</p><h2 class="detail-title">${escapeHtml(coverTitle(item.title))}</h2></div>
      <div class="detail-meta"><p class="eyebrow">Concept ${escapeHtml(item.publishDate)}</p><p class="detail-description">${escapeHtml(item.description)}</p>
        <div class="detail-facts"><div><span>Era</span><strong>${escapeHtml(item.era)}</strong></div><div><span>Direction</span><strong>${escapeHtml(item.style)}</strong></div><div><span>Format</span><strong>${escapeHtml(item.format)}</strong></div><div><span>Preview</span><strong>${pages.length} pages</strong></div></div>
      </div>
    </section>
    <section class="spread-section ${classes}" style="--c1:${item.palette[0]};--c2:${item.palette[1]};--c3:${item.palette[2]};--c4:${item.palette[3]}">
      <div class="spread-heading"><h3>Booklet preview</h3><p>${escapeHtml(item.direction)} Images keep creator, source and licence records. Facts include a source suggestion for verification.</p></div>
      <div class="page-grid">${pages.map(pageMarkup).join('')}</div>
      <div class="detail-actions"><button type="button" data-action="copy">Copy share link</button><button type="button" data-action="print">Print / save PDF</button><button type="button" data-action="close">Back to collection</button></div>
    </section>`;
}

function loadDialogImages(root) {
  const images = root.querySelectorAll('.page-image img[data-src]');

  images.forEach(image => {
    const figure = image.closest('.page-image');
    const page = image.closest('.book-page');
    const source = image.dataset.src;

    const markLoaded = () => {
      figure?.classList.add('is-loaded');
      page?.classList.add('image-loaded');
    };

    const markFailed = () => {
      figure?.remove();
      page?.classList.remove('has-image', 'image-loaded');
      page?.classList.add('image-error');
    };

    image.addEventListener('load', markLoaded, { once: true });
    image.addEventListener('error', markFailed, { once: true });

    // Do not use loading="lazy" inside the modal. Some mobile browsers
    // calculate lazy-loading visibility while the dialog is still hidden.
    image.loading = 'eager';
    image.src = source;
    image.removeAttribute('data-src');

    // Covers images already available in the browser cache.
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
      }, { root: dialog, threshold: 0.18 })
    : null;

  root.querySelectorAll('.book-page').forEach(page => observer?.observe(page));

  root.querySelectorAll('.effect-parallax-depth').forEach(page => {
    const image = page.querySelector('.page-image img');
    if (!image || !window.matchMedia('(pointer:fine)').matches) return;

    page.addEventListener('pointermove', event => {
      const rect = page.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / rect.width - 0.5) * 14;
      const y = ((event.clientY - rect.top) / rect.height - 0.5) * 14;
      image.style.setProperty('--parallax-x', `${x}px`);
      image.style.setProperty('--parallax-y', `${y}px`);
    });

    page.addEventListener('pointerleave', () => {
      image.style.setProperty('--parallax-x', '0px');
      image.style.setProperty('--parallax-y', '0px');
    });
  });
}

function openBooklet(item, updateUrl = true) {
  dialogContent.innerHTML = detailHtml(item);
  if (updateUrl) { const url = new URL(window.location.href); url.searchParams.set('booklet', item.id); history.pushState({ booklet: item.id }, '', url); }
  dialog.showModal();

  // Assign image src values only after the modal is visible.
  requestAnimationFrame(() => {
    loadDialogImages(dialogContent);
    activateGeneratedEffects(dialogContent);
  });

  dialogContent.querySelector('[data-action="close"]').addEventListener('click', closeDialog);
  dialogContent.querySelector('[data-action="print"]').addEventListener('click', () => window.print());
  dialogContent.querySelector('[data-action="copy"]').addEventListener('click', async event => { await navigator.clipboard.writeText(window.location.href); event.currentTarget.textContent = 'Link copied'; });
}
function closeDialog() { dialog.close(); const url = new URL(window.location.href); url.searchParams.delete('booklet'); history.pushState({}, '', url); }

document.querySelector('#dialog-close').addEventListener('click', closeDialog);
dialog.addEventListener('click', event => { const rect = dialog.getBoundingClientRect(); const outside = event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom; if (outside) closeDialog(); });
window.addEventListener('popstate', () => { const id = new URL(window.location.href).searchParams.get('booklet'); if (!id) return dialog.close(); const item = allBooklets.find(booklet => booklet.id === id); if (item) openBooklet(item, false); });
document.querySelector('#surprise-button').addEventListener('click', () => { const items = allBooklets.filter(isPublished); if (items.length) openBooklet(items[Math.floor(Math.random() * items.length)]); });

async function init() {
  const response = await fetch('./data/booklets.json', { cache: 'no-store' });
  if (!response.ok) throw new Error(`Failed to load booklets: ${response.status}`);
  allBooklets = await response.json();
  countNode.textContent = `${allBooklets.filter(isPublished).length} published`;
  renderFilters(); renderCards();
  const requestedId = new URL(window.location.href).searchParams.get('booklet');
  const requested = allBooklets.find(item => item.id === requestedId && isPublished(item));
  if (requested) openBooklet(requested, false);
}
init().catch(error => { console.error(error); grid.innerHTML = '<p>Unable to load the collection. Please refresh the page.</p>'; });
