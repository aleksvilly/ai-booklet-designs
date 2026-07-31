import { EDITOR_STORAGE_PREFIX, EDITOR_COMPACT_STORAGE_KEY } from './config.js';
import { safeUrl, safeClass, fontStack, loadGoogleFonts } from './utils.js';
import { pagesFor, imagesForPage } from './collection.js';
import { mediaMarkup, loadDialogImages } from './detail-modal.js';
import { bindStyleSlider, getGeneratorCatalog } from './catalog.js';

let editorSession = null;
let editorSaveTimer = null;
let editorParameterIndex = 0;
let editorTypographyTarget = 'title';
let editorTypographyLevel = 'targets';
let editorTypographySetting = null;
let editorParameterMenuOpen = false;
let editorCompactPageZoom = 1;
let editorCompactPageScale = 1;
let editorCompactZoomOpen = false;
let editorCompactScrollFrame = null;
let editorCompactResizeFrame = null;
let editorCompactPairSettleTimer = null;
let editorCompactLastTapPage = -1;
let editorCompactLastTapTime = 0;
let editorCompactScrollSelectionLockedUntil = 0;
const editorCompactPageAnimations = new WeakMap();
let editorCompactMode = localStorage.getItem(EDITOR_COMPACT_STORAGE_KEY) === null
  ? window.matchMedia('(max-width: 900px)').matches
  : localStorage.getItem(EDITOR_COMPACT_STORAGE_KEY) === 'true';

const editorLoremSentences = [
  'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
  'Integer posuere erat a ante venenatis dapibus posuere velit aliquet.',
  'Curabitur blandit tempus porttitor, sed posuere consectetur est at lobortis.',
  'Donec ullamcorper nulla non metus auctor fringilla.',
  'Maecenas faucibus mollis interdum, vitae elit libero pharetra augue.',
  'Aenean lacinia bibendum nulla sed consectetur.',
  'Praesent commodo cursus magna, vel scelerisque nisl consectetur.',
  'Cras mattis consectetur purus sit amet fermentum.'
];

function getEditorControls() {
  return {
    dialog: document.querySelector('#booklet-dialog'),
    dialogContent: document.querySelector('#dialog-content'),
    dialogEdit: document.querySelector('#dialog-edit'),
    bookletEditor: document.querySelector('#booklet-editor'),
    bookletEditorClose: document.querySelector('#booklet-editor-close'),
    bookletEditorMode: document.querySelector('#booklet-editor-mode'),
    editorPageZoom: document.querySelector('#editor-page-zoom'),
    editorPageZoomToggle: document.querySelector('#editor-page-zoom-toggle'),
    editorPageZoomPanel: document.querySelector('#editor-page-zoom-panel'),
    editorPageZoomRange: document.querySelector('#editor-page-zoom-range'),
    editorPageZoomBadge: document.querySelector('#editor-page-zoom-badge'),
    editorPageZoomOutput: document.querySelector('#editor-page-zoom-output'),
    spreadsList: document.querySelector('#dialog-content .spreads-list'),
    editorParameterPrevious: document.querySelector('#editor-parameter-previous'),
    editorParameterNext: document.querySelector('#editor-parameter-next'),
    editorParameterMenu: document.querySelector('#editor-parameter-menu'),
    editorParameterMenuToggle: document.querySelector('#editor-parameter-menu-toggle'),
    editorParameterLabel: document.querySelector('#editor-parameter-label'),
    editorParameterValue: document.querySelector('#editor-parameter-value'),
    editorScope: document.querySelector('#editor-scope'),
    editorScopeCompact: document.querySelector('#editor-scope-compact'),
    editorTargetLabel: document.querySelector('#editor-target-label'),
    editorProfile: document.querySelector('#editor-profile'),
    editorVisualMode: document.querySelector('#editor-visual-mode'),
    editorLayoutComplexity: document.querySelector('#editor-layout-complexity'),
    editorImageCount: document.querySelector('#editor-image-count'),
    editorTextAmount: document.querySelector('#editor-text-amount'),
    editorContentPosition: document.querySelector('#editor-content-position'),
    editorFontScale: document.querySelector('#editor-font-scale'),
    editorFontFamily: document.querySelector('#editor-font-family'),
    editorFontFamilyMarks: document.querySelector('#editor-font-family-marks'),
    editorFontWeight: document.querySelector('#editor-font-weight'),
    editorFontTracking: document.querySelector('#editor-font-tracking'),
    editorFontTrackingOutput: document.querySelector('#editor-font-tracking-output'),
    editorFontLineHeight: document.querySelector('#editor-font-line-height'),
    editorFontLineHeightOutput: document.querySelector('#editor-font-line-height-output'),
    editorFontItalic: document.querySelector('#editor-font-italic'),
    editorFontUnderline: document.querySelector('#editor-font-underline'),
    editorFontUppercase: document.querySelector('#editor-font-uppercase'),
    editorTypographyTargetList: document.querySelector('#editor-typography-target-list'),
    editorTypographyCascade: document.querySelector('#editor-typography-cascade'),
    editorTypographyBack: document.querySelector('#editor-typography-back'),
    editorTypographyCascadeTitle: document.querySelector('#editor-typography-cascade-title'),
    editorTypographySettingList: document.querySelector('#editor-typography-setting-list'),
    editorTypographySettingEditor: document.querySelector('#editor-typography-setting-editor'),
    editorSpacing: document.querySelector('#editor-spacing'),
    editorEffectLevel: document.querySelector('#editor-effect-level'),
    editorShowTitle: document.querySelector('#editor-show-title'),
    editorShowSubtitle: document.querySelector('#editor-show-subtitle'),
    editorShowBody: document.querySelector('#editor-show-body'),
    editorShowCaption: document.querySelector('#editor-show-caption'),
    editorShowPageNumber: document.querySelector('#editor-show-page-number'),
    editorShowSource: document.querySelector('#editor-show-source'),
    editorShowImageCaptions: document.querySelector('#editor-show-image-captions'),
    editorVisibilityOptions: document.querySelector('.editor-visibility-options'),
    editorLayoutOutput: document.querySelector('#editor-layout-output'),
    editorImageOutput: document.querySelector('#editor-image-output'),
    editorTextOutput: document.querySelector('#editor-text-output'),
    editorFontOutput: document.querySelector('#editor-font-output'),
    editorSpacingOutput: document.querySelector('#editor-spacing-output'),
    editorEffectOutput: document.querySelector('#editor-effect-output'),
    editorPhotoLayout: document.querySelector('#editor-photo-layout'),
    editorPhotoLayoutVariant: document.querySelector('#editor-photo-layout-variant'),
    editorPhotoLayoutVariantOutput: document.querySelector('#editor-photo-layout-variant-output'),
    editorSaveStatus: document.querySelector('#editor-save-status'),
    editorResetScope: document.querySelector('#editor-reset-scope'),
    editorResetAll: document.querySelector('#editor-reset-all'),
    generationForm: document.querySelector('#generation-form')
  };
}

function editorFontItems() {
  return getGeneratorCatalog()?.fonts?.items || [];
}

function editorFontTargets(controls = getEditorControls()) {
  return [
    {
      prefix: 'title',
      label: 'Title',
      familyKey: 'titleFont',
      button: controls.editorTypographyTargetList?.querySelector('[data-typography-target="title"]')
    },
    {
      prefix: 'subtitle',
      label: 'Subtitle',
      familyKey: 'subtitleFont',
      button: controls.editorTypographyTargetList?.querySelector('[data-typography-target="subtitle"]')
    },
    {
      prefix: 'body',
      label: 'Body',
      familyKey: 'bodyFont',
      button: controls.editorTypographyTargetList?.querySelector('[data-typography-target="body"]')
    }
  ];
}

function activeEditorFontTarget(controls = getEditorControls()) {
  return editorFontTargets(controls).find(target => target.prefix === editorTypographyTarget)
    || editorFontTargets(controls)[0];
}

function loadEditorFont(family) {
  const item = editorFontItems().find(font => font.family === family);
  if (item?.provider === 'google-fonts') {
    loadGoogleFonts([family], `editor-${safeClass(family)}`);
  } else if (item?.fallback) {
    loadEditorFont(item.fallback);
  }
}

function editorFontStack(family) {
  const item = editorFontItems().find(font => font.family === family);
  if (!item?.fallback) return fontStack(family);
  const primary = fontStack(family).replace(/,\s*(?:sans-serif|serif|monospace)$/, '');
  return `${primary}, ${fontStack(item.fallback)}`;
}

function populateEditorFontControl() {
  const controls = getEditorControls();
  if (!controls.editorFontFamily) return;

  const currentValue = controls.editorFontFamily.value;
  const items = editorFontItems();
  if (items.length) {
    controls.editorFontFamily.replaceChildren(...items.map(font => {
      const suffix = font.availability === 'licensed' ? ' · licensed' : '';
      const option = new Option(`${font.family}${suffix}`, font.family);
      option.dataset.availability = font.availability;
      option.dataset.provider = font.provider;
      return option;
    }));
  }
  if ([...controls.editorFontFamily.options].some(option => option.value === currentValue)) {
    controls.editorFontFamily.value = currentValue;
  }
  bindStyleSlider(controls.editorFontFamily);
  bindStyleSlider(controls.editorFontWeight);
}

function syncEditorSliderSelect(control) {
  if (!control) return;
  const selectedIndex = Math.max(0, control.selectedIndex);
  const wrapper = control.parentElement;
  const slider = wrapper?.querySelector('input[type="range"]');
  const output = wrapper?.querySelector('.style-slider-output');
  if (slider) {
    slider.max = String(Math.max(0, control.options.length - 1));
    slider.value = String(selectedIndex);
  }
  if (output) output.textContent = control.selectedOptions[0]?.textContent || control.value;
}

function syncEditorFontRecommendations() {
  if (!editorSession) return;
  const controls = getEditorControls();
  const catalog = getGeneratorCatalog();
  const profileId = resolvedEditorSetting('profile', editorSession.activePageIndex);
  const style = catalog?.styles?.items?.find(item => item.id === profileId);
  const free = style?.fontRecommendations?.free || style?.contract?.fonts || [];
  const licensed = style?.fontRecommendations?.licensed || [];
  const recommended = [...new Set([...free, ...licensed])];

  if (controls.editorFontFamilyMarks && controls.editorFontFamily) {
    controls.editorFontFamilyMarks.replaceChildren(...recommended.flatMap(family => {
      const index = [...controls.editorFontFamily.options].findIndex(option => option.value === family);
      if (index < 0) return [];
      const option = document.createElement('option');
      option.value = String(index);
      option.label = family;
      return [option];
    }));
    const slider = controls.editorFontFamily.parentElement?.querySelector('input[type="range"]');
    if (slider) slider.setAttribute('list', controls.editorFontFamilyMarks.id);
  }
}

const editorTypographySettings = [
  { id: 'fontFamily', label: 'Font family' },
  { id: 'fontWeight', label: 'Font weight' },
  { id: 'fontTracking', label: 'Letter spacing' },
  { id: 'fontLineHeight', label: 'Line height' },
  { id: 'fontItalic', label: 'Italic' },
  { id: 'fontUnderline', label: 'Underline' },
  { id: 'fontUppercase', label: 'Uppercase' }
];

function editorTypographySettingValue(settingId, get, target, controls) {
  if (settingId === 'fontFamily') return get(target.familyKey);
  if (settingId === 'fontWeight') {
    const weight = String(get(`${target.prefix}FontWeight`));
    const label = [...(controls.editorFontWeight?.options || [])]
      .find(option => option.value === weight)?.textContent;
    return label ? `${label} · ${weight}` : weight;
  }
  if (settingId === 'fontTracking') return `${get(`${target.prefix}FontTracking`)}%`;
  if (settingId === 'fontLineHeight') return `${get(`${target.prefix}FontLineHeight`)}%`;
  const suffix = settingId === 'fontItalic'
    ? 'FontItalic'
    : settingId === 'fontUnderline'
      ? 'FontUnderline'
      : 'FontUppercase';
  return get(`${target.prefix}${suffix}`) ? 'On' : 'Off';
}

function syncEditorTypographyTargets(get, controls = getEditorControls()) {
  editorFontTargets(controls).forEach(target => {
    const family = get(target.familyKey);
    const weight = get(`${target.prefix}FontWeight`);
    const flags = [
      get(`${target.prefix}FontItalic`) ? 'italic' : '',
      get(`${target.prefix}FontUnderline`) ? 'underline' : '',
      get(`${target.prefix}FontUppercase`) ? 'uppercase' : ''
    ].filter(Boolean);
    const summary = [family, weight, ...flags].filter(Boolean).join(' · ');
    const summaryNode = target.button?.querySelector('.editor-typography-target-summary');
    if (summaryNode) summaryNode.textContent = summary;
    target.button?.setAttribute('aria-pressed', String(target.prefix === editorTypographyTarget));
  });

  const activeTarget = activeEditorFontTarget(controls);
  editorTypographySettings.forEach(setting => {
    const button = controls.editorTypographySettingList
      ?.querySelector(`[data-typography-setting="${setting.id}"]`);
    const summary = button?.querySelector('small');
    if (summary && activeTarget) {
      summary.textContent = editorTypographySettingValue(setting.id, get, activeTarget, controls);
    }
  });

  const activeSetting = editorTypographySettings.find(setting => setting.id === editorTypographySetting);
  if (controls.editorTypographyCascadeTitle) {
    controls.editorTypographyCascadeTitle.textContent = editorTypographyLevel === 'control'
      ? activeSetting?.label || 'Typography'
      : activeTarget?.label || 'Typography';
  }
  if (controls.editorTypographyBack) {
    controls.editorTypographyBack.textContent = `‹ ${activeTarget?.label || 'Typography'}`;
  }
  if (controls.editorTypographyTargetList) {
    controls.editorTypographyTargetList.hidden = editorTypographyLevel !== 'targets';
  }
  if (controls.editorTypographyCascade) {
    controls.editorTypographyCascade.hidden = editorTypographyLevel === 'targets';
  }
  if (controls.editorTypographySettingList) {
    controls.editorTypographySettingList.hidden = editorTypographyLevel !== 'settings';
  }
  if (controls.editorTypographySettingEditor) {
    controls.editorTypographySettingEditor.hidden = editorTypographyLevel !== 'control';
    controls.editorTypographySettingEditor.querySelectorAll('[data-typography-control]').forEach(control => {
      control.hidden = control.dataset.typographyControl !== editorTypographySetting;
    });
  }
}

export function availableEditorParameters() {
  const {
    editorScope, editorProfile, editorVisualMode, editorLayoutComplexity,
    editorImageCount, editorTextAmount, editorContentPosition, editorFontScale,
    editorTypographyTargetList,
    editorSpacing, editorEffectLevel, editorVisibilityOptions,
    editorPhotoLayout, editorPhotoLayoutVariant
  } = getEditorControls();

  const editorParameters = [
    { key: 'profile', label: 'Editorial profile', control: editorProfile },
    { key: 'visualMode', label: 'Visual language', control: editorVisualMode },
    { key: 'layoutComplexity', label: 'Page complexity', control: editorLayoutComplexity },
    { key: 'imageCount', label: 'Images', control: editorImageCount },
    { key: 'photoLayout', label: 'Photo layout', control: editorPhotoLayout },
    { key: 'photoLayoutVariant', label: 'Layout intensity', control: editorPhotoLayoutVariant },
    { key: 'textAmount', label: 'Text amount', control: editorTextAmount },
    { key: 'contentPosition', label: 'Content position', control: editorContentPosition },
    { key: 'fontScale', label: 'Font scale', control: editorFontScale },
    { key: 'advancedTypography', label: 'Advanced typography', control: editorTypographyTargetList },
    { key: 'spacing', label: 'Page spacing', control: editorSpacing },
    { key: 'effectLevel', label: 'Effects intensity', control: editorEffectLevel },
    { key: 'visibleContent', label: 'Text visibility', control: editorVisibilityOptions }
  ];

  return editorScope?.value === 'booklet'
    ? editorParameters
    : editorParameters.filter(parameter => parameter.key !== 'profile');
}

export function splitEditorSentences(value = '') {
  return String(value)
    .match(/[^.!?]+[.!?]+|[^.!?]+$/g)
    ?.map(sentence => sentence.trim())
    .filter(Boolean) || [];
}

export function editorTextVariantsFor(page = {}) {
  const stored = page.editorVariants?.text;
  if (Array.isArray(stored) && stored.length >= 5) return stored.slice(0, 5).map(String);

  const original = String(page.body || '').trim();
  const sentences = splitEditorSentences(original);
  const short = sentences[0] || '';
  const medium = sentences.slice(0, Math.max(1, Math.ceil(sentences.length / 2))).join(' ');
  const withLorem = count => [original, ...editorLoremSentences.slice(0, count)].filter(Boolean).join(' ');

  return [
    short,
    medium,
    original,
    withLorem(3),
    withLorem(8)
  ];
}

export function uniqueEditorImages(pages = []) {
  const seen = new Set();
  return pages.flatMap(imagesForPage).filter(image => {
    const key = safeUrl(image?.url || '');
    if (key === '#' || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function editorStorageKey(item) {
  return `${EDITOR_STORAGE_PREFIX}${item.id}`;
}

export function emptyEditorState() {
  return { version: 1, booklet: {}, spreads: {}, pages: {} };
}

export function loadEditorState(item) {
  try {
    const stored = JSON.parse(localStorage.getItem(editorStorageKey(item)) || 'null');
    if (!stored || stored.version !== 1) return emptyEditorState();
    return {
      version: 1,
      booklet: stored.booklet && typeof stored.booklet === 'object' ? stored.booklet : {},
      spreads: stored.spreads && typeof stored.spreads === 'object' ? stored.spreads : {},
      pages: stored.pages && typeof stored.pages === 'object' ? stored.pages : {}
    };
  } catch {
    return emptyEditorState();
  }
}

export function scheduleEditorSave() {
  const { editorSaveStatus } = getEditorControls();
  if (!editorSession || !editorSaveStatus) return;
  clearTimeout(editorSaveTimer);
  editorSaveStatus.textContent = 'Saving…';
  editorSaveTimer = setTimeout(() => {
    try {
      localStorage.setItem(editorStorageKey(editorSession.item), JSON.stringify(editorSession.state));
      editorSaveStatus.textContent = 'Saved on this device.';
    } catch {
      editorSaveStatus.textContent = 'Could not save on this device.';
    }
  }, 120);
}

export function originalEditorSettings(item, page) {
  const dna = item.designDna || {};
  const fontPalette = Array.isArray(dna.fontPalette) ? dna.fontPalette : [];
  const pageFont = page.fontFamily || fontPalette[0] || 'DM Sans';
  const align = page.textAlign === 'right' ? 'bottom-right' : page.textAlign === 'center' ? 'bottom-center' : 'bottom-left';
  return {
    profile: dna.styleFamily || item.layout || 'auto',
    visualMode: dna.visualMode || 'auto',
    layoutComplexity: Math.max(1, Math.min(5, Number(dna.layoutComplexity || 2))),
    imageCount: imagesForPage(page).length,
    photoLayout: 'auto',
    photoLayoutVariant: 0,
    textAmount: 3,
    contentPosition: align,
    fontScale: 3,
    titleFont: fontPalette[0] || pageFont,
    subtitleFont: fontPalette[2] || fontPalette[0] || pageFont,
    bodyFont: page.fontFamily || fontPalette[1] || pageFont,
    titleFontWeight: 600,
    subtitleFontWeight: 500,
    bodyFontWeight: 400,
    titleFontTracking: -6,
    subtitleFontTracking: 12,
    bodyFontTracking: 0,
    titleFontLineHeight: 82,
    subtitleFontLineHeight: 120,
    bodyFontLineHeight: 140,
    titleFontItalic: false,
    subtitleFontItalic: false,
    bodyFontItalic: false,
    titleFontUnderline: false,
    subtitleFontUnderline: false,
    bodyFontUnderline: false,
    titleFontUppercase: false,
    subtitleFontUppercase: true,
    bodyFontUppercase: false,
    spacing: 3,
    effectLevel: Math.max(0, Math.min(5, Number(dna.effectLevel ?? 2))),
    showTitle: Boolean(page.title),
    showSubtitle: Boolean(page.module || page.type),
    showBody: Boolean(page.body),
    showCaption: Boolean(page.caption),
    showPageNumber: true,
    showSource: Boolean(page.source?.url),
    showImageCaptions: imagesForPage(page).length > 0
  };
}

export function editorLayersFor(pageIndex) {
  if (!editorSession) return [];
  const spreadIndex = Math.floor(pageIndex / 2);
  return [
    editorSession.state.booklet,
    editorSession.state.spreads[String(spreadIndex)],
    editorSession.state.pages[String(pageIndex)]
  ].filter(Boolean);
}

export function hasEditorOverride(key, pageIndex) {
  return editorLayersFor(pageIndex).some(layer => Object.prototype.hasOwnProperty.call(layer, key));
}

export function resolvedEditorSetting(key, pageIndex) {
  if (!editorSession) return undefined;
  const layers = editorLayersFor(pageIndex);
  let value = editorSession.originalSettings[pageIndex]?.[key];
  layers.forEach(layer => {
    if (Object.prototype.hasOwnProperty.call(layer, key)) value = layer[key];
  });
  return value;
}

export function activeEditorBucket(create = true) {
  const { editorScope } = getEditorControls();
  if (!editorSession || !editorScope) return null;
  if (editorScope.value === 'booklet') return editorSession.state.booklet;

  const collection = editorScope.value === 'spread'
    ? editorSession.state.spreads
    : editorSession.state.pages;
  const key = String(editorScope.value === 'spread'
    ? editorSession.activeSpreadIndex
    : editorSession.activePageIndex);

  if (!collection[key] && create) collection[key] = {};
  return collection[key] || null;
}

export function replaceStyleClass(node, profile) {
  if (!node) return;
  [...node.classList].filter(name => name.startsWith('style-')).forEach(name => node.classList.remove(name));
  node.classList.add(`style-${safeClass(profile || 'editorial')}`);
}

export function replaceEditorLevelClass(node, prefix, value, enabled) {
  [...node.classList].filter(name => name.startsWith(prefix)).forEach(name => node.classList.remove(name));
  if (enabled) node.classList.add(`${prefix}${value}`);
}

export function imagesForEditorCount(page, count, pool) {
  if (count <= 0) return [];
  const selected = [];
  const seen = new Set();
  [...imagesForPage(page), ...pool].forEach(image => {
    const key = safeUrl(image?.url || '');
    if (selected.length >= count || key === '#' || seen.has(key)) return;
    seen.add(key);
    selected.push(image);
  });
  if (!selected.length) return [];
  const reusable = [...selected];
  while (selected.length < count) selected.push(reusable[selected.length % reusable.length]);
  return selected.slice(0, count);
}

export function renderEditorMedia(pageNode, page, count) {
  pageNode.querySelectorAll(':scope > .page-image, :scope > .page-gallery, :scope > .page-art').forEach(node => node.remove());
  const images = imagesForEditorCount(page, count, editorSession.imagePool);
  const previewPage = { ...page, images, image: null };
  const copy = pageNode.querySelector('.book-page-copy');
  copy?.insertAdjacentHTML('beforebegin', mediaMarkup(previewPage));
  pageNode.classList.toggle('has-image', images.length > 0);
  pageNode.classList.toggle('no-image', images.length === 0);
  loadDialogImages(pageNode);
}

function applyEditorTypography(node, prefix, pageIndex) {
  if (!node) return;
  const properties = [
    ['FontWeight', 'font-weight', value => String(value)],
    ['FontTracking', 'letter-spacing', value => `${Number(value) / 100}em`],
    ['FontLineHeight', 'line-height', value => String(Number(value) / 100)],
    ['FontItalic', 'font-style', value => value ? 'italic' : 'normal'],
    ['FontUnderline', 'text-decoration-line', value => value ? 'underline' : 'none'],
    ['FontUppercase', 'text-transform', value => value ? 'uppercase' : 'none']
  ];

  properties.forEach(([suffix, property, format]) => {
    const key = `${prefix}${suffix}`;
    if (hasEditorOverride(key, pageIndex)) {
      node.style.setProperty(property, format(resolvedEditorSetting(key, pageIndex)), 'important');
    } else {
      node.style.removeProperty(property);
    }
  });
}

export function applyEditorPage(pageNode, page, pageIndex) {
  const values = {
    visualMode: resolvedEditorSetting('visualMode', pageIndex),
    layoutComplexity: resolvedEditorSetting('layoutComplexity', pageIndex),
    imageCount: resolvedEditorSetting('imageCount', pageIndex),
    photoLayout: resolvedEditorSetting('photoLayout', pageIndex),
    photoLayoutVariant: resolvedEditorSetting('photoLayoutVariant', pageIndex),
    textAmount: resolvedEditorSetting('textAmount', pageIndex),
    contentPosition: resolvedEditorSetting('contentPosition', pageIndex),
    fontScale: resolvedEditorSetting('fontScale', pageIndex),
    titleFont: resolvedEditorSetting('titleFont', pageIndex),
    subtitleFont: resolvedEditorSetting('subtitleFont', pageIndex),
    bodyFont: resolvedEditorSetting('bodyFont', pageIndex),
    spacing: resolvedEditorSetting('spacing', pageIndex),
    effectLevel: resolvedEditorSetting('effectLevel', pageIndex),
    showTitle: resolvedEditorSetting('showTitle', pageIndex),
    showSubtitle: resolvedEditorSetting('showSubtitle', pageIndex),
    showBody: resolvedEditorSetting('showBody', pageIndex),
    showCaption: resolvedEditorSetting('showCaption', pageIndex),
    showPageNumber: resolvedEditorSetting('showPageNumber', pageIndex),
    showSource: resolvedEditorSetting('showSource', pageIndex),
    showImageCaptions: resolvedEditorSetting('showImageCaptions', pageIndex)
  };

  // Media must be rendered before layout variables are applied: changing the
  // image count replaces the gallery nodes that receive per-image properties.
  const requestedImageCount = hasEditorOverride('imageCount', pageIndex)
    ? Math.max(0, Math.min(20, Number(values.imageCount)))
    : imagesForPage(page).length;
  if (Number(pageNode.dataset.editorImageCount) !== requestedImageCount) {
    renderEditorMedia(pageNode, page, requestedImageCount);
    pageNode.dataset.editorImageCount = String(requestedImageCount);
  }

  replaceEditorLevelClass(pageNode, 'editor-visual-', safeClass(values.visualMode), hasEditorOverride('visualMode', pageIndex));
  replaceEditorLevelClass(pageNode, 'editor-complexity-', values.layoutComplexity, hasEditorOverride('layoutComplexity', pageIndex));
  replaceEditorLevelClass(pageNode, 'editor-font-', values.fontScale, hasEditorOverride('fontScale', pageIndex));
  replaceEditorLevelClass(pageNode, 'editor-spacing-', values.spacing, hasEditorOverride('spacing', pageIndex));
  replaceEditorLevelClass(pageNode, 'editor-effects-', values.effectLevel, hasEditorOverride('effectLevel', pageIndex));

  // Photo layout family and variant (-100…+100)
  const photoLayoutValue = hasEditorOverride('photoLayout', pageIndex) ? String(values.photoLayout || 'auto') : 'auto';
  // Remove old photo-layout classes
  [...pageNode.classList]
    .filter(c => c.startsWith('photo-layout-'))
    .forEach(c => pageNode.classList.remove(c));

  if (photoLayoutValue !== 'auto') {
    pageNode.classList.add(`photo-layout-${safeClass(photoLayoutValue)}`);

    const rawPct = hasEditorOverride('photoLayoutVariant', pageIndex)
      ? Math.max(-100, Math.min(100, Number(values.photoLayoutVariant ?? 0)))
      : 0;
    const absPct = Math.abs(rawPct);

    // Derived CSS variables
    const gap = Math.min(absPct * 0.2, 22);
    const ratio = Math.max(20, Math.min(80, 50 + rawPct * 0.3));
    const ratioB = 100 - ratio;
    // Split layouts always keep equal base tracks. Positive intensity closes
    // a mask around the unchanged image; negative intensity expands the image
    // area into adjacent tracks. Neither path scales/distorts the bitmap.
    const splitInset = rawPct > 0 ? rawPct * 0.48 : 0;
    const splitExtent = rawPct < 0 ? 100 + absPct * 0.96 : 100;
    const splitOffset = (100 - splitExtent) / 2;
    // Diagonal depth is relative to one equal row. At 100%, depth equals the
    // row height, so bands two rows apart meet and form a sharp point.
    const diagFactor = absPct / 100;
    const diagExtent = (1 + diagFactor * 2) * 100;
    const diagOffset = -diagFactor * 100;
    const diagClip = diagFactor / (1 + diagFactor * 2) * 100;
    const tiltDeg = rawPct * 0.14;
    const overlayOpacity = Math.max(0, Math.min(0.95, absPct / 100));
    // Circle size: smaller when intensity is high (more circles), larger when low
    const circleSize = Math.max(12, Math.min(36, 22 - absPct * 0.1));

    pageNode.style.setProperty('--layout-gap', `${gap.toFixed(1)}px`);
    pageNode.style.setProperty('--layout-ratio', `${ratio.toFixed(1)}%`);
    pageNode.style.setProperty('--layout-ratio-b', `${ratioB.toFixed(1)}%`);
    pageNode.style.setProperty('--layout-split-inset', `${splitInset.toFixed(1)}%`);
    pageNode.style.setProperty('--layout-split-extent', `${splitExtent.toFixed(1)}%`);
    pageNode.style.setProperty('--layout-split-offset', `${splitOffset.toFixed(1)}%`);
    pageNode.style.setProperty('--layout-diag-extent', `${diagExtent.toFixed(1)}%`);
    pageNode.style.setProperty('--layout-diag-offset', `${diagOffset.toFixed(1)}%`);
    pageNode.style.setProperty('--layout-diag-clip', `${diagClip.toFixed(2)}%`);
    pageNode.style.setProperty('--layout-tilt', `${tiltDeg.toFixed(2)}deg`);
    pageNode.style.setProperty('--layout-overlay-opacity', overlayOpacity.toFixed(2));
    pageNode.style.setProperty('--layout-circle-size', `${circleSize.toFixed(1)}%`);

    if (photoLayoutValue === 'circles') {
      const shapeItems = [...pageNode.querySelectorAll('.page-gallery .gallery-image')];
      const shapeScale = rawPct >= 0
        ? 1 + rawPct * 0.008
        : 1 - absPct * 0.006;

      shapeItems.forEach((item, index) => {
        const nestedSize = 100 * (shapeItems.length - index) / shapeItems.length;
        const size = nestedSize * shapeScale;

        item.style.setProperty('--layout-shape-size', `${size.toFixed(2)}%`);
        item.style.setProperty('--layout-shape-z', String(index + 1));
      });

      pageNode.style.setProperty('--layout-shape-single-size', `${(shapeScale * 100).toFixed(1)}%`);
    }

    if (photoLayoutValue === 'masonry') {
      const masonryItems = [...pageNode.querySelectorAll('.page-gallery .gallery-image')];
      const masonryColumns = Math.min(
        12,
        Math.max(4, Math.ceil(Math.sqrt(Math.max(1, masonryItems.length) * 1.6)) * 2)
      );
      const masonryRows = Math.max(5, Math.round(masonryColumns * 1.35));
      const seedPhase = rawPct / 100 * Math.PI * 1.6;
      const splitAmplitude = 0.08 + absPct / 100 * 0.18;
      const regions = [{ x: 0, y: 0, width: masonryColumns, height: masonryRows }];

      while (regions.length < masonryItems.length) {
        let regionIndex = 0;
        let regionScore = -1;
        regions.forEach((region, index) => {
          const seedBias = 1 + Math.sin((regions.length + 1) * 1.91 + index * 2.37 + seedPhase) * 0.06;
          const score = region.width * region.height * seedBias;
          if (score > regionScore && (region.width > 1 || region.height > 1)) {
            regionIndex = index;
            regionScore = score;
          }
        });

        const region = regions[regionIndex];
        const normalizedWidth = region.width / masonryColumns;
        const normalizedHeight = region.height / masonryRows;
        const orientationWave = Math.sin((regions.length + 1) * 2.63 + seedPhase);
        let splitVertically = normalizedWidth > normalizedHeight;
        if (Math.abs(normalizedWidth - normalizedHeight) < 0.18) {
          splitVertically = orientationWave >= 0;
        }
        if (splitVertically && region.width < 2) splitVertically = false;
        if (!splitVertically && region.height < 2) splitVertically = true;

        const splitWave = Math.sin((regions.length + 1) * 2.17 + seedPhase * 0.83);
        const splitRatio = 0.5 + splitWave * splitAmplitude;
        const dimension = splitVertically ? region.width : region.height;
        const splitAt = Math.max(1, Math.min(dimension - 1, Math.round(dimension * splitRatio)));
        const firstRegion = { ...region };
        const secondRegion = { ...region };

        if (splitVertically) {
          firstRegion.width = splitAt;
          secondRegion.x += splitAt;
          secondRegion.width -= splitAt;
        } else {
          firstRegion.height = splitAt;
          secondRegion.y += splitAt;
          secondRegion.height -= splitAt;
        }
        regions.splice(regionIndex, 1, firstRegion, secondRegion);
      }

      regions
        .sort((a, b) =>
          b.width * b.height - a.width * a.height ||
          a.y - b.y ||
          a.x - b.x
        )
        .forEach((region, index) => {
          const item = masonryItems[index];
          item.style.setProperty('--layout-masonry-column-start', String(region.x + 1));
          item.style.setProperty('--layout-masonry-column-span', String(region.width));
          item.style.setProperty('--layout-masonry-row-start', String(region.y + 1));
          item.style.setProperty('--layout-masonry-row-span', String(region.height));
      });

      pageNode.style.setProperty('--layout-masonry-columns', String(masonryColumns));
      pageNode.style.setProperty('--layout-masonry-rows', String(masonryRows));
      pageNode.style.setProperty('--layout-masonry-gap', `${(2 + absPct * 0.04).toFixed(1)}px`);
    }

    if (photoLayoutValue === 'collage') {
      const collageItems = [...pageNode.querySelectorAll('.page-gallery .gallery-image')];
      const lastCollageIndex = Math.max(1, collageItems.length - 1);
      const direction = rawPct < 0 ? -1 : 1;
      const scatterRadius = 38 + absPct * 0.32;
      const firstSize = collageItems.length === 3
        ? 72.7
        : Math.max(48, 64 - Math.max(0, collageItems.length - 4));
      const lastSize = collageItems.length === 3
        ? 36.6
        : Math.max(14, firstSize * (0.58 - Math.min(0.28, collageItems.length * 0.01)));

      const singleWidth = rawPct >= 0
        ? 78 + rawPct * 0.67
        : 78 + rawPct * 0.36;
      const singleHeight = rawPct >= 0
        ? 64 + rawPct * 0.48
        : 64 + rawPct * 0.28;
      pageNode.style.setProperty('--layout-collage-single-width', `${singleWidth.toFixed(1)}%`);
      pageNode.style.setProperty('--layout-collage-single-height', `${singleHeight.toFixed(1)}%`);
      pageNode.style.setProperty('--layout-collage-single-x', `${(50 + rawPct * 0.18).toFixed(1)}%`);
      pageNode.style.setProperty('--layout-collage-single-rotation', `${(rawPct * 0.18).toFixed(2)}deg`);

      collageItems.forEach((item, index) => {
        const progress = index / lastCollageIndex;
        const baseAngle = -45 + index * 137.508;
        const intensityPhase = rawPct * 0.35 * progress;
        const angle = (baseAngle + intensityPhase) * Math.PI / 180;
        const radius = scatterRadius * Math.sqrt(progress);
        const rectangularX = Math.sign(Math.cos(angle)) * Math.sqrt(Math.abs(Math.cos(angle)));
        const rectangularY = Math.sign(Math.sin(angle)) * Math.sqrt(Math.abs(Math.sin(angle)));
        let width = firstSize - (firstSize - lastSize) * Math.pow(progress, collageItems.length >= 4 ? 0.85 : 0.55);
        const heightRatio = [0.82, 0.68, 0.92, 0.74, 0.86][index % 5];
        let x = 50 + rectangularX * radius;
        let y = 50 + rectangularY * radius * 1.08;

        if (collageItems.length === 2) {
          const diagonalX = 22 + absPct * 0.22;
          const diagonalY = 8 + absPct * 0.15;
          width = index === 0 ? 68 : 58;
          x = index === 0 ? 50 - diagonalX : 50 + diagonalX;
          y = index === 0 ? 50 - direction * diagonalY : 50 + direction * diagonalY;
        }

        const height = width * (collageItems.length === 2 ? 0.8 : heightRatio);
        const rotation = Math.sin(angle * 0.73) * (3 + absPct * 0.18);

        item.style.setProperty('--layout-collage-width', `${width.toFixed(2)}%`);
        item.style.setProperty('--layout-collage-height', `${height.toFixed(2)}%`);
        item.style.setProperty('--layout-collage-x', `${x.toFixed(2)}%`);
        item.style.setProperty('--layout-collage-y', `${y.toFixed(2)}%`);
        item.style.setProperty('--layout-collage-rotation', `${rotation.toFixed(2)}deg`);
        item.style.setProperty('--layout-collage-z', String(index + 1));
      });
    }

    // Direction-based helper classes
    pageNode.classList.toggle('photo-layout-reversed', rawPct < 0);
  } else {
    // Reset all layout custom properties
    [
      '--layout-gap', '--layout-ratio', '--layout-ratio-b',
      '--layout-split-inset', '--layout-split-extent', '--layout-split-offset',
      '--layout-diag-extent', '--layout-diag-offset', '--layout-diag-clip',
      '--layout-tilt', '--layout-overlay-opacity', '--layout-circle-size',
      '--layout-shape-single-size',
      '--layout-collage-single-width', '--layout-collage-single-height',
      '--layout-collage-single-x', '--layout-collage-single-rotation',
      '--layout-masonry-columns', '--layout-masonry-rows', '--layout-masonry-gap'
    ].forEach(prop => pageNode.style.removeProperty(prop));
    pageNode.classList.remove('photo-layout-reversed');
  }

  if (hasEditorOverride('contentPosition', pageIndex)) pageNode.dataset.editorContentPosition = values.contentPosition;
  else delete pageNode.dataset.editorContentPosition;

  const copy = pageNode.querySelector('.book-page-copy');
  const title = pageNode.querySelector('.book-page-copy h4');
  const subtitle = pageNode.querySelector('.book-page-type');
  const caption = pageNode.querySelector('.page-caption');
  const body = pageNode.querySelector('.page-body');
  const pageNumber = pageNode.querySelector('.book-page-number');
  const source = pageNode.querySelector('.page-source');
  if (title) {
    if (hasEditorOverride('titleFont', pageIndex)) {
      loadEditorFont(values.titleFont);
      title.style.setProperty('font-family', editorFontStack(values.titleFont), 'important');
    }
    else title.style.removeProperty('font-family');
    applyEditorTypography(title, 'title', pageIndex);
  }
  [subtitle, caption].filter(Boolean).forEach(node => {
    if (hasEditorOverride('subtitleFont', pageIndex)) {
      loadEditorFont(values.subtitleFont);
      node.style.setProperty('font-family', editorFontStack(values.subtitleFont), 'important');
    }
    else node.style.removeProperty('font-family');
    applyEditorTypography(node, 'subtitle', pageIndex);
  });
  if (body) {
    if (hasEditorOverride('bodyFont', pageIndex)) {
      loadEditorFont(values.bodyFont);
      body.style.setProperty('font-family', editorFontStack(values.bodyFont), 'important');
    }
    else body.style.removeProperty('font-family');
    applyEditorTypography(body, 'body', pageIndex);
  }
  if (title) title.hidden = !values.showTitle;
  if (subtitle) subtitle.hidden = !values.showSubtitle;
  if (caption) caption.hidden = !values.showCaption;
  if (pageNumber) pageNumber.hidden = !values.showPageNumber;
  if (source) source.hidden = !values.showSource;
  pageNode.querySelectorAll('.page-image figcaption, .gallery-image figcaption').forEach(node => {
    node.hidden = !values.showImageCaptions;
  });
  if (body) {
    body.hidden = !values.showBody;
    body.textContent = hasEditorOverride('textAmount', pageIndex)
      ? editorSession.textVariants[pageIndex][Math.max(1, Math.min(5, values.textAmount)) - 1]
      : String(page.body || '');
  }
  if (copy) {
    copy.hidden = ![...copy.children].some(node => {
      return !node.hidden && String(node.textContent || '').trim().length > 0;
    });
  }

}

export function applyBookletEditorState() {
  const { dialogContent } = getEditorControls();
  if (!editorSession || !dialogContent) return;

  const profile = resolvedEditorSetting('profile', 0);
  dialogContent.querySelectorAll('.detail-hero, .spread-section, .book-page').forEach(node => {
    replaceStyleClass(node, profile);
  });

  editorSession.pageNodes.forEach((pageNode, pageIndex) => {
    applyEditorPage(pageNode, editorSession.pages[pageIndex], pageIndex);
  });
  updateEditorSelection();
}

export function updateEditorSelection() {
  const { bookletEditor } = getEditorControls();
  if (!editorSession || !bookletEditor) return;

  editorSession.pageNodes.forEach((node, index) => {
    node.classList.toggle('editor-selected-page', !bookletEditor.hidden && index === editorSession.activePageIndex);
  });
  editorSession.spreadNodes.forEach((node, index) => {
    node.classList.toggle('editor-selected-spread', !bookletEditor.hidden && index === editorSession.activeSpreadIndex);
  });
}

function isCompactPageStageActive() {
  const { bookletEditor, dialog } = getEditorControls();
  return Boolean(
    editorSession &&
    bookletEditor &&
    dialog &&
    !bookletEditor.hidden &&
    editorCompactMode &&
    window.matchMedia('(max-width: 700px)').matches
  );
}

function compactZoomLabel(level = editorCompactPageZoom) {
  return {
    1: '1 page',
    2: '2 pages',
    3: '2-column grid',
    4: '3-column grid',
    5: '4-column grid',
    6: 'Maximum overview'
  }[level] || '1 page';
}

function compactZoomScale(level, controls = getEditorControls()) {
  const { spreadsList } = controls;
  const page = editorSession?.pageNodes[0];
  if (!spreadsList || !page || level <= 1) return 1;

  const pageRect = page.getBoundingClientRect();
  const baseWidth = page.offsetWidth || pageRect.width / Math.max(.01, editorCompactPageScale);
  const baseHeight = page.offsetHeight || pageRect.height / Math.max(.01, editorCompactPageScale);
  if (!baseWidth || !baseHeight) return 1;

  if (level === 2) {
    return Math.min(1, Math.max(.12, (spreadsList.clientWidth - 72) / 2 / baseWidth));
  }

  const gap = 10;
  const availableWidth = Math.max(1, spreadsList.clientWidth - 28);
  const availableHeight = Math.max(1, spreadsList.clientHeight - 28);
  const pageCount = Math.max(1, editorSession?.pageNodes.length || 1);
  const columns = Math.min(level - 1, pageCount);
  const rows = Math.ceil(pageCount / columns);
  const widthScale = (availableWidth - gap * (columns - 1)) / columns / baseWidth;
  const heightScale = (availableHeight - gap * (rows - 1)) / rows / baseHeight;
  const twoPageScale = (spreadsList.clientWidth - 72) / 2 / baseWidth;
  const scale = level === 3
    ? Math.min(widthScale, twoPageScale * .94)
    : level === 6
      ? Math.min(widthScale, heightScale)
      : widthScale;
  return Math.min(1, Math.max(.08, scale));
}

function setCompactZoomOpen(open) {
  const { editorPageZoom, editorPageZoomPanel, editorPageZoomToggle } = getEditorControls();
  editorCompactZoomOpen = Boolean(open && isCompactPageStageActive());
  editorPageZoom?.classList.toggle('editor-page-zoom-open', editorCompactZoomOpen);
  if (editorPageZoomPanel) editorPageZoomPanel.hidden = !editorCompactZoomOpen;
  editorPageZoomToggle?.setAttribute('aria-expanded', String(editorCompactZoomOpen));
}

function scrollCompactPageIntoView(behavior = 'smooth') {
  const { spreadsList } = getEditorControls();
  const page = editorSession?.pageNodes[editorSession.activePageIndex];
  if (!isCompactPageStageActive() || !spreadsList || !page) return;

  const scrollBehavior = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : behavior;
  const listRect = spreadsList.getBoundingClientRect();
  const pageRects = editorCompactPageZoom === 2
    ? editorSession.pageNodes
        .slice(editorSession.activeSpreadIndex * 2, editorSession.activeSpreadIndex * 2 + 2)
        .map(node => node.getBoundingClientRect())
    : [page.getBoundingClientRect()];
  const firstRect = pageRects[0];
  const pageRect = pageRects.slice(1).reduce((combined, rect) => ({
    left: Math.min(combined.left, rect.left),
    right: Math.max(combined.right, rect.right),
    top: Math.min(combined.top, rect.top),
    bottom: Math.max(combined.bottom, rect.bottom),
    width: Math.max(combined.right, rect.right) - Math.min(combined.left, rect.left),
    height: Math.max(combined.bottom, rect.bottom) - Math.min(combined.top, rect.top)
  }), {
    left: firstRect.left,
    right: firstRect.right,
    top: firstRect.top,
    bottom: firstRect.bottom,
    width: firstRect.width,
    height: firstRect.height
  });
  const horizontal = editorCompactPageZoom <= 2;
  const left = spreadsList.scrollLeft + pageRect.left - listRect.left - (listRect.width - pageRect.width) / 2;
  const top = spreadsList.scrollTop + pageRect.top - listRect.top - Math.max(0, (listRect.height - pageRect.height) / 2);

  // CSS `scroll-behavior: smooth` on the element can override JS `behavior: 'instant'`
  // in some browsers (Safari). Temporarily remove the CSS property for instant scrolls.
  const needsInstant = scrollBehavior === 'auto' || scrollBehavior === 'instant';
  if (needsInstant) spreadsList.style.scrollBehavior = 'auto';
  spreadsList.scrollTo({
    left: horizontal ? Math.max(0, left) : 0,
    top: horizontal ? 0 : Math.max(0, top),
    behavior: scrollBehavior
  });
  if (needsInstant) {
    // Restore after the next frame so smooth-scroll CSS re-engages for user swipes.
    requestAnimationFrame(() => { spreadsList.style.scrollBehavior = ''; });
  }
}

function animateCompactPageLayout(previousRects) {
  if (!previousRects || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  editorSession?.pageNodes.forEach(page => {
    const previous = previousRects.get(page);
    const next = page.getBoundingClientRect();
    if (!previous || !next.width || !next.height || typeof page.animate !== 'function') return;
    const deltaX = previous.left - next.left;
    const deltaY = previous.top - next.top;
    const scaleX = previous.width / next.width;
    const scaleY = previous.height / next.height;
    if (Math.abs(deltaX) < 1 && Math.abs(deltaY) < 1 && Math.abs(scaleX - 1) < .01 && Math.abs(scaleY - 1) < .01) return;
    editorCompactPageAnimations.get(page)?.cancel();
    const animation = page.animate([
      { transform: `translate(${deltaX}px, ${deltaY}px) scale(${scaleX}, ${scaleY})` },
      { transform: 'translate(0, 0) scale(1)' }
    ], {
      duration: 520,
      easing: 'cubic-bezier(.22, 1, .36, 1)'
    });
    editorCompactPageAnimations.set(page, animation);
    animation.addEventListener('finish', () => {
      if (editorCompactPageAnimations.get(page) === animation) editorCompactPageAnimations.delete(page);
    }, { once: true });
  });
}

// Zoom-transition for mode switches (horizontal scroll ↔ grid).
// Creates a real camera-zoom feel: pages FLIP from their old positions/sizes
// while pages that weren't visible before fade in from opacity 0.
function animateCompactZoomTransition(previousRects, fromLevel, toLevel) {
  if (!previousRects || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const pages = editorSession?.pageNodes || [];
  if (!pages.length) return;

  const { spreadsList } = getEditorControls();
  const listRect = spreadsList?.getBoundingClientRect();

  // Zooming out (going to more pages): longer duration feels more cinematic.
  // Zooming in (going to fewer pages): snappier feel.
  const zoomingOut = toLevel > fromLevel;
  const DURATION = zoomingOut ? 580 : 500;
  const EASING = 'cubic-bezier(.22, 1, .36, 1)';

  pages.forEach(page => {
    const previous = previousRects.get(page);
    const next = page.getBoundingClientRect();
    if (!next.width || !next.height || typeof page.animate !== 'function') return;

    editorCompactPageAnimations.get(page)?.cancel();

    // Was this page visible in the viewport before the transition?
    const wasVisible = previous && listRect
      ? previous.right > listRect.left + 1 && previous.left < listRect.right - 1
        && previous.bottom > listRect.top + 1 && previous.top < listRect.bottom - 1
      : Boolean(previous);

    let fromTransform, fromOpacity;
    if (!previous || !wasVisible) {
      // Page not visible before — zoom/fade it in from the centre.
      // Use average scale of visible pages so it feels like a zoom reveal.
      const avgScale = zoomingOut ? 2.5 : 0.4;
      fromTransform = `scale(${avgScale})`;
      fromOpacity = 0;
    } else {
      // Page was visible — FLIP it from its old position/size.
      const deltaX = previous.left - next.left;
      const deltaY = previous.top - next.top;
      const scaleX = previous.width / next.width;
      const scaleY = previous.height / next.height;
      fromTransform = `translate(${deltaX}px, ${deltaY}px) scale(${scaleX}, ${scaleY})`;
      fromOpacity = 1;
    }

    const animation = page.animate([
      { transform: fromTransform, opacity: fromOpacity },
      { transform: 'translate(0, 0) scale(1)', opacity: 1 }
    ], {
      duration: DURATION,
      easing: EASING,
    });

    editorCompactPageAnimations.set(page, animation);
    animation.addEventListener('finish', () => {
      if (editorCompactPageAnimations.get(page) === animation) editorCompactPageAnimations.delete(page);
    }, { once: true });
  });
}

function setCompactPageZoom(value, animate = true) {
  const controls = getEditorControls();
  const prev = editorCompactPageZoom;
  const next = Math.max(1, Math.min(6, Number(value) || 1));

  // Detect whether we're crossing the horizontal-scroll ↔ wrap-grid boundary.
  // Levels 1 and 2 use a horizontal scroll strip; levels 3+ use a wrap grid.
  const isModeSwitch = (prev <= 2) !== (next <= 2);

  // BUG FIX (1→2 drift): for same-mode transitions in the horizontal strip,
  // perform an *instant* scroll to the target position BEFORE taking FLIP
  // snapshots. This prevents the scroll animation from running simultaneously
  // with the FLIP transform, which caused pages to appear to slide sideways.
  if (animate && isCompactPageStageActive() && !isModeSwitch && next <= 2) {
    // Temporarily switch to the new zoom level so scrollCompactPageIntoView
    // can compute the correct scroll offset, then restore for the snapshot.
    editorCompactPageZoom = next;
    scrollCompactPageIntoView('instant');
    editorCompactPageZoom = prev; // restore so snapshot sees old positions
  }

  const previousRects = animate && isCompactPageStageActive()
    ? new Map((editorSession?.pageNodes || []).map(page => [page, page.getBoundingClientRect()]))
    : null;
  if (animate) editorCompactScrollSelectionLockedUntil = performance.now() + 900;

  editorCompactPageZoom = next;
  controls.dialog?.setAttribute('data-compact-page-zoom', String(next));
  editorCompactPageScale = compactZoomScale(next, controls);
  controls.dialog?.style.setProperty('--compact-page-scale', editorCompactPageScale.toFixed(4));
  if (controls.editorPageZoomRange) controls.editorPageZoomRange.value = String(next);
  if (controls.editorPageZoomBadge) controls.editorPageZoomBadge.textContent = `${next}×`;
  if (controls.editorPageZoomOutput) controls.editorPageZoomOutput.textContent = compactZoomLabel(next);

  requestAnimationFrame(() => {
    // For mode-switch transitions don't smooth-scroll — the grid/strip layout
    // change already repositions everything, and scroll would fight the FLIP.
    scrollCompactPageIntoView(animate && !isModeSwitch ? 'smooth' : 'auto');
    if (isModeSwitch) {
      animateCompactZoomTransition(previousRects, prev, next);
    } else {
      animateCompactPageLayout(previousRects);
    }
  });
}

function syncCompactPageStage(animate = false) {
  const { dialog, editorPageZoom } = getEditorControls();
  const active = isCompactPageStageActive();
  if (editorPageZoom) editorPageZoom.hidden = !active;
  if (!active) {
    setCompactZoomOpen(false);
    dialog?.removeAttribute('data-compact-page-zoom');
    dialog?.style.removeProperty('--compact-page-scale');
    return;
  }
  setCompactPageZoom(editorCompactPageZoom, animate);
  requestAnimationFrame(() => requestAnimationFrame(() => scrollCompactPageIntoView('auto')));
}

function syncEditorPageFromCompactScroll() {
  editorCompactScrollFrame = null;
  const { spreadsList } = getEditorControls();
  if (!isCompactPageStageActive() || editorCompactPageZoom > 2 || !spreadsList || !editorSession) return;
  if (performance.now() < editorCompactScrollSelectionLockedUntil) return;

  const listRect = spreadsList.getBoundingClientRect();
  const center = listRect.left + listRect.width / 2;
  let closestIndex = editorSession.activePageIndex;
  let closestDistance = Number.POSITIVE_INFINITY;
  editorSession.pageNodes.forEach((page, index) => {
    const rect = page.getBoundingClientRect();
    const distance = Math.abs(rect.left + rect.width / 2 - center);
    if (distance < closestDistance) {
      closestDistance = distance;
      closestIndex = index;
    }
  });
  if (editorCompactPageZoom === 2 && Math.floor(closestIndex / 2) === editorSession.activeSpreadIndex) return;
  if (closestIndex === editorSession.activePageIndex) return;
  editorSession.activePageIndex = closestIndex;
  editorSession.activeSpreadIndex = Math.floor(closestIndex / 2);
  updateEditorSelection();
  syncBookletEditorControls();
}

function queueCompactScrollSelection() {
  if (editorCompactScrollFrame !== null) return;
  editorCompactScrollFrame = requestAnimationFrame(syncEditorPageFromCompactScroll);
  clearTimeout(editorCompactPairSettleTimer);
  if (editorCompactPageZoom === 2) {
    editorCompactPairSettleTimer = setTimeout(() => scrollCompactPageIntoView('smooth'), 160);
  }
}

function queueCompactPageStageResize() {
  if (!isCompactPageStageActive() || editorCompactResizeFrame !== null) return;
  editorCompactResizeFrame = requestAnimationFrame(() => {
    editorCompactResizeFrame = null;
    setCompactPageZoom(editorCompactPageZoom, false);
  });
}

function zoomIntoCompactPage(pageIndex) {
  if (!isCompactPageStageActive() || editorCompactPageZoom <= 2 || !editorSession?.pageNodes[pageIndex]) return;
  editorSession.activePageIndex = pageIndex;
  editorSession.activeSpreadIndex = Math.floor(pageIndex / 2);
  updateEditorSelection();
  syncBookletEditorControls();
  setCompactZoomOpen(false);
  setCompactPageZoom(1, true);
}

export function editorParameterValueText(parameter) {
  const control = parameter.control;
  if (!control) return '';
  if (parameter.key === 'advancedTypography') return 'Title · Subtitle · Body';
  if (parameter.key === 'visibleContent') {
    const toggles = [...control.querySelectorAll('input[type="checkbox"]')];
    return `${toggles.filter(toggle => toggle.checked).length} / ${toggles.length} shown`;
  }
  if (control.type === 'checkbox') return control.checked ? 'On' : 'Off';
  if (control.tagName === 'SELECT') return control.selectedOptions[0]?.textContent?.trim() || control.value;
  if (parameter.key === 'fontTracking' || parameter.key === 'fontLineHeight') return `${control.value}%`;
  if (control.type === 'range') return `${control.value} / ${control.max}`;
  return control.value;
}

function renderEditorParameterMenu() {
  const { editorParameterMenu, editorParameterMenuToggle } = getEditorControls();
  if (!editorParameterMenu) return;

  const available = availableEditorParameters();
  const fragment = document.createDocumentFragment();
  available.forEach((parameter, index) => {
    const button = document.createElement('button');
    const label = document.createElement('strong');
    const value = document.createElement('span');
    const arrow = document.createElement('i');

    button.type = 'button';
    button.dataset.editorParameterKey = parameter.key;
    button.classList.toggle('is-active', index === editorParameterIndex);
    label.textContent = parameter.label;
    value.textContent = editorParameterValueText(parameter);
    arrow.textContent = '→';
    arrow.setAttribute('aria-hidden', 'true');
    button.append(label, value, arrow);
    fragment.append(button);
  });

  editorParameterMenu.replaceChildren(fragment);
  editorParameterMenu.setAttribute('aria-hidden', String(!editorParameterMenuOpen));
  if (editorParameterMenuToggle) {
    editorParameterMenuToggle.setAttribute('aria-expanded', String(editorParameterMenuOpen));
  }
}

function setEditorParameterMenu(open) {
  const { bookletEditor, editorParameterMenu, editorParameterMenuToggle } = getEditorControls();
  if (!bookletEditor) return;

  const mobileCompact = editorCompactMode && window.matchMedia('(max-width: 700px)').matches;
  editorParameterMenuOpen = Boolean(open && mobileCompact);
  bookletEditor.classList.toggle('editor-parameter-menu-open', editorParameterMenuOpen);
  editorParameterMenu?.setAttribute('aria-hidden', String(!editorParameterMenuOpen));
  editorParameterMenuToggle?.setAttribute('aria-expanded', String(editorParameterMenuOpen));
}

export function updateEditorCompactParameter(renderMenu = true) {
  const { bookletEditor, editorParameterLabel, editorParameterValue, bookletEditorMode } = getEditorControls();
  if (!bookletEditor) return;

  const available = availableEditorParameters();
  if (!available.length) return;
  editorParameterIndex = ((editorParameterIndex % available.length) + available.length) % available.length;
  const active = available[editorParameterIndex];

  bookletEditor.querySelectorAll('[data-editor-parameter]').forEach(node => {
    node.classList.toggle('editor-parameter-active', node.dataset.editorParameter === active.key);
  });
  bookletEditor.querySelectorAll('.editor-group').forEach(group => {
    group.classList.toggle('editor-group-active', Boolean(group.querySelector('.editor-parameter-active')));
  });

  if (editorParameterLabel) editorParameterLabel.textContent = active.label;
  if (editorParameterValue) editorParameterValue.textContent = editorParameterValueText(active);
  if (bookletEditorMode) {
    bookletEditorMode.textContent = editorCompactMode ? 'Full' : 'Mini';
    bookletEditorMode.setAttribute('aria-pressed', String(editorCompactMode));
  }
  if (renderMenu) renderEditorParameterMenu();
}

export function setEditorCompactMode(compact, persist = true) {
  const { bookletEditor, dialog } = getEditorControls();
  if (!bookletEditor || !dialog) return;

  editorCompactMode = Boolean(compact);
  setEditorParameterMenu(false);
  bookletEditor.classList.toggle('editor-compact', editorCompactMode);
  dialog.classList.toggle('editor-compact-open', editorCompactMode && !bookletEditor.hidden);
  if (persist) localStorage.setItem(EDITOR_COMPACT_STORAGE_KEY, String(editorCompactMode));
  updateEditorCompactParameter();
  syncCompactPageStage(true);
}

export function moveEditorParameter(direction) {
  const available = availableEditorParameters();
  if (!available.length) return;
  setEditorParameterMenu(false);
  resetEditorTypographyCascade();
  editorParameterIndex = (editorParameterIndex + direction + available.length) % available.length;
  updateEditorCompactParameter();
}

export function syncBookletEditorControls() {
  if (!editorSession) return;
  const controls = getEditorControls();
  const index = editorSession.activePageIndex;
  const values = editorSession.originalSettings[index];
  const get = key => resolvedEditorSetting(key, index) ?? values[key];

  if (controls.editorScopeCompact && controls.editorScope) {
    controls.editorScopeCompact.value = controls.editorScope.value;
  }
  if (controls.editorProfile) controls.editorProfile.value = get('profile');
  if (controls.editorVisualMode) controls.editorVisualMode.value = get('visualMode');
  if (controls.editorLayoutComplexity) controls.editorLayoutComplexity.value = get('layoutComplexity');
  if (controls.editorImageCount) controls.editorImageCount.value = get('imageCount');
  if (controls.editorPhotoLayout) {
    controls.editorPhotoLayout.value = get('photoLayout') || 'auto';
    syncEditorSliderSelect(controls.editorPhotoLayout);
  }
  if (controls.editorPhotoLayoutVariant) controls.editorPhotoLayoutVariant.value = get('photoLayoutVariant') ?? 0;
  if (controls.editorPhotoLayoutVariantOutput && controls.editorPhotoLayoutVariant) {
    controls.editorPhotoLayoutVariantOutput.value = controls.editorPhotoLayoutVariant.value;
  }
  if (controls.editorContentPosition) {
    controls.editorContentPosition.value = get('contentPosition');
    syncEditorSliderSelect(controls.editorContentPosition);
  }
  if (controls.editorTextAmount) controls.editorTextAmount.value = get('textAmount');
  if (controls.editorFontScale) controls.editorFontScale.value = get('fontScale');
  const activeFontTarget = activeEditorFontTarget(controls);
  syncEditorTypographyTargets(get, controls);
  if (controls.editorFontFamily) {
    const fontKey = activeFontTarget?.familyKey || 'titleFont';
    const family = get(fontKey);
    if (family && ![...controls.editorFontFamily.options].some(option => option.value === family)) {
      controls.editorFontFamily.add(new Option(`${family} · custom`, family));
    }
    if (family) controls.editorFontFamily.value = family;
    syncEditorSliderSelect(controls.editorFontFamily);
  }
  const fontPrefix = activeFontTarget?.prefix || 'title';
  if (controls.editorFontWeight) {
    controls.editorFontWeight.value = String(get(`${fontPrefix}FontWeight`));
    syncEditorSliderSelect(controls.editorFontWeight);
  }
  if (controls.editorFontTracking) controls.editorFontTracking.value = get(`${fontPrefix}FontTracking`);
  if (controls.editorFontLineHeight) controls.editorFontLineHeight.value = get(`${fontPrefix}FontLineHeight`);
  if (controls.editorFontItalic) controls.editorFontItalic.checked = Boolean(get(`${fontPrefix}FontItalic`));
  if (controls.editorFontUnderline) controls.editorFontUnderline.checked = Boolean(get(`${fontPrefix}FontUnderline`));
  if (controls.editorFontUppercase) controls.editorFontUppercase.checked = Boolean(get(`${fontPrefix}FontUppercase`));
  if (controls.editorSpacing) controls.editorSpacing.value = get('spacing');
  if (controls.editorEffectLevel) controls.editorEffectLevel.value = get('effectLevel');
  if (controls.editorShowTitle) controls.editorShowTitle.checked = Boolean(get('showTitle'));
  if (controls.editorShowSubtitle) controls.editorShowSubtitle.checked = Boolean(get('showSubtitle'));
  if (controls.editorShowBody) controls.editorShowBody.checked = Boolean(get('showBody'));
  if (controls.editorShowCaption) controls.editorShowCaption.checked = Boolean(get('showCaption'));
  if (controls.editorShowPageNumber) controls.editorShowPageNumber.checked = Boolean(get('showPageNumber'));
  if (controls.editorShowSource) controls.editorShowSource.checked = Boolean(get('showSource'));
  if (controls.editorShowImageCaptions) controls.editorShowImageCaptions.checked = Boolean(get('showImageCaptions'));

  if (controls.editorLayoutOutput && controls.editorLayoutComplexity) controls.editorLayoutOutput.value = controls.editorLayoutComplexity.value;
  if (controls.editorImageOutput && controls.editorImageCount) controls.editorImageOutput.value = controls.editorImageCount.value;
  if (controls.editorPhotoLayoutVariantOutput && controls.editorPhotoLayoutVariant) controls.editorPhotoLayoutVariantOutput.value = controls.editorPhotoLayoutVariant.value;
  if (controls.editorTextOutput && controls.editorTextAmount) controls.editorTextOutput.value = controls.editorTextAmount.value;
  if (controls.editorFontOutput && controls.editorFontScale) controls.editorFontOutput.value = controls.editorFontScale.value;
  if (controls.editorFontTrackingOutput && controls.editorFontTracking) controls.editorFontTrackingOutput.value = controls.editorFontTracking.value;
  if (controls.editorFontLineHeightOutput && controls.editorFontLineHeight) controls.editorFontLineHeightOutput.value = controls.editorFontLineHeight.value;
  if (controls.editorSpacingOutput && controls.editorSpacing) controls.editorSpacingOutput.value = controls.editorSpacing.value;
  if (controls.editorEffectOutput && controls.editorEffectLevel) controls.editorEffectOutput.value = controls.editorEffectLevel.value;
  syncEditorFontRecommendations();

  if (controls.editorProfile && controls.editorScope) {
    controls.editorProfile.disabled = controls.editorScope.value !== 'booklet';
    controls.editorProfile.title = controls.editorProfile.disabled ? 'Editorial profile applies to the entire booklet.' : '';
  }
  if (controls.editorTargetLabel && controls.editorScope) {
    controls.editorTargetLabel.textContent = controls.editorScope.value === 'booklet'
      ? 'Booklet defaults'
      : controls.editorScope.value === 'spread'
        ? `Spread ${editorSession.activeSpreadIndex + 1} · pages ${editorSession.activeSpreadIndex * 2 + 1}–${Math.min(editorSession.pages.length, editorSession.activeSpreadIndex * 2 + 2)}`
        : `Page ${editorSession.activePageIndex + 1}`;
  }
  updateEditorCompactParameter();
}

export function setEditorFontForTargets(family) {
  if (!editorSession || !family) return;
  const controls = getEditorControls();
  const target = activeEditorFontTarget(controls);

  const bucket = activeEditorBucket();
  if (!bucket || !target) return;
  bucket[target.familyKey] = family;
  loadEditorFont(family);
  applyBookletEditorState();
  syncBookletEditorControls();
  scheduleEditorSave();
}

export function setEditorTypographyForTargets(suffix, value) {
  if (!editorSession) return;
  const controls = getEditorControls();
  const target = activeEditorFontTarget(controls);

  const bucket = activeEditorBucket();
  if (!bucket || !target) return;
  bucket[`${target.prefix}${suffix}`] = value;
  applyBookletEditorState();
  syncBookletEditorControls();
  scheduleEditorSave();
}

export function setEditorValue(key, value) {
  if (!editorSession) return;
  const bucket = key === 'profile' ? editorSession.state.booklet : activeEditorBucket();
  if (bucket) bucket[key] = value;
  applyBookletEditorState();
  syncBookletEditorControls();
  scheduleEditorSave();
}

export function openBookletEditor() {
  const { bookletEditor, dialog } = getEditorControls();
  if (!editorSession || !bookletEditor || !dialog) return;

  bookletEditor.hidden = false;
  dialog.classList.add('editor-is-open');
  setEditorCompactMode(editorCompactMode, false);
  updateEditorSelection();
  syncBookletEditorControls();
  syncCompactPageStage(false);
}

function resetEditorTypographyCascade() {
  const controls = getEditorControls();
  editorTypographyLevel = 'targets';
  editorTypographySetting = null;
  if (controls.editorTypographyTargetList) controls.editorTypographyTargetList.hidden = false;
  if (controls.editorTypographyCascade) controls.editorTypographyCascade.hidden = true;
  if (controls.editorTypographySettingList) controls.editorTypographySettingList.hidden = false;
  if (controls.editorTypographySettingEditor) controls.editorTypographySettingEditor.hidden = true;
}

export function closeBookletEditor() {
  const { bookletEditor, dialog } = getEditorControls();
  if (!bookletEditor || !dialog) return;

  resetEditorTypographyCascade();
  setEditorParameterMenu(false);
  bookletEditor.hidden = true;
  dialog.classList.remove('editor-is-open');
  dialog.classList.remove('editor-compact-open');
  syncCompactPageStage(false);
  updateEditorSelection();
}

export function initializeBookletEditor(item) {
  const controls = getEditorControls();
  const pages = pagesFor(item);
  editorTypographyTarget = 'title';
  resetEditorTypographyCascade();

  editorSession = {
    item,
    pages,
    state: loadEditorState(item),
    imagePool: uniqueEditorImages(pages),
    textVariants: pages.map(editorTextVariantsFor),
    originalSettings: pages.map(page => originalEditorSettings(item, page)),
    pageNodes: [...(controls.dialogContent?.querySelectorAll('.book-page:not(.blank-page)') || [])],
    spreadNodes: [...(controls.dialogContent?.querySelectorAll('.print-spread') || [])],
    activePageIndex: 0,
    activeSpreadIndex: 0
  };

  const sourceProfile = controls.generationForm?.querySelector('[name="style"]');
  if (sourceProfile && controls.editorProfile && !controls.editorProfile.options.length) {
    controls.editorProfile.innerHTML = sourceProfile.innerHTML;
  }
  if (controls.editorProfile && ![...controls.editorProfile.options].some(option => option.value === editorSession.originalSettings[0].profile)) {
    controls.editorProfile.add(new Option(editorSession.originalSettings[0].profile, editorSession.originalSettings[0].profile));
  }
  if (controls.editorProfile) {
    bindStyleSlider(controls.editorProfile);
  }
  if (controls.editorPhotoLayout) {
    bindStyleSlider(controls.editorPhotoLayout);
  }
  if (controls.editorContentPosition) {
    bindStyleSlider(controls.editorContentPosition);
  }
  populateEditorFontControl();

  editorSession.pageNodes.forEach((node, index) => {
    node.dataset.pageIndex = String(index);
    node.addEventListener('click', event => {
      if (controls.bookletEditor?.hidden || event.target.closest('a')) return;
      editorSession.activePageIndex = index;
      editorSession.activeSpreadIndex = Math.floor(index / 2);
      updateEditorSelection();
      syncBookletEditorControls();
    });
    node.addEventListener('dblclick', event => {
      if (event.target.closest('a')) return;
      event.preventDefault();
      zoomIntoCompactPage(index);
    });
    node.addEventListener('pointerup', event => {
      if (event.pointerType === 'mouse' || event.target.closest('a') || editorCompactPageZoom <= 2) return;
      const now = performance.now();
      const isDoubleTap = editorCompactLastTapPage === index && now - editorCompactLastTapTime < 360;
      editorCompactLastTapPage = isDoubleTap ? -1 : index;
      editorCompactLastTapTime = isDoubleTap ? 0 : now;
      if (!isDoubleTap) return;
      event.preventDefault();
      zoomIntoCompactPage(index);
    });
  });
  editorSession.spreadNodes.forEach((node, index) => {
    node.dataset.spreadIndex = String(index);
  });
  controls.spreadsList?.addEventListener('scroll', queueCompactScrollSelection, { passive: true });

  closeBookletEditor();
  applyBookletEditorState();
  syncBookletEditorControls();
}

export function setupEditorEventListeners() {
  const controls = getEditorControls();

  [
    [controls.editorProfile, 'profile', value => value],
    [controls.editorVisualMode, 'visualMode', value => value],
    [controls.editorLayoutComplexity, 'layoutComplexity', Number],
    [controls.editorImageCount, 'imageCount', Number],
    [controls.editorPhotoLayout, 'photoLayout', value => value],
    [controls.editorPhotoLayoutVariant, 'photoLayoutVariant', Number],
    [controls.editorTextAmount, 'textAmount', Number],
    [controls.editorContentPosition, 'contentPosition', value => value],
    [controls.editorFontScale, 'fontScale', Number],
    [controls.editorSpacing, 'spacing', Number],
    [controls.editorEffectLevel, 'effectLevel', Number]
  ].forEach(([control, key, parse]) => {
    if (!control) return;
    const eventName = control.type === 'range' ? 'input' : 'change';
    control.addEventListener(eventName, () => setEditorValue(key, parse(control.value)));
  });

  controls.editorFontFamily?.addEventListener('change', () => {
    setEditorFontForTargets(controls.editorFontFamily.value);
  });
  controls.editorFontWeight?.addEventListener('change', () => {
    setEditorTypographyForTargets('FontWeight', Number(controls.editorFontWeight.value));
  });
  controls.editorFontTracking?.addEventListener('input', () => {
    setEditorTypographyForTargets('FontTracking', Number(controls.editorFontTracking.value));
  });
  controls.editorFontLineHeight?.addEventListener('input', () => {
    setEditorTypographyForTargets('FontLineHeight', Number(controls.editorFontLineHeight.value));
  });
  [
    [controls.editorFontItalic, 'FontItalic'],
    [controls.editorFontUnderline, 'FontUnderline'],
    [controls.editorFontUppercase, 'FontUppercase']
  ].forEach(([control, suffix]) => {
    control?.addEventListener('change', () => {
      setEditorTypographyForTargets(suffix, control.checked);
    });
  });
  editorFontTargets(controls).forEach(target => {
    target.button?.addEventListener('click', () => {
      editorTypographyTarget = target.prefix;
      editorTypographyLevel = 'settings';
      editorTypographySetting = null;
      syncBookletEditorControls();
    });
  });
  controls.editorTypographySettingList?.querySelectorAll('button[data-typography-setting]').forEach(button => {
    button.addEventListener('click', () => {
      editorTypographySetting = button.dataset.typographySetting;
      editorTypographyLevel = 'control';
      syncBookletEditorControls();
    });
  });
  controls.editorTypographyBack?.addEventListener('click', () => {
    if (editorTypographyLevel === 'control') {
      editorTypographyLevel = 'settings';
      editorTypographySetting = null;
      syncBookletEditorControls();
      return;
    }
    resetEditorTypographyCascade();
    syncBookletEditorControls();
  });

  [
    [controls.editorShowTitle, 'showTitle'],
    [controls.editorShowSubtitle, 'showSubtitle'],
    [controls.editorShowBody, 'showBody'],
    [controls.editorShowCaption, 'showCaption'],
    [controls.editorShowPageNumber, 'showPageNumber'],
    [controls.editorShowSource, 'showSource'],
    [controls.editorShowImageCaptions, 'showImageCaptions']
  ].forEach(([control, key]) => {
    control?.addEventListener('change', () => setEditorValue(key, control.checked));
  });

  controls.editorScope?.addEventListener('change', syncBookletEditorControls);
  controls.editorScopeCompact?.addEventListener('change', () => {
    if (!controls.editorScope) return;
    controls.editorScope.value = controls.editorScopeCompact.value;
    syncBookletEditorControls();
  });
  controls.bookletEditorClose?.addEventListener('click', closeBookletEditor);
  controls.bookletEditorMode?.addEventListener('click', () => setEditorCompactMode(!editorCompactMode));
  controls.editorPageZoomToggle?.addEventListener('click', () => setCompactZoomOpen(!editorCompactZoomOpen));
  controls.editorPageZoomRange?.addEventListener('input', () => {
    setCompactPageZoom(controls.editorPageZoomRange.value, true);
  });
  controls.editorPageZoom?.addEventListener('keydown', event => {
    if (event.key !== 'Escape' || !editorCompactZoomOpen) return;
    event.stopPropagation();
    setCompactZoomOpen(false);
    controls.editorPageZoomToggle?.focus();
  });
  controls.editorParameterPrevious?.addEventListener('click', () => moveEditorParameter(-1));
  controls.editorParameterNext?.addEventListener('click', () => moveEditorParameter(1));
  controls.editorParameterMenuToggle?.addEventListener('click', () => {
    if (!editorCompactMode || !window.matchMedia('(max-width: 700px)').matches) return;
    if (editorParameterMenuOpen) {
      setEditorParameterMenu(false);
      return;
    }
    renderEditorParameterMenu();
    requestAnimationFrame(() => setEditorParameterMenu(true));
  });
  controls.editorParameterMenu?.addEventListener('click', event => {
    const button = event.target.closest('[data-editor-parameter-key]');
    if (!button) return;
    const available = availableEditorParameters();
    const index = available.findIndex(parameter => parameter.key === button.dataset.editorParameterKey);
    if (index < 0) return;
    controls.editorParameterMenu.querySelectorAll('[data-editor-parameter-key]').forEach(item => {
      item.classList.toggle('is-active', item === button);
    });
    resetEditorTypographyCascade();
    editorParameterIndex = index;
    updateEditorCompactParameter(false);
    setEditorParameterMenu(false);
  });
  controls.bookletEditor?.addEventListener('keydown', event => {
    if (event.key !== 'Escape' || !editorParameterMenuOpen) return;
    event.stopPropagation();
    setEditorParameterMenu(false);
  });
  window.matchMedia('(max-width: 700px)').addEventListener('change', event => {
    if (!event.matches) setEditorParameterMenu(false);
    syncCompactPageStage(false);
  });
  window.addEventListener('resize', queueCompactPageStageResize, { passive: true });
  controls.dialogEdit?.addEventListener('click', openBookletEditor);

  controls.editorResetScope?.addEventListener('click', () => {
    if (!editorSession || !controls.editorScope) return;
    if (controls.editorScope.value === 'booklet') editorSession.state.booklet = {};
    else if (controls.editorScope.value === 'spread') delete editorSession.state.spreads[String(editorSession.activeSpreadIndex)];
    else delete editorSession.state.pages[String(editorSession.activePageIndex)];
    applyBookletEditorState();
    syncBookletEditorControls();
    scheduleEditorSave();
  });

  controls.editorResetAll?.addEventListener('click', () => {
    if (!editorSession) return;
    editorSession.state = emptyEditorState();
    localStorage.removeItem(editorStorageKey(editorSession.item));
    applyBookletEditorState();
    syncBookletEditorControls();
    if (controls.editorSaveStatus) controls.editorSaveStatus.textContent = 'All local adjustments were reset.';
  });
}
