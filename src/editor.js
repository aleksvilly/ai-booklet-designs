import { EDITOR_STORAGE_PREFIX, EDITOR_COMPACT_STORAGE_KEY } from './config.js';
import { safeUrl, safeClass, fontStack, loadGoogleFonts } from './utils.js';
import { pagesFor, imagesForPage } from './collection.js';
import { mediaMarkup, loadDialogImages } from './detail-modal.js';
import { bindStyleSlider, getGeneratorCatalog } from './catalog.js';
import {
  prepareLocalPhoto,
  readLocalPhoto,
  searchPhotoProviders,
  storeLocalPhoto,
  testRemotePhoto,
  validateRemotePhotoUrl
} from './photo-library.js';

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
let editorCompactSnapUnlockTimer = null;
let editorCompactLastTapPage = -1;
let editorCompactLastTapTime = 0;
let editorCompactScrollSelectionLockedUntil = 0;
let editorPhotoSearchController = null;
const editorPhotoObjectUrls = new Map();
let editorPlaceholderPhoto = null;
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

const PARAM_ICONS = {
  profile: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/><path d="M9 6h6"/><path d="M9 10h6"/></svg>`,
  visualMode: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><circle cx="13.5" cy="6.5" r=".5" fill="currentColor"/><circle cx="17.5" cy="10.5" r=".5" fill="currentColor"/><circle cx="8.5" cy="7.5" r=".5" fill="currentColor"/><circle cx="6.5" cy="12.5" r=".5" fill="currentColor"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.92 0 1.7-.6 1.9-1.5.24-1.1.9-2 2.1-2h2c2.2 0 4-1.8 4-4 0-4.5-4.5-12.5-10-12.5z"/></svg>`,
  layoutComplexity: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/><path d="M9 21V9"/><path d="M15 21V9"/></svg>`,
  imageCount: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></svg>`,
  photoLayout: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 12h18"/><path d="M12 3v18"/></svg>`,
  photoLayoutVariant: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M4 21v-7"/><path d="M4 10V3"/><path d="M12 21v-9"/><path d="M12 8V3"/><path d="M20 21v-5"/><path d="M20 12V3"/><path d="M1 14h6"/><path d="M9 8h6"/><path d="M17 16h6"/></svg>`,
  layoutSystem: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M4 3h16a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z"/><path d="M4 9h16"/><path d="M10 9v12"/></svg>`,
  textAmount: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M17 6H3"/><path d="M21 12H3"/><path d="M15 18H3"/></svg>`,
  contentPosition: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v18"/><path d="m8 7 4-4 4 4"/><path d="m8 17 4 4 4-4"/><rect x="6" y="9" width="12" height="6" rx="1"/></svg>`,
  fontScale: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19V6.5a2.5 2.5 0 0 1 5 0V19"/><path d="M4 14h5"/><path d="M14 19v-7.5a2 2 0 0 1 4 0V19"/><path d="M14 15h4"/></svg>`,
  advancedTypography: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7V4h16v3"/><path d="M9 20h6"/><path d="M12 4v16"/></svg>`,
  spacing: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M21 6H3"/><path d="M21 18H3"/><path d="M12 9v6"/><path d="m9 11 3-3 3 3"/><path d="m9 13 3 3 3-3"/></svg>`,
  effectLevel: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3L12 3z"/><path d="M5 3v4"/><path d="M3 5h4"/><path d="M19 17v4"/><path d="M17 19h4"/></svg>`,
  visibleContent: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/></svg>`
};

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
    editorParameterIcon: document.querySelector('#editor-parameter-icon'),
    editorParameterLabel: document.querySelector('#editor-parameter-label'),
    editorParameterValue: document.querySelector('#editor-parameter-value'),
    editorScope: document.querySelector('#editor-scope'),
    editorScopeCompact: document.querySelector('#editor-scope-compact'),
    editorTargetLabel: document.querySelector('#editor-target-label'),
    editorProfile: document.querySelector('#editor-profile'),
    editorVisualMode: document.querySelector('#editor-visual-mode'),
    editorLayoutComplexity: document.querySelector('#editor-layout-complexity'),
    editorImageCount: document.querySelector('#editor-image-count'),
    editorPhotoControlPage: document.querySelector('#editor-photo-control-page'),
    editorManagePhotos: document.querySelector('#editor-manage-photos'),
    editorPhotoManager: document.querySelector('#editor-photo-manager'),
    editorPhotoClose: document.querySelector('#editor-photo-close'),
    editorPhotoPageLabel: document.querySelector('#editor-photo-page-label'),
    editorPhotoPageCount: document.querySelector('#editor-photo-page-count'),
    editorPhotoPageList: document.querySelector('#editor-photo-page-list'),
    editorPhotoPageEmpty: document.querySelector('#editor-photo-page-empty'),
    editorPhotoUploadButton: document.querySelector('#editor-photo-upload-button'),
    editorPhotoFile: document.querySelector('#editor-photo-file'),
    editorPhotoUrlToggle: document.querySelector('#editor-photo-url-toggle'),
    editorPhotoUrlForm: document.querySelector('#editor-photo-url-form'),
    editorPhotoUrl: document.querySelector('#editor-photo-url'),
    editorPhotoSearchToggle: document.querySelector('#editor-photo-search-toggle'),
    editorPhotoSearchForm: document.querySelector('#editor-photo-search-form'),
    editorPhotoSearch: document.querySelector('#editor-photo-search'),
    editorPhotoProvider: document.querySelector('#editor-photo-provider'),
    editorPhotoSearchResults: document.querySelector('#editor-photo-search-results'),
    editorPhotoSearchEmpty: document.querySelector('#editor-photo-search-empty'),
    editorPhotoStatus: document.querySelector('#editor-photo-status'),
    editorPhotoLibrary: document.querySelector('#editor-photo-library'),
    editorPhotoLibraryCount: document.querySelector('#editor-photo-library-count'),
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
    editorLayoutSystem: document.querySelector('#editor-layout-system'),
    editorSaveStatus: document.querySelector('#editor-save-status'),
    editorResetScope: document.querySelector('#editor-reset-scope'),
    editorResetAll: document.querySelector('#editor-reset-all'),
    generationForm: document.querySelector('#generation-form'),
    editorTextMode: document.querySelector('#editor-text-mode'),
    editorTextBackBtn: document.querySelector('#editor-text-back-btn'),
    editorTextFieldEyebrow: document.querySelector('#editor-text-field-eyebrow'),
    editorTextFieldTitle: document.querySelector('#editor-text-field-title'),
    editorTextTextarea: document.querySelector('#editor-text-textarea'),
    editorTextUrlGroup: document.querySelector('#editor-text-url-group'),
    editorTextUrlInput: document.querySelector('#editor-text-url-input'),
    editorTextCancelBtn: document.querySelector('#editor-text-cancel-btn'),
    editorTextSaveBtn: document.querySelector('#editor-text-save-btn')
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
    editorPhotoLayout, editorPhotoLayoutVariant, editorLayoutSystem
  } = getEditorControls();

  const editorParameters = [
    { key: 'profile', label: 'Editorial profile', control: editorProfile },
    { key: 'visualMode', label: 'Visual language', control: editorVisualMode },
    { key: 'layoutComplexity', label: 'Page complexity', control: editorLayoutComplexity },
    { key: 'imageCount', label: 'Page photos', control: editorImageCount },
    { key: 'photoLayout', label: 'Photo layout', control: editorPhotoLayout },
    { key: 'photoLayoutVariant', label: 'Layout intensity', control: editorPhotoLayoutVariant },
    { key: 'layoutSystem', label: 'Page layout system', control: editorLayoutSystem },
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
  return { version: 2, booklet: {}, spreads: {}, pages: {}, photoLibrary: [] };
}

export function loadEditorState(item) {
  try {
    const stored = JSON.parse(localStorage.getItem(editorStorageKey(item)) || 'null');
    if (!stored || ![1, 2].includes(stored.version)) return emptyEditorState();
    const state = {
      version: 2,
      booklet: stored.booklet && typeof stored.booklet === 'object' ? stored.booklet : {},
      spreads: stored.spreads && typeof stored.spreads === 'object' ? stored.spreads : {},
      pages: stored.pages && typeof stored.pages === 'object' ? stored.pages : {},
      photoLibrary: Array.isArray(stored.photoLibrary) ? stored.photoLibrary.slice(0, 200) : []
    };
    const pageOnlyKeys = ['imageCount', 'photoLayout', 'photoLayoutVariant'];
    pagesFor(item).forEach((page, pageIndex) => {
      const pageKey = String(pageIndex);
      const spreadKey = String(Math.floor(pageIndex / 2));
      const savedPageState = state.pages[pageKey];
      const pageState = savedPageState && typeof savedPageState === 'object' && !Array.isArray(savedPageState)
        ? savedPageState
        : {};
      const spreadState = state.spreads[spreadKey] && typeof state.spreads[spreadKey] === 'object'
        ? state.spreads[spreadKey]
        : {};
      pageOnlyKeys.forEach(key => {
        if (Object.prototype.hasOwnProperty.call(pageState, key)) return;
        if (Object.prototype.hasOwnProperty.call(spreadState, key)) {
          pageState[key] = spreadState[key];
        } else if (Object.prototype.hasOwnProperty.call(state.booklet, key)) {
          pageState[key] = state.booklet[key];
        }
      });
      if (Object.keys(pageState).length) state.pages[pageKey] = pageState;
    });
    pageOnlyKeys.forEach(key => {
      delete state.booklet[key];
      Object.values(state.spreads).forEach(spread => {
        if (spread && typeof spread === 'object') delete spread[key];
      });
    });
    return state;
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

function photoIdentity(image = {}) {
  return String(image.localBlobId || image.id || image.url || '').trim();
}

function resolvedPhoto(image = {}) {
  const localUrl = image.localBlobId ? editorPhotoObjectUrls.get(image.localBlobId) : '';
  return localUrl ? { ...image, url: localUrl } : image;
}

function placeholderPhoto() {
  if (editorPlaceholderPhoto) return editorPlaceholderPhoto;
  const canvas = document.createElement('canvas');
  canvas.width = 960;
  canvas.height = 640;
  const context = canvas.getContext('2d');
  const gradient = context.createLinearGradient(0, 0, canvas.width, canvas.height);
  gradient.addColorStop(0, '#d9d4c8');
  gradient.addColorStop(.48, '#777b82');
  gradient.addColorStop(1, '#20242b');
  context.fillStyle = gradient;
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.globalAlpha = .48;
  context.fillStyle = '#f4efe4';
  context.beginPath();
  context.arc(715, 185, 175, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = '#e05d3c';
  context.fillRect(80, 420, 630, 76);
  context.globalAlpha = 1;
  editorPlaceholderPhoto = {
    id: 'editor-layout-placeholder',
    url: canvas.toDataURL('image/jpeg', .82),
    alt: 'Layout placeholder',
    creator: 'AI Booklet Designs',
    source: 'Layout placeholder',
    license: 'Local preview',
    isPlaceholder: true
  };
  return editorPlaceholderPhoto;
}

function pagePhotos(pageIndex = editorSession?.activePageIndex || 0) {
  if (!editorSession) return [];
  const page = editorSession.pages[pageIndex];
  const originalCount = imagesForPage(page).length;
  const count = hasEditorOverride('imageCount', pageIndex)
    ? Math.max(0, Math.min(20, Number(resolvedEditorSetting('imageCount', pageIndex))))
    : originalCount;
  return imagesForEditorCount(page, count, editorSession.imagePool, pageIndex);
}

function allBookletPhotos() {
  if (!editorSession) return [];
  const seen = new Set();
  const original = editorSession.pages.flatMap(imagesForPage);
  const assigned = editorSession.pages.flatMap((page, index) => pagePhotos(index));
  return [...assigned, ...editorSession.state.photoLibrary, ...original]
    .map(resolvedPhoto)
    .filter(image => {
      const key = photoIdentity(image);
      if (!key || !image.url || image.isPlaceholder || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function refreshEditorImagePool() {
  if (!editorSession) return;
  editorSession.imagePool = allBookletPhotos();
}

function photoStatus(message = '', kind = '') {
  const { editorPhotoStatus } = getEditorControls();
  if (!editorPhotoStatus) return;
  editorPhotoStatus.textContent = message;
  editorPhotoStatus.dataset.kind = kind;
}

function storedPhoto(image = {}) {
  const { thumbnailUrl, ...serializable } = image;
  return { ...serializable, url: image.localBlobId ? '' : image.url };
}

function rememberPhoto(image) {
  if (!editorSession) return;
  const saved = storedPhoto(image);
  const key = photoIdentity(saved);
  if (!key) return;
  const index = editorSession.state.photoLibrary.findIndex(item => photoIdentity(item) === key);
  if (index >= 0) editorSession.state.photoLibrary[index] = saved;
  else editorSession.state.photoLibrary.unshift(saved);
  editorSession.state.photoLibrary = editorSession.state.photoLibrary.slice(0, 200);
}

function updatePagePhotos(images, message = '') {
  if (!editorSession) return;
  const pageIndex = editorSession.activePageIndex;
  const bucket = editorSession.state.pages[String(pageIndex)] || {};
  const slotCount = Math.min(20, images.length);
  const seen = new Set();
  const next = images.slice(0, 20).filter(image => {
    const key = photoIdentity(image);
    if (!key || image.isPlaceholder || seen.has(key)) return false;
    seen.add(key);
    return true;
  }).map(storedPhoto);
  bucket.images = next;
  bucket.imageCount = slotCount;
  editorSession.state.pages[String(pageIndex)] = bucket;
  editorSession.pageNodes[pageIndex]?.removeAttribute('data-editor-image-count');
  refreshEditorImagePool();
  applyEditorPage(editorSession.pageNodes[pageIndex], editorSession.pages[pageIndex], pageIndex);
  syncBookletEditorControls();
  renderPhotoManager();
  scheduleEditorSave();
  if (message) photoStatus(message, 'success');
}

function addPhotoToCurrentPage(image) {
  if (!editorSession) return;
  const current = pagePhotos();
  const key = photoIdentity(image);
  if (current.some(item => photoIdentity(item) === key)) {
    photoStatus('This photo is already on the current page.', 'notice');
    return;
  }
  if (current.length >= 20) {
    photoStatus('This page already has 20 photos.', 'error');
    return;
  }
  rememberPhoto(image);
  updatePagePhotos([...current, image], 'Photo added to this page.');
}

function photoThumbnail(image, label) {
  const figure = document.createElement('figure');
  const img = document.createElement('img');
  img.src = image.thumbnailUrl || image.url;
  img.alt = image.alt || label;
  img.loading = 'lazy';
  img.decoding = 'async';
  figure.append(img);
  return figure;
}

function renderCurrentPagePhotos(controls) {
  const photos = pagePhotos();
  controls.editorPhotoPageList?.replaceChildren(...photos.map((image, index) => {
    const card = document.createElement('article');
    card.className = 'editor-photo-page-card';
    card.append(photoThumbnail(image, `Photo ${index + 1}`));

    const meta = document.createElement('div');
    const title = document.createElement('strong');
    title.textContent = image.alt || `Photo ${index + 1}`;
    const source = document.createElement('small');
    source.textContent = image.source || 'Photo';
    meta.append(title, source);

    const actions = document.createElement('div');
    actions.className = 'editor-photo-card-actions';
    const moveBack = document.createElement('button');
    moveBack.type = 'button';
    moveBack.textContent = '←';
    moveBack.ariaLabel = 'Move photo earlier';
    moveBack.disabled = index === 0;
    moveBack.addEventListener('click', () => {
      const next = [...pagePhotos()];
      [next[index - 1], next[index]] = [next[index], next[index - 1]];
      updatePagePhotos(next);
    });
    const moveForward = document.createElement('button');
    moveForward.type = 'button';
    moveForward.textContent = '→';
    moveForward.ariaLabel = 'Move photo later';
    moveForward.disabled = index === photos.length - 1;
    moveForward.addEventListener('click', () => {
      const next = [...pagePhotos()];
      [next[index], next[index + 1]] = [next[index + 1], next[index]];
      updatePagePhotos(next);
    });
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.textContent = '×';
    remove.ariaLabel = 'Remove photo from this page';
    remove.addEventListener('click', () => updatePagePhotos(pagePhotos().filter((_, photoIndex) => photoIndex !== index), 'Photo removed from this page.'));
    actions.append(moveBack, moveForward, remove);
    card.append(meta, actions);
    return card;
  }));
  if (controls.editorPhotoPageCount) controls.editorPhotoPageCount.textContent = `${photos.length} / 20`;
  if (controls.editorPhotoPageEmpty) controls.editorPhotoPageEmpty.hidden = photos.length > 0;
}

function renderPhotoLibrary(controls) {
  const photos = allBookletPhotos();
  controls.editorPhotoLibrary?.replaceChildren(...photos.map(image => {
    const button = document.createElement('button');
    button.className = 'editor-photo-library-card';
    button.type = 'button';
    button.title = `Add ${image.alt || 'photo'} to this page`;
    button.append(photoThumbnail(image, image.alt || 'Booklet photo'));
    const caption = document.createElement('span');
    caption.textContent = image.source || 'Booklet';
    button.append(caption);
    button.addEventListener('click', () => addPhotoToCurrentPage(image));
    return button;
  }));
  if (controls.editorPhotoLibraryCount) controls.editorPhotoLibraryCount.textContent = String(photos.length);
}

function renderPhotoManager() {
  if (!editorSession) return;
  const controls = getEditorControls();
  if (controls.editorPhotoPageLabel) controls.editorPhotoPageLabel.textContent = `Page ${editorSession.activePageIndex + 1}`;
  renderCurrentPagePhotos(controls);
  renderPhotoLibrary(controls);
}

function renderPhotoSearchResults(results = []) {
  const controls = getEditorControls();
  controls.editorPhotoSearchResults?.replaceChildren(...results.map(image => {
    const button = document.createElement('button');
    button.className = 'editor-photo-search-card';
    button.type = 'button';
    button.append(photoThumbnail(image, image.alt || 'Search result'));
    const caption = document.createElement('span');
    const title = document.createElement('strong');
    title.textContent = image.alt || 'Untitled photo';
    const credit = document.createElement('small');
    credit.textContent = `${image.creator || 'Unknown creator'} · ${image.source}`;
    caption.append(title, credit);
    button.append(caption);
    button.addEventListener('click', () => addPhotoToCurrentPage(image));
    return button;
  }));
  if (controls.editorPhotoSearchEmpty) {
    controls.editorPhotoSearchEmpty.hidden = results.length > 0;
    if (!results.length) controls.editorPhotoSearchEmpty.textContent = 'No photos found. Try a broader search.';
  }
}

function setPhotoAddMode(mode) {
  const controls = getEditorControls();
  const showUrl = mode === 'url' && controls.editorPhotoUrlForm?.hidden;
  const showSearch = mode === 'search' && controls.editorPhotoSearchForm?.hidden;
  if (controls.editorPhotoUrlForm) controls.editorPhotoUrlForm.hidden = !showUrl;
  if (controls.editorPhotoSearchForm) controls.editorPhotoSearchForm.hidden = !showSearch;
  controls.editorPhotoUrlToggle?.setAttribute('aria-expanded', String(Boolean(showUrl)));
  controls.editorPhotoSearchToggle?.setAttribute('aria-expanded', String(Boolean(showSearch)));
  if (showUrl) requestAnimationFrame(() => controls.editorPhotoUrl?.focus());
  if (showSearch) requestAnimationFrame(() => controls.editorPhotoSearch?.focus());
}

function openPhotoManager() {
  const controls = getEditorControls();
  if (!editorSession || !controls.editorPhotoManager || !controls.bookletEditor) return;
  setEditorParameterMenu(false);
  controls.editorPhotoManager.hidden = false;
  controls.bookletEditor.classList.add('editor-photo-manager-open');
  photoStatus('');
  renderPhotoManager();
  requestAnimationFrame(() => controls.editorPhotoClose?.focus());
}

function closePhotoManager() {
  const controls = getEditorControls();
  editorPhotoSearchController?.abort();
  editorPhotoSearchController = null;
  if (controls.editorPhotoManager) controls.editorPhotoManager.hidden = true;
  controls.bookletEditor?.classList.remove('editor-photo-manager-open');
  setPhotoAddMode('');
}

async function hydrateLocalPhotos() {
  if (!editorSession) return;
  const localIds = new Set([
    ...editorSession.state.photoLibrary,
    ...Object.values(editorSession.state.pages).flatMap(page => Array.isArray(page?.images) ? page.images : [])
  ].map(image => image?.localBlobId).filter(Boolean));
  await Promise.all([...localIds].map(async id => {
    if (editorPhotoObjectUrls.has(id)) return;
    try {
      const record = await readLocalPhoto(id);
      if (record?.blob) editorPhotoObjectUrls.set(id, URL.createObjectURL(record.blob));
    } catch {
      // A missing device-local file should not prevent the rest of the editor loading.
    }
  }));
  if (!editorSession) return;
  refreshEditorImagePool();
  editorSession.pageNodes.forEach(node => node.removeAttribute('data-editor-image-count'));
  applyBookletEditorState();
  if (!getEditorControls().editorPhotoManager?.hidden) renderPhotoManager();
}

export function imagesForEditorCount(page, count, pool, pageIndex = 0) {
  if (count <= 0) return [];
  const selected = [];
  const seen = new Set();
  const assigned = editorSession?.state.pages[String(pageIndex)]?.images;
  const pageImages = Array.isArray(assigned) ? assigned.map(resolvedPhoto) : imagesForPage(page);
  [...pageImages, ...pool].forEach(image => {
    const key = photoIdentity(image);
    if (selected.length >= count || !image?.url || seen.has(key)) return;
    seen.add(key);
    selected.push(image);
  });
  if (!selected.length) selected.push(placeholderPhoto());
  const reusable = [...selected];
  while (selected.length < count) selected.push(reusable[selected.length % reusable.length]);
  return selected.slice(0, count);
}

export function renderEditorMedia(pageNode, page, count, pageIndex = 0) {
  pageNode.querySelectorAll(':scope > .page-image, :scope > .page-gallery, :scope > .page-art').forEach(node => node.remove());
  const images = imagesForEditorCount(page, count, editorSession.imagePool, pageIndex);
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
    layoutSystem: resolvedEditorSetting('layoutSystem', pageIndex),
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
    renderEditorMedia(pageNode, page, requestedImageCount, pageIndex);
    pageNode.dataset.editorImageCount = String(requestedImageCount);
  }

  replaceEditorLevelClass(pageNode, 'editor-visual-', safeClass(values.visualMode), hasEditorOverride('visualMode', pageIndex));
  replaceEditorLevelClass(pageNode, 'editor-complexity-', values.layoutComplexity, hasEditorOverride('layoutComplexity', pageIndex));
  replaceEditorLevelClass(pageNode, 'editor-font-', values.fontScale, hasEditorOverride('fontScale', pageIndex));
  replaceEditorLevelClass(pageNode, 'editor-spacing-', values.spacing, hasEditorOverride('spacing', pageIndex));
  replaceEditorLevelClass(pageNode, 'editor-effects-', values.effectLevel, hasEditorOverride('effectLevel', pageIndex));

  // Layout system override
  const layoutSystemValue = hasEditorOverride('layoutSystem', pageIndex) ? String(values.layoutSystem || 'auto') : 'auto';
  [...pageNode.classList]
    .filter(c => c.startsWith('editor-ls-'))
    .forEach(c => pageNode.classList.remove(c));
  if (layoutSystemValue && layoutSystemValue !== 'auto') {
    pageNode.classList.add(`editor-ls-${safeClass(layoutSystemValue)}`);
  }

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
  if (title) {
    title.hidden = !values.showTitle;
    title.textContent = String(page.title || '');
  }
  if (subtitle) {
    subtitle.hidden = !values.showSubtitle;
    subtitle.textContent = String(page.subtitle || (page.module || page.type || 'editorial').replaceAll('_', ' '));
  }
  if (caption) {
    caption.hidden = !values.showCaption;
    caption.textContent = String(page.caption || '');
  }
  if (pageNumber) pageNumber.hidden = !values.showPageNumber;
  if (source) {
    source.hidden = !values.showSource;
    if (page.source?.title) {
      source.textContent = `Source suggestion: ${page.source.title} ↗`;
      if (page.source.url) source.href = safeUrl(page.source.url);
    }
  }
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
  if (!editorSession || !bookletEditor || !dialog || bookletEditor.hidden) return false;
  // Always active in compact (mobile bottom-bar) mode.
  if (editorCompactMode) return true;
  // Also active on desktop (>900px) whenever the full editor sidebar is open,
  // so the zoom panel is always accessible without switching to compact mode.
  return window.matchMedia('(min-width: 901px)').matches;
}

function compactZoomLabel(level = editorCompactPageZoom) {
  return {
    1: '1 page',
    2: '2 pages',
    3: '4-page grid',
    4: '6-column grid'
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

  const twoPageScale = Math.min(1, Math.max(.12, (spreadsList.clientWidth - 72) / 2 / baseWidth));
  if (level === 2) return twoPageScale;

  const gap = 10;
  const availableWidth = Math.max(1, spreadsList.clientWidth - 28);
  const availableHeight = Math.max(1, spreadsList.clientHeight - 28);
  const pageCount = Math.max(1, editorSession?.pageNodes.length || 1);

  // Level 3 (2 columns / 4-page grid): ensure 2 rows fit in visible stage
  const col3 = Math.min(2, pageCount);
  const rows3 = Math.ceil(pageCount / col3);
  const widthScale3 = (availableWidth - gap * (col3 - 1)) / col3 / baseWidth;
  const previewRows3 = Math.min(2, rows3);
  const previewHeight3 = Math.max(1, availableHeight - 64 - gap * (previewRows3 - 1));
  const fourPageScale = previewHeight3 / previewRows3 / baseHeight;
  const scale3 = Math.min(widthScale3, twoPageScale * .94, fourPageScale);
  if (level === 3) return Math.min(1, Math.max(.08, scale3));

  // Level 4 (6-column grid / overview): 6 columns fitted into available width and height
  const col4 = Math.min(6, pageCount);
  const rows4 = Math.ceil(pageCount / col4);
  const widthScale4 = (availableWidth - gap * (col4 - 1)) / col4 / baseWidth;
  const heightScale4 = (availableHeight - gap * (rows4 - 1)) / rows4 / baseHeight;
  const scale4 = Math.min(widthScale4, heightScale4, scale3 * .78);
  return Math.min(1, Math.max(.06, scale4));
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

  const previousRects = animate && isCompactPageStageActive()
    ? new Map((editorSession?.pageNodes || []).map(page => [page, page.getBoundingClientRect()]))
    : null;
  if (animate) {
    editorCompactScrollSelectionLockedUntil = performance.now() + 900;
    if (controls.spreadsList) {
      controls.spreadsList.style.scrollSnapType = 'none';
      clearTimeout(editorCompactSnapUnlockTimer);
      editorCompactSnapUnlockTimer = setTimeout(() => {
        if (controls.spreadsList) controls.spreadsList.style.scrollSnapType = '';
      }, 600);
    }
  }

  editorCompactPageZoom = next;
  controls.dialog?.setAttribute('data-compact-page-zoom', String(next));
  editorCompactPageScale = compactZoomScale(next, controls);
  controls.dialog?.style.setProperty('--compact-page-scale', editorCompactPageScale.toFixed(4));
  if (controls.editorPageZoomRange) controls.editorPageZoomRange.value = String(next);
  if (controls.editorPageZoomBadge) controls.editorPageZoomBadge.textContent = `${next}×`;
  if (controls.editorPageZoomOutput) controls.editorPageZoomOutput.textContent = compactZoomLabel(next);

  requestAnimationFrame(() => {
    if (isModeSwitch) {
      // Start the FLIP animation immediately in the first RAF while the new
      // layout is being painted. The scroll must wait one more frame because
      // the flex layout (wrap→nowrap or vice-versa) may not be fully
      // recalculated yet — reading getBoundingClientRect() too early gives
      // wrong positions (e.g. last page appears as page 2).
      animateCompactZoomTransition(previousRects, prev, next);
      requestAnimationFrame(() => scrollCompactPageIntoView('auto'));
    } else {
      // Centre against the NEW page geometry before FLIP reads its destination.
      // Doing this in the same frame prevents 2→1 from first centring a small
      // Zoom 2 page and then visibly correcting to the large Zoom 1 position.
      scrollCompactPageIntoView(animate ? 'instant' : 'auto');
      animateCompactPageLayout(previousRects);
    }
  });
}

function syncCompactPageStage(animate = false) {
  const { dialog, editorPageZoom, bookletEditor } = getEditorControls();
  const active = isCompactPageStageActive();
  if (editorPageZoom) editorPageZoom.hidden = !active;
  // editor-compact-open drives all the page-stage CSS layout.
  // Centralise class management here so both compact mode and desktop full
  // mode go through the same path.
  dialog?.classList.toggle('editor-compact-open', active);
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
  if (parameter.key === 'imageCount') {
    const count = Number(control.value) || 0;
    return `${count} photo${count === 1 ? '' : 's'} · Page ${(editorSession?.activePageIndex || 0) + 1}`;
  }
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
    const icon = document.createElement('span');
    const label = document.createElement('strong');
    const value = document.createElement('span');
    const arrow = document.createElement('i');

    button.type = 'button';
    button.dataset.editorParameterKey = parameter.key;
    button.classList.toggle('is-active', index === editorParameterIndex);
    icon.className = 'editor-parameter-icon';
    icon.innerHTML = PARAM_ICONS[parameter.key] || '';
    icon.setAttribute('aria-hidden', 'true');
    label.textContent = parameter.label;
    value.textContent = editorParameterValueText(parameter);
    arrow.textContent = '→';
    arrow.setAttribute('aria-hidden', 'true');
    button.append(icon, label, value, arrow);
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

  const canShowMenu = editorCompactMode;
  editorParameterMenuOpen = Boolean(open && canShowMenu);
  bookletEditor.classList.toggle('editor-parameter-menu-open', editorParameterMenuOpen);
  editorParameterMenu?.setAttribute('aria-hidden', String(!editorParameterMenuOpen));
  editorParameterMenuToggle?.setAttribute('aria-expanded', String(editorParameterMenuOpen));
}

export function updateEditorCompactParameter(renderMenu = true) {
  const { bookletEditor, editorParameterIcon, editorParameterLabel, editorParameterValue, bookletEditorMode } = getEditorControls();
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

  if (editorParameterIcon) editorParameterIcon.innerHTML = PARAM_ICONS[active.key] || '';
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
  // editor-compact-open is now managed by syncCompactPageStage() which is
  // called below — do NOT toggle it here to avoid a race condition.
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
  const activePagePhotoCount = pagePhotos(index).length;
  if (controls.editorImageCount) controls.editorImageCount.value = String(activePagePhotoCount);
  if (controls.editorPhotoControlPage) controls.editorPhotoControlPage.textContent = `Page ${index + 1}`;
  if (controls.editorPhotoLayout) {
    controls.editorPhotoLayout.value = get('photoLayout') || 'auto';
    syncEditorSliderSelect(controls.editorPhotoLayout);
  }
  if (controls.editorPhotoLayoutVariant) controls.editorPhotoLayoutVariant.value = get('photoLayoutVariant') ?? 0;
  if (controls.editorPhotoLayoutVariantOutput && controls.editorPhotoLayoutVariant) {
    controls.editorPhotoLayoutVariantOutput.value = controls.editorPhotoLayoutVariant.value;
  }
  if (controls.editorLayoutSystem) {
    controls.editorLayoutSystem.value = get('layoutSystem') || 'auto';
    syncEditorSliderSelect(controls.editorLayoutSystem);
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
  if (controls.editorImageOutput) controls.editorImageOutput.value = String(activePagePhotoCount);
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
  const pageOnly = new Set(['imageCount', 'photoLayout', 'photoLayoutVariant']);
  let bucket;
  if (key === 'profile') {
    bucket = editorSession.state.booklet;
  } else if (pageOnly.has(key)) {
    const pageKey = String(editorSession.activePageIndex);
    if (!editorSession.state.pages[pageKey]) editorSession.state.pages[pageKey] = {};
    bucket = editorSession.state.pages[pageKey];
  } else {
    bucket = activeEditorBucket();
  }
  if (bucket) bucket[key] = value;
  applyBookletEditorState();
  syncBookletEditorControls();
  scheduleEditorSave();
}

export function editorGenerationSettings() {
  if (!editorSession) return null;

  const pageIndex = editorSession.activePageIndex || 0;
  const value = key => resolvedEditorSetting(key, pageIndex);
  const fonts = ['titleFont', 'subtitleFont', 'bodyFont']
    .map(key => String(value(key) || '').trim())
    .filter((family, index, items) => family && items.indexOf(family) === index);
  const direction = [
    `photo layout ${value('photoLayout') || 'auto'}`,
    `layout intensity ${value('photoLayoutVariant') ?? 0}`,
    `page system ${value('layoutSystem') || 'auto'}`,
    `content ${value('contentPosition') || 'auto'}`,
    `font scale ${value('fontScale') || 3}`,
    `spacing ${value('spacing') || 3}`
  ].join('; ');

  return {
    style: String(value('profile') || 'auto'),
    visualMode: String(value('visualMode') || 'auto'),
    layoutComplexity: String(value('layoutComplexity') || 2),
    effectLevel: String(value('effectLevel') ?? 2),
    customFonts: fonts.join(', '),
    customStyle: `Live editor direction: ${direction}`.slice(0, 180)
  };
}

function syncResponsiveEditorMode(persist = false) {
  const isSmallScreen = window.matchMedia('(max-width: 900px)').matches;
  setEditorCompactMode(isSmallScreen, persist);
}

export function openBookletEditor() {
  const { bookletEditor, dialog } = getEditorControls();
  if (!editorSession || !bookletEditor || !dialog) return;

  bookletEditor.hidden = false;
  dialog.classList.add('editor-is-open');
  syncResponsiveEditorMode(false);
  updateEditorSelection();
  syncBookletEditorControls();
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

let editorActiveTextSession = null;

export function openTextEditor(fieldKey, pageIndex, targetElement) {
  const controls = getEditorControls();
  if (!editorSession || !controls.editorTextMode) return;

  const page = editorSession.pages[pageIndex];
  if (!page) return;

  let currentText = '';
  let currentUrl = '';
  let fieldTitle = 'Edit text';

  if (fieldKey === 'title') {
    fieldTitle = 'Edit Title';
    currentText = String(page.title || '');
  } else if (fieldKey === 'subtitle') {
    fieldTitle = 'Edit Subtitle';
    currentText = String(page.subtitle || (page.module || page.type || 'editorial').replaceAll('_', ' '));
  } else if (fieldKey === 'body') {
    fieldTitle = 'Edit Body Text';
    currentText = String(page.body || '');
  } else if (fieldKey === 'caption') {
    fieldTitle = 'Edit Caption';
    currentText = String(page.caption || '');
  } else if (fieldKey === 'source') {
    fieldTitle = 'Edit Source Link';
    currentText = String(page.source?.title || '');
    currentUrl = String(page.source?.url || '');
  }

  if (editorActiveTextSession?.targetElement) {
    editorActiveTextSession.targetElement.classList.remove('is-editing-text');
  }

  editorActiveTextSession = {
    fieldKey,
    pageIndex,
    originalText: currentText,
    originalUrl: currentUrl,
    targetElement
  };

  if (targetElement) {
    targetElement.classList.add('is-editing-text');
  }

  if (controls.editorTextFieldEyebrow) {
    controls.editorTextFieldEyebrow.textContent = `Page ${pageIndex + 1}`;
  }
  if (controls.editorTextFieldTitle) {
    controls.editorTextFieldTitle.textContent = fieldTitle;
  }

  if (controls.editorTextTextarea) {
    controls.editorTextTextarea.value = currentText;
  }

  if (controls.editorTextUrlGroup && controls.editorTextUrlInput) {
    const isSource = fieldKey === 'source';
    controls.editorTextUrlGroup.hidden = !isSource;
    if (isSource) controls.editorTextUrlInput.value = currentUrl;
  }

  controls.bookletEditor?.classList.add('editor-text-editing-active');
  controls.editorTextMode.hidden = false;

  requestAnimationFrame(() => {
    controls.editorTextTextarea?.focus();
    controls.editorTextTextarea?.select();
  });
}

export function closeTextEditor(save = false) {
  const controls = getEditorControls();
  if (editorActiveTextSession?.targetElement) {
    editorActiveTextSession.targetElement.classList.remove('is-editing-text');
  }

  if (!editorActiveTextSession) {
    controls.bookletEditor?.classList.remove('editor-text-editing-active');
    if (controls.editorTextMode) controls.editorTextMode.hidden = true;
    return;
  }

  const { fieldKey, pageIndex, originalText, originalUrl } = editorActiveTextSession;
  const page = editorSession?.pages[pageIndex];
  const pageNode = editorSession?.pageNodes[pageIndex];

  if (!save && page && pageNode) {
    // Revert edits on cancel
    if (fieldKey === 'title') page.title = originalText;
    else if (fieldKey === 'subtitle') page.subtitle = originalText;
    else if (fieldKey === 'body') page.body = originalText;
    else if (fieldKey === 'caption') page.caption = originalText;
    else if (fieldKey === 'source') {
      if (!page.source) page.source = {};
      page.source.title = originalText;
      page.source.url = originalUrl;
    }
    applyEditorPage(pageNode, page, pageIndex);
  } else if (save && page) {
    // Persist edits to state and localStorage
    if (!editorSession.state.pages[String(pageIndex)]) {
      editorSession.state.pages[String(pageIndex)] = {};
    }
    const pageOverrides = editorSession.state.pages[String(pageIndex)];
    if (fieldKey === 'title') pageOverrides.title = page.title;
    else if (fieldKey === 'subtitle') pageOverrides.subtitle = page.subtitle;
    else if (fieldKey === 'body') pageOverrides.body = page.body;
    else if (fieldKey === 'caption') pageOverrides.caption = page.caption;
    else if (fieldKey === 'source') pageOverrides.source = page.source;
    saveEditorState();
  }

  controls.bookletEditor?.classList.remove('editor-text-editing-active');
  if (controls.editorTextMode) controls.editorTextMode.hidden = true;
  editorActiveTextSession = null;
}

function handleTextEditorInput() {
  if (!editorActiveTextSession || !editorSession) return;
  const controls = getEditorControls();
  const { fieldKey, pageIndex } = editorActiveTextSession;
  const page = editorSession.pages[pageIndex];
  const pageNode = editorSession.pageNodes[pageIndex];
  if (!page || !pageNode) return;

  const newText = controls.editorTextTextarea?.value || '';

  if (fieldKey === 'title') {
    page.title = newText;
  } else if (fieldKey === 'subtitle') {
    page.subtitle = newText;
  } else if (fieldKey === 'body') {
    page.body = newText;
  } else if (fieldKey === 'caption') {
    page.caption = newText;
  } else if (fieldKey === 'source') {
    if (!page.source) page.source = {};
    page.source.title = newText;
    if (controls.editorTextUrlInput) {
      page.source.url = controls.editorTextUrlInput.value || '';
    }
  }

  applyEditorPage(pageNode, page, pageIndex);
}

export function closeBookletEditor() {
  const { bookletEditor, dialog } = getEditorControls();
  if (!bookletEditor || !dialog) return;

  closePhotoManager();
  closeTextEditor(false);
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

  editorPhotoObjectUrls.forEach(url => URL.revokeObjectURL(url));
  editorPhotoObjectUrls.clear();
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
  if (controls.editorLayoutSystem) {
    bindStyleSlider(controls.editorLayoutSystem);
  }
  if (controls.editorContentPosition) {
    bindStyleSlider(controls.editorContentPosition);
  }
  populateEditorFontControl();

  const selectPage = (index, scrollIntoView = true) => {
    if (controls.bookletEditor?.hidden) return;
    const pageChanged = editorSession.activePageIndex !== index;
    editorSession.activePageIndex = index;
    editorSession.activeSpreadIndex = Math.floor(index / 2);
    if (pageChanged) {
      updateEditorSelection();
      syncBookletEditorControls();
      if (!controls.editorPhotoManager?.hidden) renderPhotoManager();
    }
    if (scrollIntoView && isCompactPageStageActive() && editorCompactPageZoom <= 2) {
      scrollCompactPageIntoView('smooth');
    }
  };

  editorSession.pageNodes.forEach((node, index) => {
    node.dataset.pageIndex = String(index);
    node.addEventListener('click', event => {
      const wasAlreadyActive = editorSession.activePageIndex === index;
      const textTarget = event.target.closest('h4, .book-page-type, .page-body, .page-caption, .page-source');

      if (editorActiveTextSession) {
        event.preventDefault();
        event.stopPropagation();
        closeTextEditor(false);
        return;
      }

      if (textTarget && wasAlreadyActive) {
        event.preventDefault();
        event.stopPropagation();
        let fieldKey = 'body';
        if (textTarget.tagName === 'H4') fieldKey = 'title';
        else if (textTarget.classList.contains('book-page-type')) fieldKey = 'subtitle';
        else if (textTarget.classList.contains('page-caption')) fieldKey = 'caption';
        else if (textTarget.classList.contains('page-source')) fieldKey = 'source';
        openTextEditor(fieldKey, index, textTarget);
        return;
      }

      if (event.target.closest('a')) event.preventDefault();
      if (isCompactPageStageActive() && editorCompactPageZoom >= 2) {
        event.preventDefault();
      }
      selectPage(index);
    });
    node.addEventListener('dblclick', event => {
      if (event.target.closest('a')) return;
      event.preventDefault();
      selectPage(index);
      if (isCompactPageStageActive() && editorCompactPageZoom > 2) {
        zoomIntoCompactPage(index);
      }
    });
    node.addEventListener('pointerup', event => {
      if (event.pointerType === 'mouse') return;
      if (!isCompactPageStageActive() || editorCompactPageZoom < 2) return;

      event.preventDefault();

      const wasAlreadyActive = editorSession.activePageIndex === index;
      const textTarget = event.target.closest('h4, .book-page-type, .page-body, .page-caption, .page-source');

      if (editorActiveTextSession) {
        closeTextEditor(false);
        return;
      }

      if (textTarget && wasAlreadyActive) {
        let fieldKey = 'body';
        if (textTarget.tagName === 'H4') fieldKey = 'title';
        else if (textTarget.classList.contains('book-page-type')) fieldKey = 'subtitle';
        else if (textTarget.classList.contains('page-caption')) fieldKey = 'caption';
        else if (textTarget.classList.contains('page-source')) fieldKey = 'source';
        openTextEditor(fieldKey, index, textTarget);
        return;
      }

      const now = performance.now();
      const isDoubleTap = editorCompactLastTapPage === index && now - editorCompactLastTapTime < 360;
      editorCompactLastTapPage = isDoubleTap ? -1 : index;
      editorCompactLastTapTime = isDoubleTap ? 0 : now;

      selectPage(index);

      // Only double-tap at zoom > 2 zooms into Level 1
      if (isDoubleTap && editorCompactPageZoom > 2) {
        zoomIntoCompactPage(index);
      }
    });
  });
  editorSession.spreadNodes.forEach((node, index) => {
    node.dataset.spreadIndex = String(index);
  });
  controls.spreadsList?.addEventListener('scroll', queueCompactScrollSelection, { passive: true });
  controls.dialogContent?.addEventListener('click', event => {
    if (!editorActiveTextSession) return;
    const textTarget = event.target.closest('h4, .book-page-type, .page-body, .page-caption, .page-source');
    const textModeArea = event.target.closest('#editor-text-mode');
    if (!textTarget && !textModeArea) {
      closeTextEditor(false);
    }
  });

  closeBookletEditor();
  applyBookletEditorState();
  syncBookletEditorControls();
  hydrateLocalPhotos();
}

export function setupEditorEventListeners() {
  const controls = getEditorControls();

  controls.editorManagePhotos?.addEventListener('click', openPhotoManager);
  controls.editorPhotoClose?.addEventListener('click', closePhotoManager);
  controls.editorPhotoUploadButton?.addEventListener('click', () => controls.editorPhotoFile?.click());
  controls.editorPhotoUrlToggle?.addEventListener('click', () => setPhotoAddMode('url'));
  controls.editorPhotoSearchToggle?.addEventListener('click', () => setPhotoAddMode('search'));
  controls.editorPhotoFile?.addEventListener('change', async () => {
    const files = [...(controls.editorPhotoFile.files || [])].slice(0, 20);
    if (!files.length) return;
    photoStatus(`Preparing ${files.length} photo${files.length === 1 ? '' : 's'}…`);
    let added = 0;
    for (const file of files) {
      if (pagePhotos().length >= 20) break;
      try {
        const { record, image } = await prepareLocalPhoto(file);
        await storeLocalPhoto(record);
        editorPhotoObjectUrls.set(record.id, URL.createObjectURL(record.blob));
        addPhotoToCurrentPage(image);
        added += 1;
      } catch (error) {
        photoStatus(error.message || 'Could not add this photo.', 'error');
      }
    }
    controls.editorPhotoFile.value = '';
    if (added) photoStatus(`${added} photo${added === 1 ? '' : 's'} added to this page.`, 'success');
  });
  controls.editorPhotoUrlForm?.addEventListener('submit', async event => {
    event.preventDefault();
    try {
      const url = validateRemotePhotoUrl(controls.editorPhotoUrl?.value);
      photoStatus('Checking the image…');
      await testRemotePhoto(url);
      addPhotoToCurrentPage({
        id: `url-${crypto.randomUUID?.() || Date.now()}`,
        url,
        alt: 'Image added by URL',
        creator: 'External source',
        source: new URL(url).hostname,
        sourceUrl: url,
        license: 'Check source licence',
        licenseUrl: url
      });
      controls.editorPhotoUrl.value = '';
      setPhotoAddMode('');
    } catch (error) {
      photoStatus(error.message || 'Could not add this URL.', 'error');
    }
  });
  controls.editorPhotoSearchForm?.addEventListener('submit', async event => {
    event.preventDefault();
    editorPhotoSearchController?.abort();
    editorPhotoSearchController = new AbortController();
    photoStatus('Searching Openverse and Wikimedia…');
    if (controls.editorPhotoSearchEmpty) {
      controls.editorPhotoSearchEmpty.hidden = false;
      controls.editorPhotoSearchEmpty.textContent = 'Searching…';
    }
    controls.editorPhotoSearchResults?.replaceChildren();
    try {
      const results = await searchPhotoProviders(
        controls.editorPhotoSearch?.value,
        controls.editorPhotoProvider?.value || 'all',
        editorPhotoSearchController.signal
      );
      renderPhotoSearchResults(results);
      photoStatus(`${results.length} photos found. Select one to add it.`, results.length ? 'success' : 'notice');
    } catch (error) {
      if (error.name !== 'AbortError') {
        renderPhotoSearchResults([]);
        photoStatus(error.message || 'Photo search failed.', 'error');
      }
    } finally {
      editorPhotoSearchController = null;
    }
  });

  [
    [controls.editorProfile, 'profile', value => value],
    [controls.editorVisualMode, 'visualMode', value => value],
    [controls.editorLayoutComplexity, 'layoutComplexity', Number],
    [controls.editorImageCount, 'imageCount', Number],
    [controls.editorPhotoLayout, 'photoLayout', value => value],
    [controls.editorPhotoLayoutVariant, 'photoLayoutVariant', Number],
    [controls.editorLayoutSystem, 'layoutSystem', value => value],
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
  controls.editorTextBackBtn?.addEventListener('click', () => closeTextEditor(false));
  controls.editorTextCancelBtn?.addEventListener('click', () => closeTextEditor(false));
  controls.editorTextSaveBtn?.addEventListener('click', () => closeTextEditor(true));
  controls.editorTextTextarea?.addEventListener('input', handleTextEditorInput);
  controls.editorTextUrlInput?.addEventListener('input', handleTextEditorInput);
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
    if (!editorCompactMode) return;
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
    if (event.key !== 'Escape') return;
    if (!controls.editorPhotoManager?.hidden) {
      event.stopPropagation();
      closePhotoManager();
      return;
    }
    if (editorActiveTextSession) {
      event.stopPropagation();
      closeTextEditor(false);
      return;
    }
    if (editorParameterMenuOpen) {
      event.stopPropagation();
      setEditorParameterMenu(false);
    }
  });
  window.matchMedia('(max-width: 900px)').addEventListener('change', () => {
    const { bookletEditor } = getEditorControls();
    if (bookletEditor && !bookletEditor.hidden) {
      syncResponsiveEditorMode(false);
    }
  });
  window.addEventListener('resize', queueCompactPageStageResize, { passive: true });
  controls.dialogEdit?.addEventListener('click', openBookletEditor);

  controls.editorResetScope?.addEventListener('click', () => {
    if (!editorSession || !controls.editorScope) return;
    if (controls.editorScope.value === 'booklet') editorSession.state.booklet = {};
    else if (controls.editorScope.value === 'spread') delete editorSession.state.spreads[String(editorSession.activeSpreadIndex)];
    else delete editorSession.state.pages[String(editorSession.activePageIndex)];
    editorSession.pageNodes.forEach(node => node.removeAttribute('data-editor-image-count'));
    refreshEditorImagePool();
    applyBookletEditorState();
    syncBookletEditorControls();
    if (!controls.editorPhotoManager?.hidden) renderPhotoManager();
    scheduleEditorSave();
  });

  controls.editorResetAll?.addEventListener('click', () => {
    if (!editorSession) return;
    editorSession.state = emptyEditorState();
    localStorage.removeItem(editorStorageKey(editorSession.item));
    editorSession.pageNodes.forEach(node => node.removeAttribute('data-editor-image-count'));
    refreshEditorImagePool();
    applyBookletEditorState();
    syncBookletEditorControls();
    if (!controls.editorPhotoManager?.hidden) renderPhotoManager();
    if (controls.editorSaveStatus) controls.editorSaveStatus.textContent = 'All local adjustments were reset.';
  });
}
