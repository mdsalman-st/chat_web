(function () {
  'use strict';

  const STORAGE_KEY = 'nexus_theme';
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

  function getSavedTheme() {
    const theme = localStorage.getItem(STORAGE_KEY);
    if (theme === 'light' || theme === 'dark') return theme;

    const adminTheme = localStorage.getItem('nexus_admin_theme');
    if (adminTheme === 'light' || adminTheme === 'dark') {
      localStorage.setItem(STORAGE_KEY, adminTheme);
      return adminTheme;
    }

    return null;
  }

  function applyTheme(theme) {
    const resolved = theme === 'light' || theme === 'dark'
      ? theme
      : (mediaQuery.matches ? 'dark' : 'light');

    document.documentElement.dataset.theme = resolved;
    document.documentElement.style.colorScheme = resolved;

    document.querySelectorAll('meta[name="theme-color"]').forEach((meta) => {
      meta.removeAttribute('media');
      meta.content = resolved === 'dark' ? '#05070d' : '#eef2f6';
    });
  }

  window.NexusTheme = {
    apply: function (theme) {
      if (theme !== 'light' && theme !== 'dark') return;
      localStorage.setItem(STORAGE_KEY, theme);
      localStorage.setItem('nexus_admin_theme', theme);
      applyTheme(theme);
    },
    clearPreference: function () {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem('nexus_admin_theme');
      applyTheme(null);
    },
    get: function () {
      return document.documentElement.dataset.theme ||
        (mediaQuery.matches ? 'dark' : 'light');
    }
  };

  applyTheme(getSavedTheme());

  mediaQuery.addEventListener
    ? mediaQuery.addEventListener('change', () => {
        if (!getSavedTheme()) applyTheme(null);
      })
    : mediaQuery.addListener(() => {
        if (!getSavedTheme()) applyTheme(null);
      });

  window.addEventListener('storage', (event) => {
    if (event.key === STORAGE_KEY || event.key === 'nexus_admin_theme') {
      applyTheme(getSavedTheme());
    }
  });
})();
