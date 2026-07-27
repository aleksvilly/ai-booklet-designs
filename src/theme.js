export function applyTheme(theme, persist = true) {
  const themeToggle = document.querySelector('#theme-toggle');
  const themeColor = document.querySelector('#theme-color');
  const isDark = theme === 'dark';

  document.documentElement.dataset.theme = isDark ? 'dark' : 'light';
  if (themeToggle) {
    themeToggle.setAttribute('aria-pressed', String(isDark));
    themeToggle.setAttribute('aria-label', `Switch to ${isDark ? 'light' : 'dark'} theme`);
    const label = themeToggle.querySelector('.theme-toggle-label');
    if (label) label.textContent = isDark ? 'Light' : 'Dark';
  }
  if (themeColor) {
    themeColor.content = isDark ? '#121211' : '#f3f0e8';
  }
  if (persist) {
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
  }
}

export function setMenu(open) {
  const siteNav = document.querySelector('#site-nav');
  const menuToggle = document.querySelector('#menu-toggle');
  if (!siteNav || !menuToggle) return;

  siteNav.classList.toggle('is-open', open);
  menuToggle.setAttribute('aria-expanded', String(open));
  menuToggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
}

export function initThemeAndNav() {
  const themeToggle = document.querySelector('#theme-toggle');
  const menuToggle = document.querySelector('#menu-toggle');
  const siteNav = document.querySelector('#site-nav');

  applyTheme(document.documentElement.dataset.theme, false);

  themeToggle?.addEventListener('click', () => {
    applyTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark');
  });

  menuToggle?.addEventListener('click', () => {
    setMenu(!siteNav?.classList.contains('is-open'));
  });

  siteNav?.addEventListener('click', event => {
    if (event.target.closest('a')) setMenu(false);
  });

  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') setMenu(false);
  });
}
