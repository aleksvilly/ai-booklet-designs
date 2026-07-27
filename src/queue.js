import { REQUEST_STORAGE_KEY, GITHUB_ISSUES_API, QUEUE_JSON_API, WAITING_GIFS } from './config.js';
import { escapeHtml } from './utils.js';
import { renderTopicWheel } from './catalog.js';

let generationRequests = loadGenerationRequests();
let activeRequestId = generationRequests[0]?.id || '';
let requestTimerInterval;
let requestStatusInterval;

function getQueueControls() {
  return {
    contactForm: document.querySelector('#contact-form'),
    contactFormStatus: document.querySelector('#contact-form-status'),
    generationForm: document.querySelector('#generation-form'),
    generationFormStatus: document.querySelector('#generation-form-status'),
    topicSearchResults: document.querySelector('#topic-search-results'),
    requestHistoryButton: document.querySelector('#request-history-button'),
    requestHistoryCount: document.querySelector('#request-history-count'),
    requestDialog: document.querySelector('#request-status-dialog'),
    requestDialogClose: document.querySelector('#request-dialog-close'),
    requestHistorySelect: document.querySelector('#request-history-select'),
    requestStatusBadge: document.querySelector('#request-status-badge'),
    requestStatusTitle: document.querySelector('#request-status-title'),
    requestStatusCopy: document.querySelector('#request-status-copy'),
    requestTimerNode: document.querySelector('#request-timer'),
    requestTimerLabel: document.querySelector('#request-timer-label'),
    requestSteps: [...document.querySelectorAll('#request-steps li')],
    requestGif: document.querySelector('#request-waiting-gif'),
    requestVisualState: document.querySelector('#request-visual-state'),
    gifChangeButton: document.querySelector('#gif-change-button'),
    requestCheckButton: document.querySelector('#request-check-button'),
    requestViewButton: document.querySelector('#request-view-button'),
    requestIssueLink: document.querySelector('#request-issue-link')
  };
}

export function loadGenerationRequests() {
  try {
    const stored = JSON.parse(localStorage.getItem(REQUEST_STORAGE_KEY) || '[]');
    return Array.isArray(stored) ? stored.slice(0, 20) : [];
  } catch {
    return [];
  }
}

export function saveGenerationRequests() {
  localStorage.setItem(REQUEST_STORAGE_KEY, JSON.stringify(generationRequests.slice(0, 20)));
  updateRequestHistoryButton();
}

export function updateRequestHistoryButton() {
  const { requestHistoryButton, requestHistoryCount } = getQueueControls();
  if (requestHistoryButton && requestHistoryCount) {
    requestHistoryButton.hidden = generationRequests.length === 0;
    requestHistoryCount.textContent = String(generationRequests.length);
  }
}

export function activeRequest() {
  return generationRequests.find(request => request.id === activeRequestId) || generationRequests[0];
}

export function updateStoredRequest(id, patch) {
  const index = generationRequests.findIndex(request => request.id === id);
  if (index < 0) return;
  generationRequests[index] = { ...generationRequests[index], ...patch };
  saveGenerationRequests();
}

export function elapsedLabel(request) {
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

export function nextQueueCheckTime(from = Date.now()) {
  const date = new Date(from);
  const secondsIntoCycle = ((((date.getUTCMinutes() - 2) % 5) + 5) % 5) * 60
    + date.getUTCSeconds()
    + date.getUTCMilliseconds() / 1000;
  return from + (300 - secondsIntoCycle) * 1000;
}

export function estimateQueueWaitMinutes(issues, position) {
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

export async function queueDetails(requestId, issues) {
  const response = await fetch(QUEUE_JSON_API, { cache: 'no-store' });
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

export function statusCopy(request) {
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

export function populateRequestHistory() {
  const { requestHistorySelect } = getQueueControls();
  if (!requestHistorySelect) return;
  requestHistorySelect.innerHTML = generationRequests.map(request => {
    const topic = request.topic || 'Random topic';
    const date = new Date(request.submittedAt).toLocaleString();
    return `<option value="${escapeHtml(request.id)}" ${request.id === activeRequestId ? 'selected' : ''}>${escapeHtml(topic)} · ${escapeHtml(date)}</option>`;
  }).join('');
}

export function renderRequestDialog() {
  const controls = getQueueControls();
  const request = activeRequest();
  if (!request || !controls.requestDialog) return;

  activeRequestId = request.id;
  const status = request.status || 'queued';
  const finished = status === 'finished';
  const gifIndex = Number(request.gifIndex || 0) % WAITING_GIFS.length;
  const completedSteps = finished ? 4 : status === 'processing' ? 1 : 1;
  const currentStep = finished ? -1 : status === 'processing' ? 1 : 0;

  populateRequestHistory();
  controls.requestDialog.dataset.status = status;
  const visualBlock = controls.requestDialog.querySelector('.request-waiting-visual');
  if (visualBlock) visualBlock.dataset.status = status;

  if (controls.requestStatusTitle) controls.requestStatusTitle.textContent = request.topic || 'Random topic';
  if (controls.requestStatusBadge) {
    controls.requestStatusBadge.textContent = finished ? 'Published' : status.charAt(0).toUpperCase() + status.slice(1);
    controls.requestStatusBadge.dataset.status = status;
  }
  if (controls.requestStatusCopy) controls.requestStatusCopy.textContent = statusCopy(request);
  if (controls.requestTimerNode) {
    controls.requestTimerNode.textContent = elapsedLabel(request);
    const timerBlock = controls.requestTimerNode.closest('.request-timer-block');
    if (timerBlock) timerBlock.classList.toggle('is-finished', finished);
  }
  if (controls.requestTimerLabel) controls.requestTimerLabel.textContent = finished ? 'Total time' : 'Elapsed time';
  if (controls.requestGif) controls.requestGif.src = WAITING_GIFS[gifIndex];
  if (controls.requestVisualState) {
    controls.requestVisualState.textContent = finished
      ? 'Published ✓'
      : status === 'processing'
        ? 'Building booklet…'
        : 'Waiting in queue';
  }
  if (controls.gifChangeButton) controls.gifChangeButton.hidden = finished;

  controls.requestSteps.forEach((step, index) => {
    step.dataset.state = index < completedSteps
      ? 'done'
      : index === currentStep
        ? 'current'
        : 'upcoming';
  });

  if (controls.requestCheckButton) {
    controls.requestCheckButton.classList.toggle('is-complete', finished);
    controls.requestCheckButton.disabled = finished;
    controls.requestCheckButton.textContent = finished ? '✓ Ready' : 'Check status';
  }

  if (controls.requestViewButton) {
    controls.requestViewButton.setAttribute('aria-disabled', String(!finished));
    controls.requestViewButton.tabIndex = finished ? 0 : -1;
    controls.requestViewButton.textContent = finished ? 'View booklet ↗' : 'Booklet is being prepared…';
    if (finished) {
      controls.requestViewButton.href = request.resultUrl || './';
    } else {
      controls.requestViewButton.removeAttribute('href');
    }
  }

  if (controls.requestIssueLink) {
    controls.requestIssueLink.hidden = !request.issueUrl;
    controls.requestIssueLink.href = request.issueUrl || '#';
  }
}

export function startRequestTimers() {
  const controls = getQueueControls();
  clearInterval(requestTimerInterval);
  clearInterval(requestStatusInterval);
  requestTimerInterval = setInterval(() => {
    const request = activeRequest();
    if (request && request.status !== 'finished' && controls.requestTimerNode) {
      controls.requestTimerNode.textContent = elapsedLabel(request);
    }
  }, 1000);
  requestStatusInterval = setInterval(() => {
    if (controls.requestDialog?.open && activeRequest()?.status !== 'finished') {
      checkActiveRequestStatus(false);
    }
  }, 90000);
}

export function openRequestDialog(id = generationRequests[0]?.id, blurForm = false) {
  const controls = getQueueControls();
  if (!id) return;
  activeRequestId = id;
  if (blurForm && controls.generationForm) controls.generationForm.classList.add('is-request-active');
  renderRequestDialog();
  if (controls.requestDialog && !controls.requestDialog.open) controls.requestDialog.showModal();
  startRequestTimers();
  checkActiveRequestStatus(false);
}

export function closeRequestDialog() {
  const controls = getQueueControls();
  if (controls.requestDialog) controls.requestDialog.close();
  if (controls.generationForm) controls.generationForm.classList.remove('is-request-active');
  clearInterval(requestTimerInterval);
  clearInterval(requestStatusInterval);
}

export async function checkActiveRequestStatus(showFeedback = true) {
  const controls = getQueueControls();
  const request = activeRequest();
  if (!request || !controls.requestCheckButton) return;

  const originalLabel = controls.requestCheckButton.textContent;
  controls.requestCheckButton.disabled = true;
  controls.requestCheckButton.textContent = 'Checking…';

  try {
    const response = await fetch(GITHUB_ISSUES_API, {
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
    controls.requestCheckButton.disabled = false;
    controls.requestCheckButton.textContent = originalLabel;
    renderRequestDialog();
  }
}

export function syncRangeOutputs() {
  const { generationForm } = getQueueControls();
  if (!generationForm) return;
  document.querySelectorAll('[data-range-output]').forEach(output => {
    const input = generationForm.elements[output.dataset.rangeOutput];
    if (input) {
      const suffix = output.dataset.suffix || '';
      output.textContent = `${input.value}${suffix}`;
    }
  });
}

export async function sendPrivateForm(event, formStatus, successMessage) {
  event.preventDefault();
  const form = event.currentTarget;
  const formData = new FormData(form);
  const submitButton = form.querySelector('button[type="submit"]');
  const originalLabel = submitButton.textContent;

  submitButton.disabled = true;
  submitButton.textContent = 'Sending…';
  if (formStatus) formStatus.textContent = '';

  try {
    const response = await fetch(form.action, {
      method: 'POST',
      body: formData,
      headers: { Accept: 'application/json' }
    });

    if (!response.ok) throw new Error(`Contact form returned ${response.status}`);
    form.reset();
    if (formStatus) formStatus.textContent = successMessage;
  } catch (error) {
    console.error(error);
    if (formStatus) formStatus.textContent = 'The request could not be sent. Please try again.';
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = originalLabel;
  }
}

export async function sendQueueForm(event, formStatus, successMessage) {
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
  if (formStatus) formStatus.textContent = '';
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
      gifIndex: Math.floor(Math.random() * WAITING_GIFS.length),
      issueUrl: '',
      resultUrl: '',
      finishedAt: '',
      error: ''
    };
    generationRequests = [request, ...generationRequests.filter(item => item.id !== request.id)].slice(0, 20);
    activeRequestId = request.id;
    saveGenerationRequests();
    form.reset();
    renderTopicWheel();
    const { topicSearchResults } = getQueueControls();
    if (topicSearchResults) topicSearchResults.hidden = true;
    syncRangeOutputs();
    if (formStatus) formStatus.textContent = successMessage;
    openRequestDialog(request.id, true);
  } catch (error) {
    console.error(error);
    if (formStatus) formStatus.textContent = 'The request could not be sent. Please try again.';
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = originalLabel;
  }
}

export function initQueueSystem() {
  const controls = getQueueControls();

  controls.generationForm?.addEventListener('input', event => {
    if (event.target.matches('input[type="range"]')) syncRangeOutputs();
  });
  syncRangeOutputs();

  controls.contactForm?.addEventListener('submit', event => {
    sendPrivateForm(event, controls.contactFormStatus, 'Thank you — your message has been sent.');
  });

  controls.generationForm?.addEventListener('submit', event => {
    sendQueueForm(
      event,
      controls.generationFormStatus,
      'Request queued — GitHub will start generation automatically.'
    );
  });

  controls.requestHistoryButton?.addEventListener('click', () => openRequestDialog());
  controls.requestDialogClose?.addEventListener('click', closeRequestDialog);
  controls.requestDialog?.addEventListener('click', event => {
    const rect = controls.requestDialog.getBoundingClientRect();
    const outside = event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom;
    if (outside) closeRequestDialog();
  });
  controls.requestHistorySelect?.addEventListener('change', event => {
    activeRequestId = event.target.value;
    renderRequestDialog();
    checkActiveRequestStatus(false);
  });
  controls.gifChangeButton?.addEventListener('click', () => {
    const request = activeRequest();
    if (!request) return;
    updateStoredRequest(request.id, {
      gifIndex: (Number(request.gifIndex || 0) + 1) % WAITING_GIFS.length,
      gifFailures: 0
    });
    renderRequestDialog();
  });
  controls.requestCheckButton?.addEventListener('click', () => checkActiveRequestStatus(true));
  controls.requestViewButton?.addEventListener('click', event => {
    if (controls.requestViewButton.getAttribute('aria-disabled') === 'true') event.preventDefault();
  });
  controls.requestGif?.addEventListener('error', () => {
    const request = activeRequest();
    if (!request) return;

    const gifFailures = Number(request.gifFailures || 0) + 1;
    if (gifFailures >= WAITING_GIFS.length) {
      controls.requestGif.removeAttribute('src');
      controls.requestGif.alt = 'Waiting for booklet generation';
      return;
    }

    updateStoredRequest(request.id, {
      gifIndex: (Number(request.gifIndex || 0) + 1) % WAITING_GIFS.length,
      gifFailures
    });
    renderRequestDialog();
  });

  updateRequestHistoryButton();
}
