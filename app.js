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

function isPublished(item) {
  const date = new Date(`${item.publishDate}T00:00:00`);
  return date <= today;
}

function visibleBooklets() {
  return allBooklets
    .filter(isPublished)
    .filter(item => activeFilter === 'All' || item.category === activeFilter)
    .sort((a, b) => b.publishDate.localeCompare(a.publishDate));
}

function coverTitle(title) {
  const words = title.split(' ');
  if (words.length < 3) return title;
  return `${words.slice(0, -1).join(' ')}\n${words.at(-1)}`;
}

function renderFilters() {
  const categories = ['All', ...new Set(allBooklets.filter(isPublished).map(item => item.category))];
  filtersNode.innerHTML = '';
  for (const category of categories) {
    const button = document.createElement('button');
    button.className = `filter-button${category === activeFilter ? ' active' : ''}`;
    button.type = 'button';
    button.textContent = category;
    button.addEventListener('click', () => {
      activeFilter = category;
      renderFilters();
      renderCards();
    });
    filtersNode.append(button);
  }
}

function applyPalette(node, palette) {
  palette.forEach((color, index) => node.style.setProperty(`--c${index + 1}`, color));
}

function renderCards() {
  const items = visibleBooklets();
  grid.innerHTML = '';
  emptyState.hidden = items.length > 0;

  items.forEach((item, index) => {
    const card = template.content.firstElementChild.cloneNode(true);
    card.dataset.layout = item.layout;
    applyPalette(card, item.palette);
    card.querySelector('.cover-kicker').textContent = `${item.era} / ${item.style}`;
    card.querySelector('.cover-title').textContent = coverTitle(item.title);
    card.querySelector('.cover-number').textContent = String(index + 1).padStart(2, '0');
    card.querySelector('.card-audience').textContent = `For ${item.audience}`;
    card.querySelector('.card-title').textContent = item.title;
    card.querySelector('.card-direction').textContent = item.direction;
    card.querySelector('.cover').addEventListener('click', () => openBooklet(item));
    grid.append(card);
  });
}

function detailHtml(item) {
  const spreadTitles = item.spreads || [
    'Opening statement',
    'A world in fragments',
    'The central visual story',
    'A quiet final note'
  ];

  return `
    <section class="detail-hero" style="--c1:${item.palette[0]};--c2:${item.palette[1]};--c3:${item.palette[2]};--c4:${item.palette[3]}">
      <div class="detail-cover">
        <span class="detail-shape-a"></span>
        <span class="detail-shape-b"></span>
        <p class="eyebrow">For ${item.audience}</p>
        <h2 class="detail-title">${coverTitle(item.title)}</h2>
      </div>
      <div class="detail-meta">
        <p class="eyebrow">Concept ${item.publishDate}</p>
        <p class="detail-description">${item.description}</p>
        <div class="detail-facts">
          <div><span>Era</span><strong>${item.era}</strong></div>
          <div><span>Direction</span><strong>${item.style}</strong></div>
          <div><span>Format</span><strong>${item.format}</strong></div>
          <div><span>Category</span><strong>${item.category}</strong></div>
        </div>
      </div>
    </section>
    <section class="spread-section" style="--c1:${item.palette[0]};--c2:${item.palette[1]};--c3:${item.palette[2]};--c4:${item.palette[3]}">
      <div class="spread-heading">
        <h3>Page rhythm</h3>
        <p>${item.direction} The final booklet would combine licensed or public-domain imagery with original typography and compositional elements.</p>
      </div>
      <div class="spread-grid">
        ${spreadTitles.map((title, i) => `
          <article class="spread">
            <span class="spread-num">0${i + 1}</span>
            <h4>${title}</h4>
            <p>${item.spreadNotes?.[i] || 'A distinct editorial moment using scale, contrast and controlled asymmetry.'}</p>
          </article>`).join('')}
      </div>
      <div class="detail-actions">
        <button type="button" data-action="copy">Copy share link</button>
        <button type="button" data-action="close">Back to collection</button>
      </div>
    </section>`;
}

function openBooklet(item, updateUrl = true) {
  dialogContent.innerHTML = detailHtml(item);
  if (updateUrl) {
    const url = new URL(window.location.href);
    url.searchParams.set('booklet', item.id);
    history.pushState({ booklet: item.id }, '', url);
  }
  dialog.showModal();
  dialogContent.querySelector('[data-action="close"]').addEventListener('click', closeDialog);
  dialogContent.querySelector('[data-action="copy"]').addEventListener('click', async event => {
    await navigator.clipboard.writeText(window.location.href);
    event.currentTarget.textContent = 'Link copied';
  });
}

function closeDialog() {
  dialog.close();
  const url = new URL(window.location.href);
  url.searchParams.delete('booklet');
  history.pushState({}, '', url);
}

document.querySelector('#dialog-close').addEventListener('click', closeDialog);
dialog.addEventListener('click', event => {
  const rect = dialog.getBoundingClientRect();
  const outside = event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom;
  if (outside) closeDialog();
});
window.addEventListener('popstate', () => {
  const id = new URL(window.location.href).searchParams.get('booklet');
  if (!id) return dialog.close();
  const item = allBooklets.find(booklet => booklet.id === id);
  if (item) openBooklet(item, false);
});

document.querySelector('#surprise-button').addEventListener('click', () => {
  const items = allBooklets.filter(isPublished);
  if (items.length) openBooklet(items[Math.floor(Math.random() * items.length)]);
});

async function init() {
  const response = await fetch('./data/booklets.json', { cache: 'no-store' });
  if (!response.ok) throw new Error(`Failed to load booklets: ${response.status}`);
  allBooklets = await response.json();
  countNode.textContent = `${allBooklets.filter(isPublished).length} published`;
  renderFilters();
  renderCards();

  const requestedId = new URL(window.location.href).searchParams.get('booklet');
  const requested = allBooklets.find(item => item.id === requestedId && isPublished(item));
  if (requested) openBooklet(requested, false);
}

init().catch(error => {
  console.error(error);
  grid.innerHTML = '<p>Unable to load the collection. Please refresh the page.</p>';
});
