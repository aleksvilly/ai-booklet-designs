import { escapeHtml } from './utils.js';

let generatorCatalog = null;
let settingTopicFromCatalog = false;

export function getGeneratorCatalog() {
  return generatorCatalog;
}

export function catalogLabel(item) {
  return item?.labels?.en || item?.label || item?.id || '';
}

export function flattenTopicCatalog(nodes, parents = []) {
  return (nodes || []).flatMap(node => {
    const path = [...parents, node];
    return [
      { node, path },
      ...flattenTopicCatalog(node.children, path)
    ];
  });
}

export function setCatalogTopic(path) {
  const bookletTopicInput = document.querySelector('#booklet-topic');
  const topicPathInput = document.querySelector('#topic-path');
  const topicPathPreview = document.querySelector('#topic-path-preview');

  const selected = path.at(-1);
  if (!selected) {
    if (topicPathInput) topicPathInput.value = '';
    if (topicPathPreview) topicPathPreview.textContent = 'Choose any level. The deepest selection becomes the booklet topic.';
    return;
  }

  const labels = path.map(catalogLabel);
  if (topicPathInput) topicPathInput.value = path.map(node => node.id).join('/');
  settingTopicFromCatalog = true;
  if (bookletTopicInput) bookletTopicInput.value = selected.prompt || labels.join(' — ');
  settingTopicFromCatalog = false;
  if (topicPathPreview) topicPathPreview.innerHTML = `<strong>${escapeHtml(labels.join(' → '))}</strong> · selected automatically`;
}

export function renderTopicWheel(selectedIds = []) {
  const topicWheel = document.querySelector('#topic-wheel');
  if (!generatorCatalog?.topics || !topicWheel) return;
  topicWheel.innerHTML = '';

  let nodes = generatorCatalog.topics.groups || [];
  const selectedPath = [];

  for (let depth = 0; nodes.length; depth += 1) {
    const wrapper = document.createElement('label');
    const title = document.createElement('span');
    const select = document.createElement('select');
    const selectedId = selectedIds[depth] || '';

    title.textContent = depth === 0 ? 'Category' : depth === 1 ? 'Topic' : `Subtopic ${depth - 1}`;
    select.dataset.topicDepth = String(depth);
    select.append(new Option(depth === 0 ? 'Choose a category…' : 'Choose this level…', ''));

    [...nodes]
      .sort((a, b) => catalogLabel(a).localeCompare(catalogLabel(b)))
      .forEach(node => select.append(new Option(catalogLabel(node), node.id)));

    if (nodes.some(node => node.id === selectedId)) select.value = selectedId;
    wrapper.append(title, select);
    topicWheel.append(wrapper);

    select.addEventListener('change', () => {
      const prefix = [...topicWheel.querySelectorAll('select')]
        .slice(0, depth)
        .map(control => control.value)
        .filter(Boolean);
      renderTopicWheel(select.value ? [...prefix, select.value] : prefix);
    });

    const selected = nodes.find(node => node.id === select.value);
    if (!selected) break;
    selectedPath.push(selected);
    nodes = selected.children || [];
  }

  setCatalogTopic(selectedPath);
}

export function renderTopicSearch(query) {
  const topicSearchResults = document.querySelector('#topic-search-results');
  const topicCatalogSearch = document.querySelector('#topic-catalog-search');

  if (!topicSearchResults) return;
  const normalized = String(query || '').trim().toLocaleLowerCase();
  topicSearchResults.innerHTML = '';
  topicSearchResults.hidden = normalized.length < 2;
  if (normalized.length < 2 || !generatorCatalog?.topics) return;

  const matches = flattenTopicCatalog(generatorCatalog.topics.groups)
    .filter(({ node, path }) => {
      const searchable = [
        ...path.flatMap(item => Object.values(item.labels || {})),
        ...(node.aliases || []),
        node.prompt || ''
      ].join(' ').toLocaleLowerCase();
      return searchable.includes(normalized);
    })
    .slice(0, 12);

  if (!matches.length) {
    const empty = document.createElement('p');
    empty.className = 'topic-path-preview';
    empty.textContent = 'No catalog match — keep your own text in the topic field.';
    topicSearchResults.append(empty);
    return;
  }

  for (const { path } of matches) {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = path.map(catalogLabel).join(' → ');
    button.addEventListener('click', () => {
      renderTopicWheel(path.map(node => node.id));
      if (topicCatalogSearch) topicCatalogSearch.value = '';
      topicSearchResults.hidden = true;
    });
    topicSearchResults.append(button);
  }
}

export function bindStyleSlider(selectNode) {
  if (!selectNode) return;
  const parent = selectNode.parentNode;
  if (!parent) return;

  selectNode.style.display = 'none';
  if (!parent.classList.contains('range-field')) parent.classList.add('range-field');
  if (!parent.classList.contains('field-wide')) parent.classList.add('field-wide');

  let output = parent.querySelector('output');
  if (!output) {
    output = document.createElement('output');
    selectNode.before(output);
  }
  output.classList.add('style-slider-output');

  let slider = parent.querySelector('input[type="range"]');
  if (!slider) {
    slider = document.createElement('input');
    slider.type = 'range';
    selectNode.after(slider);
  }

  slider.min = '0';
  slider.max = String(Math.max(0, selectNode.options.length - 1));
  slider.value = String(Math.max(0, selectNode.selectedIndex));

  function update() {
    const option = selectNode.options[selectNode.selectedIndex];
    if (option) {
      output.textContent = option.textContent;
      slider.value = String(selectNode.selectedIndex);
    }
  }

  slider.oninput = () => {
    const idx = Math.max(0, Math.min(selectNode.options.length - 1, Number(slider.value)));
    selectNode.selectedIndex = idx;
    selectNode.dispatchEvent(new Event('change', { bubbles: true }));
    update();
  };

  selectNode.onchange = update;
  update();
}

export function appendCatalogStyles(styleCatalog) {
  const styleProfileSelect = document.querySelector('#style-profile-select');
  if (!styleProfileSelect) return;

  const groupLabels = new Map((styleCatalog.groups || []).map(group => [group.id, catalogLabel(group)]));
  const existing = new Set([...styleProfileSelect.options].map(option => option.value));

  for (const style of styleCatalog.items || []) {
    if (!style.id || existing.has(style.id)) continue;
    const label = groupLabels.get(style.groupId) || 'Catalog styles';
    let group = [...styleProfileSelect.querySelectorAll('optgroup')]
      .find(node => node.label === label);
    if (!group) {
      group = document.createElement('optgroup');
      group.label = label;
      styleProfileSelect.insertBefore(group, styleProfileSelect.lastElementChild);
    }
    group.append(new Option(catalogLabel(style), style.id));
    existing.add(style.id);
  }

  bindStyleSlider(styleProfileSelect);
}

export function renderCatalogEffects(effectCatalog) {
  const effectPicker = document.querySelector('#effect-picker');
  if (!effectPicker) return;

  const legend = effectPicker.querySelector('legend');
  const checked = new Set(
    [...effectPicker.querySelectorAll('input:checked')].map(input => input.value)
  );
  effectPicker.replaceChildren(legend);

  const groupLabels = new Map((effectCatalog.groups || []).map(group => [group.id, catalogLabel(group)]));
  for (const effect of effectCatalog.items || []) {
    const label = document.createElement('label');
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.name = 'effects';
    input.value = effect.id;
    input.checked = checked.has(effect.id);
    label.title = groupLabels.get(effect.groupId) || '';
    label.append(input, document.createTextNode(catalogLabel(effect)));
    effectPicker.append(label);
  }
}

export async function loadGeneratorCatalogs() {
  const bookletTopicInput = document.querySelector('#booklet-topic');
  const topicPathInput = document.querySelector('#topic-path');
  const topicPathPreview = document.querySelector('#topic-path-preview');
  const topicCatalogSearch = document.querySelector('#topic-catalog-search');

  const [topicsResponse, stylesResponse, effectsResponse] = await Promise.all([
    fetch('./data/catalog/topics.json', { cache: 'no-store' }),
    fetch('./data/catalog/styles.json', { cache: 'no-store' }),
    fetch('./data/catalog/effects.json', { cache: 'no-store' })
  ]);

  if (![topicsResponse, stylesResponse, effectsResponse].every(response => response.ok)) {
    throw new Error('One or more generator catalogs could not be loaded.');
  }

  generatorCatalog = {
    topics: await topicsResponse.json(),
    styles: await stylesResponse.json(),
    effects: await effectsResponse.json()
  };

  renderTopicWheel();
  appendCatalogStyles(generatorCatalog.styles);
  renderCatalogEffects(generatorCatalog.effects);

  topicCatalogSearch?.addEventListener('input', event => renderTopicSearch(event.target.value));
  bookletTopicInput?.addEventListener('input', () => {
    if (settingTopicFromCatalog || !topicPathInput?.value) return;
    if (topicPathInput) topicPathInput.value = '';
    if (topicPathPreview) topicPathPreview.textContent = 'Custom topic entered. The catalog path was cleared.';
  });
}
