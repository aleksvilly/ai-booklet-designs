import { resolveRootUrl } from './utils.js';
import { ITEMS_PER_PAGE } from './config.js';
import { initThemeAndNav } from './theme.js';
import { loadGeneratorCatalogs, getGeneratorCatalog, appendCatalogStyles, renderCatalogEffects } from './catalog.js';
import { initI18n, setLanguage, getLanguage, SUPPORTED_LANGUAGES } from './i18n.js';
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
import { initStarterComposer } from './starter-composer.js';

function setupLanguagePicker() {
  const langToggle = document.querySelector('#lang-toggle');
  const langDropdown = document.querySelector('#lang-dropdown');
  const langFlag = document.querySelector('#lang-current-flag');
  const langCode = document.querySelector('#lang-current-code');
  if (!langToggle || !langDropdown) return;

  function updateActiveUI(code) {
    const found = SUPPORTED_LANGUAGES.find(l => l.code === code) || SUPPORTED_LANGUAGES[0];
    if (langFlag) langFlag.textContent = found.flag;
    if (langCode) langCode.textContent = found.code.toUpperCase();
    langDropdown.querySelectorAll('.lang-option').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.lang === code);
    });
  }

  updateActiveUI(getLanguage());

  langToggle.addEventListener('click', (e) => {
    e.stopPropagation();
    const isHidden = langDropdown.hasAttribute('hidden');
    if (isHidden) {
      langDropdown.removeAttribute('hidden');
      langToggle.setAttribute('aria-expanded', 'true');
    } else {
      langDropdown.setAttribute('hidden', '');
      langToggle.setAttribute('aria-expanded', 'false');
    }
  });

  document.addEventListener('click', (e) => {
    if (!langDropdown.contains(e.target) && e.target !== langToggle) {
      langDropdown.setAttribute('hidden', '');
      langToggle.setAttribute('aria-expanded', 'false');
    }
  });

  langDropdown.querySelectorAll('.lang-option').forEach(btn => {
    btn.addEventListener('click', () => {
      const code = btn.dataset.lang;
      setLanguage(code);
      updateActiveUI(code);
      langDropdown.setAttribute('hidden', '');
      langToggle.setAttribute('aria-expanded', 'false');

      const catalog = getGeneratorCatalog();
      if (catalog) {
        appendCatalogStyles(catalog.styles);
        renderCatalogEffects(catalog.effects);
      }
    });
  });
}

export async function initApp() {
  initI18n();
  setupLanguagePicker();
  initThemeAndNav();
  initQueueSystem();
  setupEditorEventListeners();
  setupPdfEvents();
  initDetailModalEvents();

  await loadGeneratorCatalogs().catch(error => console.warn(error));

  const response = await fetch(resolveRootUrl('data/booklets.json'), { cache: 'no-store' });
  if (!response.ok) throw new Error(`Failed to load booklets: ${response.status}`);
  const booklets = await response.json();

  const countNode = document.querySelector('#published-count');
  if (countNode) {
    countNode.textContent = `${booklets.filter(isPublished).length} published`;
  }

  initCollection(booklets);
  initStarterComposer();

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
