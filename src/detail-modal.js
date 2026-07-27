import {
  escapeHtml,
  safeUrl,
  safeClass,
  fontStack,
  fontsFor,
  safeFontName,
  safeRotation,
  safeImagePosition,
  applyPalette,
  loadGoogleFonts,
  setFontVariables,
  designClasses,
  coverTitle,
  imageCredit,
  copyText
} from './utils.js';
import { pagesFor, imagesForPage, getCurrentPage } from './collection.js';
import { initializeBookletEditor, openBookletEditor, closeBookletEditor } from './editor.js';
import { openPrintSettings, closePrintSettings, setPrintExportItem } from './pdf-exporter.js';

export function imageMarkup(image, page, index, total) {
  const imageUrl = safeUrl(image?.url || '');
  if (imageUrl === '#') return '';
  const alt = escapeHtml(image.alt || page.title || 'Booklet image');
  const label = escapeHtml(String(image.alt || `Image ${index + 1}`).slice(0, 58));
  return `<figure class="gallery-image gallery-image-${index + 1}">
    <img data-src="${escapeHtml(imageUrl)}" alt="${alt}" decoding="async">
    <figcaption><span>${String(index + 1).padStart(2, '0')} / ${label}</span><small>${imageCredit(image, true)}</small></figcaption>
  </figure>`;
}

export function mediaMarkup(page) {
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

export function sourceMarkup(page) {
  if (!page.source?.url) return '';
  return `<a class="page-source" href="${safeUrl(page.source.url)}" target="_blank" rel="noopener">Source suggestion: ${escapeHtml(page.source.title)} ↗</a>`;
}

export function pageMarkup(page, index, item) {
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

  return `<article style="${escapeHtml(style)}" class="book-page ${classes}" data-page-index="${index}" data-spread-id="${escapeHtml(page.spreadId || '')}">
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

export function spreadsMarkup(pages, item) {
  const spreads = [];
  for (let index = 0; index < pages.length; index += 2) {
    const left = pages[index];
    const right = pages[index + 1];
    const continuous = left?.spreadId && right?.spreadId && left.spreadId === right.spreadId;
    const kind = continuous ? left.spreadKind || 'continuous' : 'standard';
    spreads.push(`<section class="print-spread ${continuous ? 'continuous-spread' : ''} spread-${safeClass(kind)}" data-spread-index="${Math.floor(index / 2)}">
      ${pageMarkup(left, index, item)}
      ${right ? pageMarkup(right, index + 1, item) : '<article class="book-page blank-page"></article>'}
    </section>`);
  }
  return spreads.join('');
}

export function coverVisualMarkup(item, page) {
  const images = imagesForPage(page).slice(0, 20);
  if (!images.length) return '<span class="detail-cover-art detail-cover-art-a"></span><span class="detail-cover-art detail-cover-art-b"></span>';
  return `<div class="detail-cover-media detail-cover-media-${images.length}">
    ${images.map((image, index) => `<figure><img data-src="${escapeHtml(safeUrl(image.url))}" alt="${escapeHtml(image.alt || item.title)}" decoding="async"><figcaption>${imageCredit(image, true)}</figcaption></figure>`).join('')}
  </div>`;
}

export function detailHtml(item) {
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
        <p>${escapeHtml(item.direction)} Previewed as two-page spreads. Export them as single pages or complete spreads on portrait A4.</p>
      </div>
      <div class="spreads-list">${spreadsMarkup(pages, item)}</div>
      <div class="detail-actions">
        <button type="button" data-action="edit">Edit booklet</button>
        <button type="button" data-action="copy">Copy share link</button>
        <button type="button" data-action="print">Download PDF</button>
        <button type="button" data-action="close">Back to collection</button>
      </div>
      <p class="detail-action-status" data-share-status role="status" aria-live="polite"></p>
      <label class="share-link-fallback" data-share-fallback hidden>
        <span>Copy this link manually</span>
        <input data-share-url type="text" readonly>
      </label>
    </section>`;
}

export function shareUrlFor(item) {
  const url = new URL(window.location.href);
  url.search = '';
  url.hash = '';
  url.searchParams.set('booklet', item.id);
  return url.toString();
}

export async function copyBookletShareLink(item, button) {
  const dialogContent = document.querySelector('#dialog-content');
  const shareUrl = shareUrlFor(item);
  const status = dialogContent?.querySelector('[data-share-status]');
  const fallback = dialogContent?.querySelector('[data-share-fallback]');
  const fallbackInput = fallback?.querySelector('[data-share-url]');
  const defaultLabel = 'Copy share link';
  const copied = await copyText(shareUrl);

  if (copied) {
    button.textContent = 'Link copied ✓';
    if (status) status.textContent = 'Share link copied to the clipboard.';
    if (fallback) fallback.hidden = true;
    window.setTimeout(() => {
      if (button.isConnected) button.textContent = defaultLabel;
    }, 2200);
    return;
  }

  button.textContent = 'Select link below';
  if (status) status.textContent = 'Automatic copying was blocked. The share link is selected below.';
  if (fallbackInput && fallback) {
    fallbackInput.value = shareUrl;
    fallback.hidden = false;
    fallbackInput.focus();
    fallbackInput.select();
    fallbackInput.setSelectionRange(0, fallbackInput.value.length);
  }
}

export function loadDialogImages(root) {
  const dialog = document.querySelector('#booklet-dialog');
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

export function activateGeneratedEffects(root) {
  const dialog = document.querySelector('#booklet-dialog');
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

export function resetDialogScroll() {
  const dialog = document.querySelector('#booklet-dialog');
  const dialogContent = document.querySelector('#dialog-content');
  if (!dialog || !dialogContent) return;

  dialog.scrollTop = 0;
  dialog.scrollLeft = 0;
  dialogContent.scrollTop = 0;
  dialogContent.scrollLeft = 0;

  if (typeof dialog.scrollTo === 'function') {
    dialog.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }

  if (typeof dialogContent.scrollTo === 'function') {
    dialogContent.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }
}

export function openBooklet(item, updateUrl = true) {
  const dialog = document.querySelector('#booklet-dialog');
  const dialogContent = document.querySelector('#dialog-content');
  const dialogEdit = document.querySelector('#dialog-edit');
  if (!dialog || !dialogContent) return;

  setPrintExportItem(item);
  loadGoogleFonts(fontsFor(item), `booklet-${safeClass(item.id)}`);
  dialogContent.innerHTML = detailHtml(item);
  applyPalette(dialogContent, item.palette);
  setFontVariables(dialogContent, item, pagesFor(item)[0]);

  initializeBookletEditor(item);
  if (dialogEdit) dialogEdit.hidden = false;

  const currentPage = getCurrentPage();
  const url = new URL(window.location.href);
  const hadPageParameter = url.searchParams.has('page');
  url.searchParams.delete('page');
  if (updateUrl) {
    url.searchParams.set('booklet', item.id);
    history.pushState({ booklet: item.id, collectionPage: currentPage }, '', url);
  } else if (hadPageParameter) {
    history.replaceState({ ...(history.state || {}), booklet: item.id, collectionPage: currentPage }, '', url);
  }

  resetDialogScroll();
  dialog.showModal();
  dialog.focus({ preventScroll: true });
  resetDialogScroll();

  requestAnimationFrame(() => {
    resetDialogScroll();
    loadDialogImages(dialogContent);
    activateGeneratedEffects(dialogContent);
    requestAnimationFrame(resetDialogScroll);
  });

  dialogContent.querySelector('[data-action="close"]')?.addEventListener('click', closeDialog);
  dialogContent.querySelector('[data-action="edit"]')?.addEventListener('click', openBookletEditor);
  dialogContent.querySelector('[data-action="print"]')?.addEventListener('click', openPrintSettings);
  dialogContent.querySelector('[data-action="copy"]')?.addEventListener('click', event => {
    copyBookletShareLink(item, event.currentTarget);
  });
}

export function closeDialog() {
  const dialog = document.querySelector('#booklet-dialog');
  const dialogEdit = document.querySelector('#dialog-edit');

  closePrintSettings();
  closeBookletEditor();
  if (dialogEdit) dialogEdit.hidden = true;
  if (dialog) dialog.close();
  resetDialogScroll();

  const currentPage = getCurrentPage();
  const url = new URL(window.location.href);
  url.searchParams.delete('booklet');
  if (currentPage > 1) url.searchParams.set('page', String(currentPage));
  else url.searchParams.delete('page');
  history.pushState({ page: currentPage }, '', url);
}

export function initDetailModalEvents() {
  const dialogClose = document.querySelector('#dialog-close');
  const dialog = document.querySelector('#booklet-dialog');

  dialogClose?.addEventListener('click', closeDialog);
  dialog?.addEventListener('click', event => {
    const rect = dialog.getBoundingClientRect();
    const outside = event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom;
    if (outside) closeDialog();
  });
}
