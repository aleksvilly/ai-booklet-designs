import { ITEMS_PER_PAGE } from './config.js';
import { initThemeAndNav } from './theme.js';
import { loadGeneratorCatalogs } from './catalog.js';
import {
  initCollection,
  getAllBooklets,
  visibleBooklets,
  isPublished,
  pageFromUrl,
  setCurrentPage,
  renderCards,
  renderPagination
} from './collection.js';
import { openBooklet, initDetailModalEvents } from './detail-modal.js';
import { setupEditorEventListeners } from './editor.js';
import { setupPdfEvents } from './pdf-exporter.js';
import { initQueueSystem } from './queue.js';

export async function initApp() {
  initThemeAndNav();
  initQueueSystem();
  setupEditorEventListeners();
  setupPdfEvents();
  initDetailModalEvents();

  await loadGeneratorCatalogs().catch(error => console.warn(error));

  const response = await fetch('./data/booklets.json', { cache: 'no-store' });
  if (!response.ok) throw new Error(`Failed to load booklets: ${response.status}`);
  const booklets = await response.json();

  const countNode = document.querySelector('#published-count');
  if (countNode) {
    countNode.textContent = `${booklets.filter(isPublished).length} published`;
  }

  initCollection(booklets);

  const requestedId = new URL(window.location.href).searchParams.get('booklet');
  const requested = booklets.find(item => item.id === requestedId && isPublished(item));
  if (requested) {
    openBooklet(requested, false);
  }

  window.addEventListener('popstate', () => {
    const dialog = document.querySelector('#booklet-dialog');
    const grid = document.querySelector('#booklet-grid');
    const url = new URL(window.location.href);
    const id = url.searchParams.get('booklet');

    if (id) {
      const item = getAllBooklets().find(booklet => booklet.id === id);
      if (item) openBooklet(item, false);
      return;
    }

    const totalPages = Math.ceil(visibleBooklets().length / ITEMS_PER_PAGE);
    const requestedPage = pageFromUrl(totalPages);
    setCurrentPage(requestedPage);
    renderCards();
    renderPagination();
    grid?.scrollIntoView({ behavior: 'auto', block: 'start' });

    if (dialog?.open) dialog.close();
  });

  document.querySelector('#surprise-button')?.addEventListener('click', () => {
    const items = getAllBooklets().filter(isPublished);
    if (items.length) {
      openBooklet(items[Math.floor(Math.random() * items.length)]);
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  initApp().catch(error => {
    console.error(error);
    const grid = document.querySelector('#booklet-grid');
    if (grid) {
      grid.innerHTML = '<p>Unable to load the collection. Please refresh the page.</p>';
    }
  });
});
