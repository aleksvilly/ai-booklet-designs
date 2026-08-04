import { ITEMS_PER_PAGE } from './config.js';
import {
  safeUrl,
  safeClass,
  applyPalette,
  designClasses,
  fontsFor,
  loadGoogleFonts,
  setFontVariables,
  coverTitle,
  imageCredit
} from './utils.js';
import { openBooklet } from './detail-modal.js';

let allBooklets = [];
let activeFilter = 'All';
let currentPage = 1;
const today = new Date();
today.setHours(23, 59, 59, 999);

export function getAllBooklets() {
  return allBooklets;
}

export function getCurrentPage() {
  return currentPage;
}

export function setCurrentPage(page) {
  currentPage = page;
}

export function isPublished(item) {
  return new Date(`${item.publishDate}T00:00:00`) <= today;
}

export function visibleBooklets() {
  const categoryFilter = document.body?.dataset?.categoryFilter;
  return allBooklets
    .filter(isPublished)
    .filter(item => {
      if (categoryFilter) {
        const itemCat = String(item.category || '').toLowerCase();
        const itemTopic = String(item.topic || '').toLowerCase();
        const itemStyle = String(item.style || '').toLowerCase();
        const filter = categoryFilter.toLowerCase();

        if (filter === 'wedding') {
          return itemCat.includes('wedding') || itemTopic.includes('wedding') || itemTopic.includes('свадьб') || itemStyle.includes('wedding');
        }
        if (filter === 'menu') {
          return itemCat.includes('menu') || itemCat.includes('business') || itemTopic.includes('café') || itemTopic.includes('menu') || itemTopic.includes('меню');
        }
        if (filter === 'gifts') {
          return itemCat.includes('gift') || itemTopic.includes('birthday') || itemTopic.includes('gift') || itemTopic.includes('подарок') || itemTopic.includes('юбилей');
        }
        if (filter === 'events') {
          return itemCat.includes('event') || itemTopic.includes('gallery') || itemTopic.includes('exhibition') || itemTopic.includes('выставк') || itemTopic.includes('фестивал');
        }
      }
      return activeFilter === 'All' || item.category === activeFilter;
    })
    .sort((a, b) => b.publishDate.localeCompare(a.publishDate));
}

export function legacyPages(item) {
  const titles = item.spreads || ['Opening statement', 'A world in fragments', 'The central visual story', 'A quiet final note'];
  return titles.map((title, index) => ({
    type: index === 0 ? 'cover' : index === titles.length - 1 ? 'closing' : 'editorial',
    module: index === 0 ? 'cover' : index === titles.length - 1 ? 'closing' : 'micro_essay',
    title,
    body: item.spreadNotes?.[index] || 'A distinct editorial moment using scale, contrast and controlled asymmetry.',
    layout: ['minimal', 'split', 'overlap', 'full'][index % 4]
  }));
}

export function pagesFor(item) {
  return Array.isArray(item.pages) && item.pages.length ? item.pages : legacyPages(item);
}

export function imagesForPage(page = {}) {
  const images = Array.isArray(page.images) && page.images.length
    ? page.images
    : page.image
      ? [page.image]
      : [];
  return images.filter(image => safeUrl(image?.url || '') !== '#');
}

export function createCardCoverMedia(cover, item, page, index) {
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

export function pageFromUrl(totalPages = 1) {
  const value = Number.parseInt(new URL(window.location.href).searchParams.get('page'), 10);
  if (!Number.isInteger(value) || value < 1) return 1;
  return Math.min(value, Math.max(1, totalPages));
}

export function updatePageUrl(page, replace = false) {
  const url = new URL(window.location.href);
  if (page <= 1) url.searchParams.delete('page');
  else url.searchParams.set('page', String(page));

  const state = { ...(history.state || {}), page };
  history[replace ? 'replaceState' : 'pushState'](state, '', url);
}

export function renderFilters() {
  const filtersNode = document.querySelector('#filters');
  if (!filtersNode) return;

  const categories = ['All', ...new Set(allBooklets.filter(isPublished).map(item => item.category))];
  filtersNode.innerHTML = '';
  for (const category of categories) {
    const button = document.createElement('button');
    button.className = `filter-button${category === activeFilter ? ' active' : ''}`;
    button.type = 'button';
    button.textContent = category;
    button.addEventListener('click', () => {
      activeFilter = category;
      currentPage = 1;
      updatePageUrl(currentPage, true);
      renderFilters();
      renderCards();
      renderPagination();
    });
    filtersNode.append(button);
  }
}

export function renderPagination() {
  const paginationNode = document.querySelector('#pagination');
  const grid = document.querySelector('#booklet-grid');
  if (!paginationNode) return;

  const items = visibleBooklets();
  const totalPages = Math.ceil(items.length / ITEMS_PER_PAGE);
  paginationNode.innerHTML = '';

  if (totalPages <= 1) return;

  const createButton = (text, page, disabled = false) => {
    const button = document.createElement('button');
    button.textContent = text;
    button.disabled = disabled;
    button.setAttribute('aria-current', page === currentPage ? 'page' : 'false');
    if (!disabled) {
      button.addEventListener('click', () => {
        currentPage = page;
        updatePageUrl(currentPage);
        renderCards();
        renderPagination();
        grid?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    }
    return button;
  };

  if (currentPage > 1) {
    paginationNode.append(createButton('← Previous', currentPage - 1));
  }

  const maxVisible = 5;
  let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2));
  let endPage = Math.min(totalPages, startPage + maxVisible - 1);
  if (endPage - startPage + 1 < maxVisible) {
    startPage = Math.max(1, endPage - maxVisible + 1);
  }

  if (startPage > 1) {
    paginationNode.append(createButton('1', 1));
    if (startPage > 2) {
      const dots = document.createElement('span');
      dots.textContent = '…';
      dots.style.padding = '0 8px';
      paginationNode.append(dots);
    }
  }

  for (let page = startPage; page <= endPage; page += 1) {
    paginationNode.append(createButton(String(page), page, page === currentPage));
  }

  if (endPage < totalPages) {
    if (endPage < totalPages - 1) {
      const dots = document.createElement('span');
      dots.textContent = '…';
      dots.style.padding = '0 8px';
      paginationNode.append(dots);
    }
    paginationNode.append(createButton(String(totalPages), totalPages));
  }

  if (currentPage < totalPages) {
    paginationNode.append(createButton('Next →', currentPage + 1));
  }
}

export function renderCards() {
  const grid = document.querySelector('#booklet-grid');
  const template = document.querySelector('#booklet-card-template');
  const emptyState = document.querySelector('#empty-state');
  if (!grid || !template) return;

  const items = visibleBooklets();
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const pageItems = items.slice(startIndex, endIndex);

  grid.innerHTML = '';
  if (emptyState) emptyState.hidden = items.length > 0;

  if (pageItems.length === 0) return;

  const collectionFonts = pageItems.slice(0, 18).flatMap(item => fontsFor(item).slice(0, 2));
  loadGoogleFonts(collectionFonts, 'collection');

  pageItems.forEach((item, index) => {
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
    card.querySelector('.cover-number').textContent = String(startIndex + index + 1).padStart(2, '0');
    card.querySelector('.card-audience').textContent = `For ${item.audience} · ${pages.length} print pages · ${dna.fontCount || fontsFor(item).length || 2} fonts`;
    card.querySelector('.card-title').textContent = item.title;
    card.querySelector('.card-direction').textContent = item.direction;

    cover.addEventListener('click', () => openBooklet(item));
    card.addEventListener('click', (event) => {
      if (event.target.closest('a, button')) return;
      openBooklet(item);
    });
    grid.append(card);
  });
}

export function initCollection(booklets) {
  allBooklets = booklets;
  const totalPages = Math.ceil(visibleBooklets().length / ITEMS_PER_PAGE);
  currentPage = pageFromUrl(totalPages);
  updatePageUrl(currentPage, true);
  renderFilters();
  renderCards();
  renderPagination();
}
