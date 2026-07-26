const storageKey = 'booklet-contact-messages';
const list = document.querySelector('#message-list');
const count = document.querySelector('#message-count');
const clearButton = document.querySelector('#clear-messages');

function escapeHtml(value = '') {
  return String(value).replace(/[&<>'"]/g, character => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#39;',
    '"': '&quot;'
  })[character]);
}

function getMessages() {
  try {
    const messages = JSON.parse(localStorage.getItem(storageKey) || '[]');
    return Array.isArray(messages) ? messages : [];
  } catch {
    return [];
  }
}

function saveMessages(messages) {
  localStorage.setItem(storageKey, JSON.stringify(messages));
  render();
}

function render() {
  const messages = getMessages();
  count.textContent = `${messages.length} ${messages.length === 1 ? 'message' : 'messages'}`;
  clearButton.disabled = messages.length === 0;

  if (!messages.length) {
    list.innerHTML = '<p class="inbox-empty">No messages yet. Submit the contact form in this browser to test the inbox.</p>';
    return;
  }

  list.innerHTML = messages.map(item => `
    <article class="message-card${item.read ? '' : ' is-unread'}" data-id="${escapeHtml(item.id)}">
      <div class="message-meta">
        <p><strong>${escapeHtml(item.name)}</strong></p>
        <p>${escapeHtml(item.contact)}</p>
        <time class="message-date" datetime="${escapeHtml(item.createdAt)}">${escapeHtml(new Date(item.createdAt).toLocaleString())}</time>
      </div>
      <div>
        <p class="message-body">${escapeHtml(item.message)}</p>
        <div class="message-actions">
          <button type="button" data-action="toggle">${item.read ? 'Mark unread' : 'Mark read'}</button>
          <button type="button" data-action="delete">Delete</button>
        </div>
      </div>
    </article>
  `).join('');
}

list.addEventListener('click', event => {
  const button = event.target.closest('button[data-action]');
  const card = button?.closest('[data-id]');
  if (!button || !card) return;

  const messages = getMessages();
  const index = messages.findIndex(item => item.id === card.dataset.id);
  if (index < 0) return;

  if (button.dataset.action === 'delete') messages.splice(index, 1);
  if (button.dataset.action === 'toggle') messages[index].read = !messages[index].read;
  saveMessages(messages);
});

clearButton.addEventListener('click', () => {
  if (getMessages().length && window.confirm('Delete all demo messages?')) {
    saveMessages([]);
  }
});

render();
