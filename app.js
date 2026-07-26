const grid = document.querySelector('#booklet-grid');
const filtersNode = document.querySelector('#filters');
const template = document.querySelector('#booklet-card-template');
const dialog = document.querySelector('#booklet-dialog');
const dialogContent = document.querySelector('#dialog-content');
const countNode = document.querySelector('#published-count');
const emptyState = document.querySelector('#empty-state');
const paginationNode = document.querySelector('#pagination');
const themeToggle = document.querySelector('#theme-toggle');
const themeColor = document.querySelector('#theme-color');
const menuToggle = document.querySelector('#menu-toggle');
const siteNav = document.querySelector('#site-nav');
const contactForm = document.querySelector('#contact-form');
const contactFormStatus = document.querySelector('#contact-form-status');
const generationForm = document.querySelector('#generation-form');
const generationFormStatus = document.querySelector('#generation-form-status');
const requestHistoryButton = document.querySelector('#request-history-button');
const requestHistoryCount = document.querySelector('#request-history-count');
const requestDialog = document.querySelector('#request-status-dialog');
const requestDialogClose = document.querySelector('#request-dialog-close');
const requestHistorySelect = document.querySelector('#request-history-select');
const requestStatusBadge = document.querySelector('#request-status-badge');
const requestStatusTitle = document.querySelector('#request-status-title');
const requestStatusCopy = document.querySelector('#request-status-copy');
const requestTimerNode = document.querySelector('#request-timer');
const requestTimerLabel = document.querySelector('#request-timer-label');
const requestSteps = [...document.querySelectorAll('#request-steps li')];
const requestGif = document.querySelector('#request-waiting-gif');
const requestVisualState = document.querySelector('#request-visual-state');
const gifChangeButton = document.querySelector('#gif-change-button');
const requestCheckButton = document.querySelector('#request-check-button');
const requestViewButton = document.querySelector('#request-view-button');
const requestIssueLink = document.querySelector('#request-issue-link');

let allBooklets = [];
let activeFilter = 'All';
let currentPage = 1;
const itemsPerPage = 9;
const loadedFontRequests = new Set();
const today = new Date();
today.setHours(23, 59, 59, 999);

const requestStorageKey = 'ai-booklet-generation-requests-v1';
const githubIssuesApi = 'https://api.github.com/repos/aleksvilly/ai-booklet-designs/issues?state=all&labels=booklet-request&per_page=100';
const queueJsonApi = 'https://ntfy.sh/ai-booklet-8bcc753d24dacb6d280ae36b/json?poll=1&since=12h';
const waitingGifs = [
  'https://media.giphy.com/media/13HgwGsXF0aiGY/giphy.gif',
  'https://media.giphy.com/media/LmNwrBhejkK9EFP504/giphy.gif',
  'https://media.giphy.com/media/f3iwJFOVOwuy7K6FFw/giphy.gif',
  'https://media.giphy.com/media/3oKIPnAiaMCws8nOsE/giphy.gif',
  'https://media.giphy.com/media/26BRuo6sLetdllPAQ/giphy.gif',
  'https://media.giphy.com/media/l0HlBO7eyXzSZkJri/giphy.gif',
  'https://media.giphy.com/media/3o7TKtnuHOHHUjR38Y/giphy.gif',
  'https://media.giphy.com/media/VbnUQpnihPSIgIXuZv/giphy.gif',
  'https://media.giphy.com/media/JIX9t2j0ZTN9S/giphy.gif',
  'https://media.giphy.com/media/QBd2kLB5qDmysEXre9/giphy.gif',
  'https://media.giphy.com/media/5Zesu5VPNGJlm/giphy.gif',
  'https://media.giphy.com/media/tXL4FHPSnVJ0A/giphy.gif'
];
let generationRequests = loadGenerationRequests();
let activeRequestId = generationRequests[0]?.id || '';
let requestTimerInterval;
let requestStatusInterval;

function loadGenerationRequests() {
  try {
    const stored = JSON.parse(localStorage.getItem(requestStorageKey) || '[]');
    return Array.isArray(stored) ? stored.slice(0, 20) : [];
  } catch {
    return [];
  }
}

function saveGenerationRequests() {
  localStorage.setItem(requestStorageKey, JSON.stringify(generationRequests.slice(0, 20)));
  updateRequestHistoryButton();
}

function updateRequestHistoryButton() {
  requestHistoryButton.hidden = generationRequests.length === 0;
  requestHistoryCount.textContent = String(generationRequests.length);
}

function activeRequest() {
  return generationRequests.find(request => request.id === activeRequestId) || generationRequests[0];
}

function updateStoredRequest(id, patch) {
  const index = generationRequests.findIndex(request => request.id === id);
  if (index < 0) return;
  generationRequests[index] = { ...generationRequests[index], ...patch };
  saveGenerationRequests();
}

function elapsedLabel(request) {
  const start = new Date(request.submittedAt).getTime();
  const end = request.finishedAt ? new Date(request.finishedAt).getTime() : Date.now();
  const seconds = Math.max(0, Math.floor((end - start) / 1000));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remaining = seconds % 60;
  return hours > 0
    ? `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(remaining).padStart(2, '0')}`
    : `${String(minutes).padStart(2, '0')}:${String(remaining).padStart(2, '0')}`;
}

function nextQueueCheckTime(from = Date.now()) {
  const date = new Date(from);
  const secondsIntoCycle = ((((date.getUTCMinutes() - 2) % 5) + 5) % 5) * 60
    + date.getUTCSeconds()
    + date.getUTCMilliseconds() / 1000;
  return from + (300 - secondsIntoCycle) * 1000;
}

function estimateQueueWaitMinutes(issues, position) {
  if (!position) return null;

  const now = Date.now();
  let checkTime = nextQueueCheckTime(now);
  const releases = issues
    .filter(issue => new Date(issue.created_at).getTime() >= now - 60 * 60 * 1000)
    .map(issue => new Date(issue.created_at).getTime() + 60 * 60 * 1000)
    .filter(time => time > now)
    .sort((a, b) => a - b);

  for (let place = 1; place <= position; place += 1) {
    while (releases[0] <= checkTime) releases.shift();
    if (releases.length >= 3) {
      checkTime = nextQueueCheckTime(releases.shift() + 1000);
      while (releases[0] <= checkTime) releases.shift();
    }
    releases.push(checkTime + 60 * 60 * 1000);
    releases.sort((a, b) => a - b);
  }

  return Math.max(1, Math.ceil((checkTime - now) / 60000));
}

async function queueDetails(requestId, issues) {
  const response = await fetch(queueJsonApi, { cache: 'no-store' });
  if (!response.ok) throw new Error(`Queue returned ${response.status}`);

  const processedIds = new Set();
  issues.forEach(issue => {
    for (const match of String(issue.body || '').matchAll(/<!-- ntfy-id: ([a-zA-Z0-9_-]+) -->/g)) {
      processedIds.add(match[1]);
    }
  });

  const events = (await response.text())
    .split('\n')
    .filter(Boolean)
    .map(line => JSON.parse(line))
    .filter(event => {
      if (event.event !== 'message' || processedIds.has(event.id)) return false;
      try {
        return JSON.parse(event.message).request_type === 'booklet_generation';
      } catch {
        return false;
      }
    })
    .sort((a, b) => a.time - b.time);

  const position = events.findIndex(event => event.id === requestId) + 1;
  return {
    queuePosition: position || null,
    estimatedWaitMinutes: estimateQueueWaitMinutes(issues, position)
  };
}

function statusCopy(request) {
  if (request.status === 'finished') return 'Your booklet is ready and published. Open it below.';
  if (request.status === 'processing') return 'The booklet is being designed and published. This usually takes a few minutes.';
  if (request.status === 'error') return request.error || 'Status could not be checked. Please try again.';
  if (request.queuePosition) {
    const estimate = request.estimatedWaitMinutes
      ? ` Estimated start: about ${request.estimatedWaitMinutes} min.`
      : '';
    return `Queue position: ${request.queuePosition}.${estimate} GitHub may delay scheduled runs.`;
  }
  return 'The request is saved in the public queue and is waiting for GitHub to collect it.';
}

function populateRequestHistory() {
  requestHistorySelect.innerHTML = generationRequests.map(request => {
    const topic = request.topic || 'Random topic';
    const date = new Date(request.submittedAt).toLocaleString();
    return `<option value="${escapeHtml(request.id)}" ${request.id === activeRequestId ? 'selected' : ''}>${escapeHtml(topic)} · ${escapeHtml(date)}</option>`;
  }).join('');
}

function renderRequestDialog() {
  const request = activeRequest();
  if (!request) return;
  activeRequestId = request.id;
  const status = request.status || 'queued';
  const finished = status === 'finished';
  const gifIndex = Number(request.gifIndex || 0) % waitingGifs.length;
  const completedSteps = finished ? 4 : status === 'processing' ? 1 : 1;
  const currentStep = finished ? -1 : status === 'processing' ? 1 : 0;

  populateRequestHistory();
  requestDialog.dataset.status = status;
  requestDialog.querySelector('.request-waiting-visual').dataset.status = status;
  requestStatusTitle.textContent = request.topic || 'Random topic';
  requestStatusBadge.textContent = finished ? 'Published' : status.charAt(0).toUpperCase() + status.slice(1);
  requestStatusBadge.dataset.status = status;
  requestStatusCopy.textContent = statusCopy(request);
  requestTimerNode.textContent = elapsedLabel(request);
  requestTimerLabel.textContent = finished ? 'Total time' : 'Elapsed time';
  requestTimerNode.closest('.request-timer-block').classList.toggle('is-finished', finished);
  requestGif.src = waitingGifs[gifIndex];
  requestVisualState.textContent = finished
    ? 'Published ✓'
    : status === 'processing'
      ? 'Building booklet…'
      : 'Waiting in queue';
  gifChangeButton.hidden = finished;

  requestSteps.forEach((step, index) => {
    step.dataset.state = index < completedSteps
      ? 'done'
      : index === currentStep
        ? 'current'
        : 'upcoming';
  });

  requestCheckButton.classList.toggle('is-complete', finished);
  requestCheckButton.disabled = finished;
  requestCheckButton.textContent = finished ? '✓ Ready' : 'Check status';

  requestViewButton.setAttribute('aria-disabled', String(!finished));
  requestViewButton.tabIndex = finished ? 0 : -1;
  requestViewButton.textContent = finished ? 'View booklet ↗' : 'Booklet is being prepared…';
  if (finished) {
    requestViewButton.href = request.resultUrl || './';
  } else {
    requestViewButton.removeAttribute('href');
  }
  requestIssueLink.hidden = !request.issueUrl;
  requestIssueLink.href = request.issueUrl || '#';
}

function startRequestTimers() {
  clearInterval(requestTimerInterval);
  clearInterval(requestStatusInterval);
  requestTimerInterval = setInterval(() => {
    const request = activeRequest();
    if (request && request.status !== 'finished') requestTimerNode.textContent = elapsedLabel(request);
  }, 1000);
  requestStatusInterval = setInterval(() => {
    if (requestDialog.open && activeRequest()?.status !== 'finished') checkActiveRequestStatus(false);
  }, 90000);
}

function openRequestDialog(id = generationRequests[0]?.id, blurForm = false) {
  if (!id) return;
  activeRequestId = id;
  if (blurForm) generationForm.classList.add('is-request-active');
  renderRequestDialog();
  if (!requestDialog.open) requestDialog.showModal();
  startRequestTimers();
  checkActiveRequestStatus(false);
}

function closeRequestDialog() {
  requestDialog.close();
  generationForm.classList.remove('is-request-active');
  clearInterval(requestTimerInterval);
  clearInterval(requestStatusInterval);
}

async function checkActiveRequestStatus(showFeedback = true) {
  const request = activeRequest();
  if (!request) return;
  const originalLabel = requestCheckButton.textContent;
  requestCheckButton.disabled = true;
  requestCheckButton.textContent = 'Checking…';

  try {
    const response = await fetch(githubIssuesApi, {
      cache: 'no-store',
      headers: { Accept: 'application/vnd.github+json' }
    });
    if (!response.ok) throw new Error(`GitHub returned ${response.status}`);
    const issues = await response.json();
    const marker = `<!-- ntfy-id: ${request.id} -->`;
    const issue = issues.find(item => String(item.body || '').includes(marker));

    if (!issue) {
      let details = {};
      try {
        details = await queueDetails(request.id, issues);
      } catch (queueError) {
        console.warn(queueError);
      }
      updateStoredRequest(request.id, { status: 'queued', error: '', ...details });
    } else {
      const labels = (issue.labels || []).map(label => typeof label === 'string' ? label : label.name);
      const finished = labels.includes('finished') || issue.state === 'closed';
      const resultMatch = String(issue.body || '').match(/^result_url:\s*(\S+)/mi);
      updateStoredRequest(request.id, {
        status: finished ? 'finished' : 'processing',
        issueUrl: issue.html_url,
        resultUrl: resultMatch?.[1] || (finished ? './' : ''),
        finishedAt: finished ? (issue.closed_at || issue.updated_at || request.finishedAt || new Date().toISOString()) : '',
        queuePosition: null,
        estimatedWaitMinutes: null,
        error: ''
      });
    }
  } catch (error) {
    console.error(error);
    if (showFeedback) updateStoredRequest(request.id, { status: 'error', error: 'GitHub status is temporarily unavailable.' });
  } finally {
    requestCheckButton.disabled = false;
    requestCheckButton.textContent = originalLabel;
    renderRequestDialog();
  }
}

function applyTheme(theme, persist = true) {
  const isDark = theme === 'dark';
  document.documentElement.dataset.theme = isDark ? 'dark' : 'light';
  themeToggle.setAttribute('aria-pressed', String(isDark));
  themeToggle.setAttribute('aria-label', `Switch to ${isDark ? 'light' : 'dark'} theme`);
  themeToggle.querySelector('.theme-toggle-label').textContent = isDark ? 'Light' : 'Dark';
  themeColor.content = isDark ? '#121211' : '#f3f0e8';
  if (persist) localStorage.setItem('theme', isDark ? 'dark' : 'light');
}

applyTheme(document.documentElement.dataset.theme, false);
themeToggle.addEventListener('click', () => {
  applyTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark');
});

function setMenu(open) {
  siteNav.classList.toggle('is-open', open);
  menuToggle.setAttribute('aria-expanded', String(open));
  menuToggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
}

menuToggle.addEventListener('click', () => {
  setMenu(!siteNav.classList.contains('is-open'));
});

siteNav.addEventListener('click', event => {
  if (event.target.closest('a')) setMenu(false);
});

function syncRangeOutputs() {
  document.querySelectorAll('[data-range-output]').forEach(output => {
    const input = generationForm.elements[output.dataset.rangeOutput];
    if (input) output.value = input.value;
  });
}

generationForm.addEventListener('input', event => {
  if (event.target.matches('input[type="range"]')) syncRangeOutputs();
});
syncRangeOutputs();

document.addEventListener('keydown', event => {
  if (event.key === 'Escape') setMenu(false);
});

async function sendPrivateForm(event, formStatus, successMessage) {
  event.preventDefault();
  const form = event.currentTarget;
  const formData = new FormData(form);
  const submitButton = form.querySelector('button[type="submit"]');
  const originalLabel = submitButton.textContent;

  submitButton.disabled = true;
  submitButton.textContent = 'Sending…';
  formStatus.textContent = '';

  try {
    const response = await fetch(form.action, {
      method: 'POST',
      body: formData,
      headers: { Accept: 'application/json' }
    });

    if (!response.ok) throw new Error(`Contact form returned ${response.status}`);
    form.reset();
    formStatus.textContent = successMessage;
  } catch (error) {
    console.error(error);
    formStatus.textContent = 'The request could not be sent. Please try again.';
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = originalLabel;
  }
}

async function sendQueueForm(event, formStatus, successMessage) {
  event.preventDefault();
  const form = event.currentTarget;
  const rawFormData = new FormData(form);
  const formData = Object.fromEntries(rawFormData.entries());
  formData.effects = rawFormData.getAll('effects').join(',');
  const submitButton = form.querySelector('button[type="submit"]');
  const originalLabel = submitButton.textContent;

  if (formData._gotcha) return;

  submitButton.disabled = true;
  submitButton.textContent = 'Queueing…';
  formStatus.textContent = '';
  const submittedAt = new Date().toISOString();

  try {
    const response = await fetch(form.action, {
      method: 'POST',
      body: JSON.stringify({
        ...formData,
        _gotcha: undefined,
        source: window.location.href,
        submitted_at: submittedAt
      }),
      headers: { 'Content-Type': 'text/plain;charset=UTF-8' }
    });

    if (!response.ok) throw new Error(`Queue returned ${response.status}`);
    const queueMessage = await response.json();
    if (!queueMessage.id) throw new Error('Queue did not return a request ID');

    const request = {
      id: queueMessage.id,
      submittedAt,
      topic: String(formData.topic || '').trim(),
      style: String(formData.style || 'auto'),
      status: 'queued',
      gifIndex: Math.floor(Math.random() * waitingGifs.length),
      issueUrl: '',
      resultUrl: '',
      finishedAt: '',
      error: ''
    };
    generationRequests = [request, ...generationRequests.filter(item => item.id !== request.id)].slice(0, 20);
    activeRequestId = request.id;
    saveGenerationRequests();
    form.reset();
    syncRangeOutputs();
    formStatus.textContent = successMessage;
    openRequestDialog(request.id, true);
  } catch (error) {
    console.error(error);
    formStatus.textContent = 'The request could not be sent. Please try again.';
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = originalLabel;
  }
}

contactForm.addEventListener('submit', event => {
  sendPrivateForm(event, contactFormStatus, 'Thank you — your message has been sent.');
});

generationForm.addEventListener('submit', event => {
  sendQueueForm(
    event,
    generationFormStatus,
    'Request queued — GitHub will start generation automatically.'
  );
});

requestHistoryButton.addEventListener('click', () => openRequestDialog());
requestDialogClose.addEventListener('click', closeRequestDialog);
requestDialog.addEventListener('click', event => {
  const rect = requestDialog.getBoundingClientRect();
  const outside = event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom;
  if (outside) closeRequestDialog();
});
requestHistorySelect.addEventListener('change', event => {
  activeRequestId = event.target.value;
  renderRequestDialog();
  checkActiveRequestStatus(false);
});
gifChangeButton.addEventListener('click', () => {
  const request = activeRequest();
  if (!request) return;
  updateStoredRequest(request.id, {
    gifIndex: (Number(request.gifIndex || 0) + 1) % waitingGifs.length,
    gifFailures: 0
  });
  renderRequestDialog();
});
requestCheckButton.addEventListener('click', () => checkActiveRequestStatus(true));
requestViewButton.addEventListener('click', event => {
  if (requestViewButton.getAttribute('aria-disabled') === 'true') event.preventDefault();
});
requestGif.addEventListener('error', () => {
  const request = activeRequest();
  if (!request) return;

  const gifFailures = Number(request.gifFailures || 0) + 1;
  if (gifFailures >= waitingGifs.length) {
    requestGif.removeAttribute('src');
    requestGif.alt = 'Waiting for booklet generation';
    return;
  }

  updateStoredRequest(request.id, {
    gifIndex: (Number(request.gifIndex || 0) + 1) % waitingGifs.length,
    gifFailures
  });
  renderRequestDialog();
});

updateRequestHistoryButton();

function escapeHtml(value = '') {
  return String(value).replace(/[&<>'"]/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  })[char]);
}

function safeUrl(value = '') {
  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol) ? url.href : '#';
  } catch {
    return '#';
  }
}

function safeClass(value = '') {
  return String(value).toLowerCase().replace(/[^a-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '');
}

function safeFontName(value = 'DM Sans') {
  const cleaned = String(value).replace(/[^a-zA-Z0-9 \-]+/g, '').trim();
  return cleaned || 'DM Sans';
}

function fontStack(value = 'DM Sans') {
  const family = safeFontName(value);
  const serif = /serif|garamond|baskerville|baskerville|lora|spectral|fraunces|prata|cinzel|cardo|merriweather|gloock|bodoni|yeseva|abril/i.test(family);
  const mono = /mono|code|vt323/i.test(family);
  return `"${family}", ${mono ? 'monospace' : serif ? 'serif' : 'sans-serif'}`;
}

function safeRotation(value) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(-12, Math.min(12, number)) : 0;
}

function safeImagePosition(value = 'center') {
  const allowed = new Set(['center', 'center top', 'center bottom', 'left center', 'right center']);
  return allowed.has(value) ? value : 'center';
}

function applyPalette(node, palette = []) {
  const fallback = ['#f2eee4', '#ed5d40', '#234fde', '#151515'];
  [...fallback].map((color, index) => palette[index] || color).forEach((color, index) => {
    node.style.setProperty(`--c${index + 1}`, color);
  });
}

function designClasses(item) {
  const dna = item.designDna || {};
  return [
    `style-${safeClass(dna.styleFamily || item.layout || 'editorial')}`,
    `color-${safeClass(dna.colorMode || 'default')}`,
    `archetype-${safeClass(dna.archetype || 'booklet')}`,
    `rhythm-${safeClass(dna.visualRhythm || 'balanced')}`,
    `shape-${safeClass(dna.shapeLanguage || 'mixed')}`,
    `cover-system-${safeClass(dna.coverArchetype || 'type-only')}`,
    `font-strategy-${safeClass(dna.fontStrategy || 'disciplined-pair')}`
  ].join(' ');
}

function fontsFor(item) {
  const dna = item.designDna || {};
  const fonts = Array.isArray(dna.fontPalette) ? dna.fontPalette : [];
  return [...new Set(fonts.map(safeFontName).filter(Boolean))].slice(0, 20);
}

function loadGoogleFonts(families, requestName = 'booklet') {
  const cleanFamilies = [...new Set((families || []).map(safeFontName).filter(Boolean))].slice(0, 24);
  if (!cleanFamilies.length) return;

  const key = cleanFamilies.slice().sort().join('|');
  if (loadedFontRequests.has(key)) return;
  loadedFontRequests.add(key);

  const url = new URL('https://fonts.googleapis.com/css2');
  cleanFamilies.forEach(family => url.searchParams.append('family', family));
  url.searchParams.set('display', 'swap');

  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = url.href;
  link.dataset.fontRequest = requestName;
  document.head.append(link);
}

function setFontVariables(node, item, page = null) {
  const fonts = fontsFor(item);
  const pageFont = page?.fontFamily || fonts[0] || 'DM Sans';
  const display = fonts[0] || pageFont;
  const body = fonts[1] || fonts[0] || 'DM Sans';
  const accent = fonts[2] || fonts[0] || 'IBM Plex Mono';
  const cover = fonts[3] || fonts[0] || 'Playfair Display';

  node.style.setProperty('--font-page', fontStack(pageFont));
  node.style.setProperty('--font-display', fontStack(display));
  node.style.setProperty('--font-body', fontStack(body));
  node.style.setProperty('--font-accent', fontStack(accent));
  node.style.setProperty('--font-cover', fontStack(cover));
}

function isPublished(item) {
  return new Date(`${item.publishDate}T00:00:00`) <= today;
}

function visibleBooklets() {
  return allBooklets
    .filter(isPublished)
    .filter(item => activeFilter === 'All' || item.category === activeFilter)
    .sort((a, b) => b.publishDate.localeCompare(a.publishDate));
}

function coverTitle(title = '') {
  const words = String(title).split(' ').filter(Boolean);
  return words.length < 3 ? title : `${words.slice(0, -1).join(' ')}\n${words.at(-1)}`;
}

function legacyPages(item) {
  const titles = item.spreads || ['Opening statement', 'A world in fragments', 'The central visual story', 'A quiet final note'];
  return titles.map((title, index) => ({
    type: index === 0 ? 'cover' : index === titles.length - 1 ? 'closing' : 'editorial',
    module: index === 0 ? 'cover' : index === titles.length - 1 ? 'closing' : 'micro_essay',
    title,
    body: item.spreadNotes?.[index] || 'A distinct editorial moment using scale, contrast and controlled asymmetry.',
    layout: ['minimal', 'split', 'overlap', 'full'][index % 4]
  }));
}

function pagesFor(item) {
  return Array.isArray(item.pages) && item.pages.length ? item.pages : legacyPages(item);
}

function imagesForPage(page = {}) {
  const images = Array.isArray(page.images) && page.images.length
    ? page.images
    : page.image
      ? [page.image]
      : [];
  return images.filter(image => safeUrl(image?.url || '') !== '#');
}

function imageCredit(image, compact = false) {
  const creator = escapeHtml(image.creator || 'Creator');
  const source = escapeHtml(image.source || 'Source');
  const creatorUrl = safeUrl(image.creatorUrl || image.sourceUrl);
  const sourceUrl = safeUrl(image.sourceUrl || image.creatorUrl);
  const licenseUrl = safeUrl(image.licenseUrl || image.sourceUrl);
  const license = escapeHtml(image.license || 'Licence');
  if (compact) {
    return `<a href="${creatorUrl}" target="_blank" rel="noopener">${creator}</a> / <a href="${sourceUrl}" target="_blank" rel="noopener">${source}</a>`;
  }
  return `© <a href="${creatorUrl}" target="_blank" rel="noopener">${creator}</a> · <a href="${sourceUrl}" target="_blank" rel="noopener">${source}</a> · <a href="${licenseUrl}" target="_blank" rel="noopener">${license}</a>`;
}

function createCardCoverMedia(cover, item, page, index) {
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
      currentPage = 1;
      updatePageUrl(currentPage, true);
      renderFilters();
      renderCards();
      renderPagination();
    });
    filtersNode.append(button);
  }
}

function pageFromUrl(totalPages = 1) {
  const value = Number.parseInt(new URL(window.location.href).searchParams.get('page'), 10);
  if (!Number.isInteger(value) || value < 1) return 1;
  return Math.min(value, Math.max(1, totalPages));
}

function updatePageUrl(page, replace = false) {
  const url = new URL(window.location.href);
  if (page <= 1) url.searchParams.delete('page');
  else url.searchParams.set('page', String(page));

  const state = { ...(history.state || {}), page };
  history[replace ? 'replaceState' : 'pushState'](state, '', url);
}

function renderPagination() {
  const items = visibleBooklets();
  const totalPages = Math.ceil(items.length / itemsPerPage);
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
        grid.scrollIntoView({ behavior: 'smooth', block: 'start' });
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

function renderCards() {
  const items = visibleBooklets();
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const pageItems = items.slice(startIndex, endIndex);
  
  grid.innerHTML = '';
  emptyState.hidden = items.length > 0;

  if (pageItems.length === 0) {
    return;
  }

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

    createCardCoverMedia(cover, item, firstPage, index);
    cover.addEventListener('click', () => openBooklet(item));
    grid.append(card);
  });
}

function imageMarkup(image, page, index, total) {
  const imageUrl = safeUrl(image?.url || '');
  if (imageUrl === '#') return '';
  const alt = escapeHtml(image.alt || page.title || 'Booklet image');
  const label = escapeHtml(String(image.alt || `Image ${index + 1}`).slice(0, 58));
  return `<figure class="gallery-image gallery-image-${index + 1}">
    <img data-src="${escapeHtml(imageUrl)}" alt="${alt}" decoding="async">
    <figcaption><span>${String(index + 1).padStart(2, '0')} / ${label}</span><small>${imageCredit(image, true)}</small></figcaption>
  </figure>`;
}

function mediaMarkup(page) {
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

function sourceMarkup(page) {
  if (!page.source?.url) return '';
  return `<a class="page-source" href="${safeUrl(page.source.url)}" target="_blank" rel="noopener">Source suggestion: ${escapeHtml(page.source.title)} ↗</a>`;
}

function pageMarkup(page, index, item) {
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

  return `<article style="${escapeHtml(style)}" class="book-page ${classes}" data-spread-id="${escapeHtml(page.spreadId || '')}">
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

function spreadsMarkup(pages, item) {
  const spreads = [];
  for (let index = 0; index < pages.length; index += 2) {
    const left = pages[index];
    const right = pages[index + 1];
    const continuous = left?.spreadId && right?.spreadId && left.spreadId === right.spreadId;
    const kind = continuous ? left.spreadKind || 'continuous' : 'standard';
    spreads.push(`<section class="print-spread ${continuous ? 'continuous-spread' : ''} spread-${safeClass(kind)}">
      ${pageMarkup(left, index, item)}
      ${right ? pageMarkup(right, index + 1, item) : '<article class="book-page blank-page"></article>'}
    </section>`);
  }
  return spreads.join('');
}

function coverVisualMarkup(item, page) {
  const images = imagesForPage(page).slice(0, 20);
  if (!images.length) return '<span class="detail-cover-art detail-cover-art-a"></span><span class="detail-cover-art detail-cover-art-b"></span>';
  return `<div class="detail-cover-media detail-cover-media-${images.length}">
    ${images.map((image, index) => `<figure><img data-src="${escapeHtml(safeUrl(image.url))}" alt="${escapeHtml(image.alt || item.title)}" decoding="async"><figcaption>${imageCredit(image, true)}</figcaption></figure>`).join('')}
  </div>`;
}

function detailHtml(item) {
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
        <p>${escapeHtml(item.direction)} Each row represents one A4 landscape print spread containing two A5 pages.</p>
      </div>
      <div class="spreads-list">${spreadsMarkup(pages, item)}</div>
      <div class="detail-actions">
        <button type="button" data-action="copy">Copy share link</button>
        <button type="button" data-action="print">Print / save PDF</button>
        <button type="button" data-action="close">Back to collection</button>
      </div>
    </section>`;
}

function loadDialogImages(root) {
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

function activateGeneratedEffects(root) {
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

function resetDialogScroll() {
  // A native <dialog> keeps its previous scroll position after close/open.
  // Reset both the dialog and its content because browsers differ on which
  // element becomes the actual scroll container.
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

function openBooklet(item, updateUrl = true) {
  loadGoogleFonts(fontsFor(item), `booklet-${safeClass(item.id)}`);
  dialogContent.innerHTML = detailHtml(item);
  applyPalette(dialogContent, item.palette);
  setFontVariables(dialogContent, item, pagesFor(item)[0]);

  const url = new URL(window.location.href);
  const hadPageParameter = url.searchParams.has('page');
  url.searchParams.delete('page');
  if (updateUrl) {
    url.searchParams.set('booklet', item.id);
    history.pushState({ booklet: item.id, collectionPage: currentPage }, '', url);
  } else if (hadPageParameter) {
    history.replaceState({ ...(history.state || {}), booklet: item.id, collectionPage: currentPage }, '', url);
  }

  // Reset before and after showModal(). Some browsers restore the old native
  // dialog scroll position during layout, so one reset is not always enough.
  resetDialogScroll();
  dialog.showModal();
  dialog.focus({ preventScroll: true });
  resetDialogScroll();

  requestAnimationFrame(() => {
    resetDialogScroll();
    loadDialogImages(dialogContent);
    activateGeneratedEffects(dialogContent);

    // A second frame covers delayed dialog layout and dynamically loaded fonts.
    requestAnimationFrame(resetDialogScroll);
  });

  dialogContent.querySelector('[data-action="close"]').addEventListener('click', closeDialog);
  dialogContent.querySelector('[data-action="print"]').addEventListener('click', () => window.print());
  dialogContent.querySelector('[data-action="copy"]').addEventListener('click', async event => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      event.currentTarget.textContent = 'Link copied';
    } catch {
      event.currentTarget.textContent = 'Copy failed';
    }
  });
}

function closeDialog() {
  dialog.close();
  resetDialogScroll();
  const url = new URL(window.location.href);
  url.searchParams.delete('booklet');
  if (currentPage > 1) url.searchParams.set('page', String(currentPage));
  else url.searchParams.delete('page');
  history.pushState({ page: currentPage }, '', url);
}

document.querySelector('#dialog-close').addEventListener('click', closeDialog);
dialog.addEventListener('click', event => {
  const rect = dialog.getBoundingClientRect();
  const outside = event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom;
  if (outside) closeDialog();
});
window.addEventListener('popstate', () => {
  const url = new URL(window.location.href);
  const id = url.searchParams.get('booklet');
  if (id) {
    const item = allBooklets.find(booklet => booklet.id === id);
    if (item) openBooklet(item, false);
    return;
  }

  const totalPages = Math.ceil(visibleBooklets().length / itemsPerPage);
  const requestedPage = pageFromUrl(totalPages);
  if (requestedPage !== currentPage) {
    currentPage = requestedPage;
    renderCards();
    renderPagination();
    grid.scrollIntoView({ behavior: 'auto', block: 'start' });
  }

  if (dialog.open) dialog.close();
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
  const totalPages = Math.ceil(visibleBooklets().length / itemsPerPage);
  currentPage = pageFromUrl(totalPages);
  updatePageUrl(currentPage, true);
  renderFilters();
  renderCards();
  renderPagination();

  const requestedId = new URL(window.location.href).searchParams.get('booklet');
  const requested = allBooklets.find(item => item.id === requestedId && isPublished(item));
  if (requested) openBooklet(requested, false);
}

init().catch(error => {
  console.error(error);
  grid.innerHTML = '<p>Unable to load the collection. Please refresh the page.</p>';
});
