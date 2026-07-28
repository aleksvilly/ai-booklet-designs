import { EDITOR_STORAGE_PREFIX, EDITOR_COMPACT_STORAGE_KEY } from './config.js';
import { safeUrl, safeClass } from './utils.js';
import { pagesFor, imagesForPage } from './collection.js';
import { mediaMarkup, loadDialogImages } from './detail-modal.js';
import { bindStyleSlider } from './catalog.js';

let editorSession = null;
let editorSaveTimer = null;
let editorParameterIndex = 0;
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
    editorParameterPrevious: document.querySelector('#editor-parameter-previous'),
    editorParameterNext: document.querySelector('#editor-parameter-next'),
    editorParameterLabel: document.querySelector('#editor-parameter-label'),
    editorParameterValue: document.querySelector('#editor-parameter-value'),
    editorScope: document.querySelector('#editor-scope'),
    editorTargetLabel: document.querySelector('#editor-target-label'),
    editorProfile: document.querySelector('#editor-profile'),
    editorVisualMode: document.querySelector('#editor-visual-mode'),
    editorLayoutComplexity: document.querySelector('#editor-layout-complexity'),
    editorImageCount: document.querySelector('#editor-image-count'),
    editorTextAmount: document.querySelector('#editor-text-amount'),
    editorContentPosition: document.querySelector('#editor-content-position'),
    editorFontScale: document.querySelector('#editor-font-scale'),
    editorSpacing: document.querySelector('#editor-spacing'),
    editorEffectLevel: document.querySelector('#editor-effect-level'),
    editorShowTitle: document.querySelector('#editor-show-title'),
    editorShowSubtitle: document.querySelector('#editor-show-subtitle'),
    editorShowBody: document.querySelector('#editor-show-body'),
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

export function availableEditorParameters() {
  const {
    editorScope, editorProfile, editorVisualMode, editorLayoutComplexity,
    editorImageCount, editorTextAmount, editorContentPosition, editorFontScale,
    editorSpacing, editorEffectLevel, editorShowTitle, editorShowSubtitle, editorShowBody,
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
    { key: 'spacing', label: 'Page spacing', control: editorSpacing },
    { key: 'effectLevel', label: 'Effects intensity', control: editorEffectLevel },
    { key: 'showTitle', label: 'Show title', control: editorShowTitle },
    { key: 'showSubtitle', label: 'Show subtitle / caption', control: editorShowSubtitle },
    { key: 'showBody', label: 'Show main text', control: editorShowBody }
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
    spacing: 3,
    effectLevel: Math.max(0, Math.min(5, Number(dna.effectLevel ?? 2))),
    showTitle: Boolean(page.title),
    showSubtitle: Boolean(page.caption || page.module || page.type),
    showBody: Boolean(page.body)
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
    spacing: resolvedEditorSetting('spacing', pageIndex),
    effectLevel: resolvedEditorSetting('effectLevel', pageIndex),
    showTitle: resolvedEditorSetting('showTitle', pageIndex),
    showSubtitle: resolvedEditorSetting('showSubtitle', pageIndex),
    showBody: resolvedEditorSetting('showBody', pageIndex)
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

    if (photoLayoutValue === 'collage') {
      const collageItems = [...pageNode.querySelectorAll('.page-gallery .gallery-image')];
      const lastCollageIndex = Math.max(1, collageItems.length - 1);
      const scatterStrength = 0.55 + absPct / 100 * 0.65;
      const direction = rawPct < 0 ? -1 : 1;
      const firstSize = Math.min(88, 58 + collageItems.length * 1.5);
      const lastSize = Math.max(18, 34 - collageItems.length * 0.35);

      collageItems.forEach((item, index) => {
        const progress = index / lastCollageIndex;
        const angle = direction * index * 137.508 * Math.PI / 180;
        const radius = index === 0 ? 0 : (10 + 32 * Math.sqrt(progress)) * scatterStrength;
        const x = Math.max(8, Math.min(92, 50 + Math.cos(angle) * radius));
        const y = Math.max(8, Math.min(92, 50 + Math.sin(angle) * radius * 0.82));
        const size = firstSize - (firstSize - lastSize) * progress;
        const rotation = Math.sin(angle * 0.73) * (4 + absPct * 0.16);
        const aspect = [1.28, 0.82, 1, 1.48, 0.72][index % 5];

        item.style.setProperty('--layout-collage-size', `${size.toFixed(2)}%`);
        item.style.setProperty('--layout-collage-x', `${x.toFixed(2)}%`);
        item.style.setProperty('--layout-collage-y', `${y.toFixed(2)}%`);
        item.style.setProperty('--layout-collage-rotation', `${rotation.toFixed(2)}deg`);
        item.style.setProperty('--layout-collage-aspect', aspect.toFixed(2));
        item.style.setProperty('--layout-collage-z', String(index + 1));
      });
    }

    // Direction-based helper classes
    pageNode.classList.toggle('photo-layout-reversed', rawPct < 0);
    // Masonry tiers based on intensity
    pageNode.classList.toggle('photo-layout-span-first', absPct >= 30);
    pageNode.classList.toggle('photo-layout-wide', absPct >= 60);
  } else {
    // Reset all layout custom properties
    [
      '--layout-gap', '--layout-ratio', '--layout-ratio-b',
      '--layout-split-inset', '--layout-split-extent', '--layout-split-offset',
      '--layout-diag-extent', '--layout-diag-offset', '--layout-diag-clip',
      '--layout-tilt', '--layout-overlay-opacity', '--layout-circle-size',
      '--layout-shape-single-size'
    ].forEach(prop => pageNode.style.removeProperty(prop));
    pageNode.classList.remove('photo-layout-reversed', 'photo-layout-span-first', 'photo-layout-wide');
  }

  if (hasEditorOverride('contentPosition', pageIndex)) pageNode.dataset.editorContentPosition = values.contentPosition;
  else delete pageNode.dataset.editorContentPosition;

  const title = pageNode.querySelector('.book-page-copy h4');
  const subtitle = pageNode.querySelector('.book-page-type');
  const caption = pageNode.querySelector('.page-caption');
  const body = pageNode.querySelector('.page-body');
  if (title) title.hidden = !values.showTitle;
  if (subtitle) subtitle.hidden = !values.showSubtitle;
  if (caption) caption.hidden = !values.showSubtitle;
  if (body) {
    body.hidden = !values.showBody;
    body.textContent = hasEditorOverride('textAmount', pageIndex)
      ? editorSession.textVariants[pageIndex][Math.max(1, Math.min(5, values.textAmount)) - 1]
      : String(page.body || '');
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

export function editorParameterValueText(parameter) {
  const control = parameter.control;
  if (!control) return '';
  if (control.type === 'checkbox') return control.checked ? 'On' : 'Off';
  if (control.tagName === 'SELECT') return control.selectedOptions[0]?.textContent?.trim() || control.value;
  if (control.type === 'range') return `${control.value} / ${control.max}`;
  return control.value;
}

export function updateEditorCompactParameter() {
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
}

export function setEditorCompactMode(compact, persist = true) {
  const { bookletEditor, dialog } = getEditorControls();
  if (!bookletEditor || !dialog) return;

  editorCompactMode = Boolean(compact);
  bookletEditor.classList.toggle('editor-compact', editorCompactMode);
  dialog.classList.toggle('editor-compact-open', editorCompactMode && !bookletEditor.hidden);
  if (persist) localStorage.setItem(EDITOR_COMPACT_STORAGE_KEY, String(editorCompactMode));
  updateEditorCompactParameter();
}

export function moveEditorParameter(direction) {
  const available = availableEditorParameters();
  if (!available.length) return;
  editorParameterIndex = (editorParameterIndex + direction + available.length) % available.length;
  updateEditorCompactParameter();
}

export function syncBookletEditorControls() {
  if (!editorSession) return;
  const controls = getEditorControls();
  const index = editorSession.activePageIndex;
  const values = editorSession.originalSettings[index];
  const get = key => resolvedEditorSetting(key, index) ?? values[key];

  if (controls.editorProfile) controls.editorProfile.value = get('profile');
  if (controls.editorVisualMode) controls.editorVisualMode.value = get('visualMode');
  if (controls.editorLayoutComplexity) controls.editorLayoutComplexity.value = get('layoutComplexity');
  if (controls.editorImageCount) controls.editorImageCount.value = get('imageCount');
  if (controls.editorPhotoLayout) controls.editorPhotoLayout.value = get('photoLayout') || 'auto';
  if (controls.editorPhotoLayoutVariant) controls.editorPhotoLayoutVariant.value = get('photoLayoutVariant') ?? 0;
  if (controls.editorPhotoLayoutVariantOutput && controls.editorPhotoLayoutVariant) {
    controls.editorPhotoLayoutVariantOutput.value = controls.editorPhotoLayoutVariant.value;
  }
  if (controls.editorContentPosition) controls.editorContentPosition.value = get('contentPosition');
  if (controls.editorTextAmount) controls.editorTextAmount.value = get('textAmount');
  if (controls.editorFontScale) controls.editorFontScale.value = get('fontScale');
  if (controls.editorSpacing) controls.editorSpacing.value = get('spacing');
  if (controls.editorEffectLevel) controls.editorEffectLevel.value = get('effectLevel');
  if (controls.editorShowTitle) controls.editorShowTitle.checked = Boolean(get('showTitle'));
  if (controls.editorShowSubtitle) controls.editorShowSubtitle.checked = Boolean(get('showSubtitle'));
  if (controls.editorShowBody) controls.editorShowBody.checked = Boolean(get('showBody'));

  if (controls.editorLayoutOutput && controls.editorLayoutComplexity) controls.editorLayoutOutput.value = controls.editorLayoutComplexity.value;
  if (controls.editorImageOutput && controls.editorImageCount) controls.editorImageOutput.value = controls.editorImageCount.value;
  if (controls.editorPhotoLayoutVariantOutput && controls.editorPhotoLayoutVariant) controls.editorPhotoLayoutVariantOutput.value = controls.editorPhotoLayoutVariant.value;
  if (controls.editorTextOutput && controls.editorTextAmount) controls.editorTextOutput.value = controls.editorTextAmount.value;
  if (controls.editorFontOutput && controls.editorFontScale) controls.editorFontOutput.value = controls.editorFontScale.value;
  if (controls.editorSpacingOutput && controls.editorSpacing) controls.editorSpacingOutput.value = controls.editorSpacing.value;
  if (controls.editorEffectOutput && controls.editorEffectLevel) controls.editorEffectOutput.value = controls.editorEffectLevel.value;

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
}

export function closeBookletEditor() {
  const { bookletEditor, dialog } = getEditorControls();
  if (!bookletEditor || !dialog) return;

  bookletEditor.hidden = true;
  dialog.classList.remove('editor-is-open');
  dialog.classList.remove('editor-compact-open');
  updateEditorSelection();
}

export function initializeBookletEditor(item) {
  const controls = getEditorControls();
  const pages = pagesFor(item);

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

  editorSession.pageNodes.forEach((node, index) => {
    node.dataset.pageIndex = String(index);
    node.addEventListener('click', event => {
      if (controls.bookletEditor?.hidden || event.target.closest('a')) return;
      editorSession.activePageIndex = index;
      editorSession.activeSpreadIndex = Math.floor(index / 2);
      updateEditorSelection();
      syncBookletEditorControls();
    });
  });
  editorSession.spreadNodes.forEach((node, index) => {
    node.dataset.spreadIndex = String(index);
  });

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

  [
    [controls.editorShowTitle, 'showTitle'],
    [controls.editorShowSubtitle, 'showSubtitle'],
    [controls.editorShowBody, 'showBody']
  ].forEach(([control, key]) => {
    control?.addEventListener('change', () => setEditorValue(key, control.checked));
  });

  controls.editorScope?.addEventListener('change', syncBookletEditorControls);
  controls.bookletEditorClose?.addEventListener('click', closeBookletEditor);
  controls.bookletEditorMode?.addEventListener('click', () => setEditorCompactMode(!editorCompactMode));
  controls.editorParameterPrevious?.addEventListener('click', () => moveEditorParameter(-1));
  controls.editorParameterNext?.addEventListener('click', () => moveEditorParameter(1));
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
