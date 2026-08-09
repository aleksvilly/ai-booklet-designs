import { getAllBooklets, imagesForPage, isPublished } from './collection.js';
import { openBooklet } from './detail-modal.js';
import { editorGenerationSettings, openBookletEditor } from './editor.js';

function cloneValue(value) {
  if (typeof structuredClone === 'function') return structuredClone(value);
  return JSON.parse(JSON.stringify(value));
}

function starterSource() {
  const published = getAllBooklets().filter(isPublished);
  return published.find(item =>
    Array.isArray(item.pages)
    && item.pages.length >= 6
    && item.pages.reduce((total, page) => total + imagesForPage(page).length, 0) >= 4
  ) || published[0];
}

function starterDraft(source) {
  const draft = cloneValue(source);
  const russian = document.documentElement.lang === 'ru';
  const title = russian ? 'ВАША ИСТОРИЯ НАЧИНАЕТСЯ ЗДЕСЬ' : 'YOUR STORY STARTS HERE';

  draft.id = `starter-draft-${source.id}`;
  draft.isStarterDraft = true;
  draft.title = title;
  draft.topic = russian ? 'Новый буклет' : 'New booklet';
  draft.audience = russian ? 'для вас' : 'you';
  draft.description = russian
    ? 'Это настоящий редактируемый шаблон. Выберите страницу и меняйте стиль, сетку, изображения и типографику в открытом меню.'
    : 'This is a real editable starter. Pick a page and change its style, grid, images and typography in the open menu.';

  if (draft.pages?.[0]) {
    draft.pages[0].title = title;
    draft.pages[0].body = russian
      ? 'Покрутите любой слайдер — изменения сразу появятся на странице.'
      : 'Move any slider and watch the page change immediately.';
  }
  if (draft.pages?.[1]) {
    draft.pages[1].title = russian ? 'НАСТРОЙТЕ КАЖДУЮ ДЕТАЛЬ' : 'SHAPE EVERY DETAIL';
    draft.pages[1].body = russian
      ? 'Применяйте настройки ко всему буклету, развороту или отдельной странице.'
      : 'Apply changes to the whole booklet, one spread or a single page.';
  }

  return draft;
}

function setFormValue(form, name, value) {
  const control = form?.elements?.namedItem(name);
  if (control) control.value = value;
}

function syncGenerationForm() {
  const form = document.querySelector('#generation-form');
  const settings = editorGenerationSettings();
  if (!form || !settings) return;

  const styleSelect = form.elements.namedItem('style');
  if (styleSelect && ![...styleSelect.options].some(option => option.value === settings.style)) {
    styleSelect.add(new Option(settings.style, settings.style));
  }
  setFormValue(form, 'style', settings.style);
  setFormValue(form, 'visual_mode', ['auto', 'minimal', 'abstract', 'mixed'].includes(settings.visualMode) ? settings.visualMode : 'auto');
  setFormValue(form, 'layout_complexity', settings.layoutComplexity);
  setFormValue(form, 'effect_level', settings.effectLevel);
  setFormValue(form, 'custom_fonts', settings.customFonts);
  setFormValue(form, 'custom_style', settings.customStyle);
}

export function openStarterBooklet() {
  const source = starterSource();
  if (!source) return;

  openBooklet(starterDraft(source), false);
  requestAnimationFrame(() => openBookletEditor());
}

export function initStarterComposer() {
  const plusButton = document.querySelector('#booklet-plus-btn');
  const heroButton = document.querySelector('#hero-create-btn');
  const generateButton = document.querySelector('#starter-generate-button');
  const requestPanel = document.querySelector('#starter-request-panel');
  const requestClose = document.querySelector('#starter-request-close');
  const generationForm = document.querySelector('#generation-form');

  plusButton?.addEventListener('click', openStarterBooklet);
  heroButton?.addEventListener('click', openStarterBooklet);
  document.querySelectorAll('a[href="#generation-form"]').forEach(link => {
    link.addEventListener('click', event => {
      event.preventDefault();
      openStarterBooklet();
    });
  });
  generateButton?.addEventListener('click', () => {
    syncGenerationForm();
    if (requestPanel) requestPanel.hidden = false;
    requestPanel?.querySelector('#booklet-topic')?.focus();
  });
  requestClose?.addEventListener('click', () => {
    if (requestPanel) requestPanel.hidden = true;
    generateButton?.focus();
  });
  generationForm?.addEventListener('submit', syncGenerationForm, { capture: true });

  document.addEventListener('keydown', event => {
    if (event.key !== 'Escape' || requestPanel?.hidden) return;
    event.preventDefault();
    event.stopPropagation();
    requestPanel.hidden = true;
    generateButton?.focus();
  }, { capture: true });

  if (window.location.hash === '#generation-form') {
    history.replaceState(history.state, '', `${window.location.pathname}${window.location.search}`);
    openStarterBooklet();
  }
}
