(() => {
  const apply = () => {
    const root = document.documentElement;
    const query = new URLSearchParams(location.search).get('theme');
    let saved = null;
    try {
      saved = localStorage.getItem('audigy-theme');
    } catch {
      saved = null;
    }
    const choice = query === 'light' || query === 'dark' ? query : saved;
    if (choice === 'light' || choice === 'dark') {
      root.setAttribute('data-theme', choice);
    }
    try {
      if (localStorage.getItem('audigy-locale') !== 'en') {
        delete globalThis.__audigy_en;
        return;
      }
      const raw = localStorage.getItem('audigy-en');
      if (!raw) return;
      const pack = JSON.parse(raw);
      if (pack && typeof pack === 'object') globalThis.__audigy_en = pack;
    } catch {
      delete globalThis.__audigy_en;
    }
  };
  apply();
  document.addEventListener('astro:after-swap', apply);
})();
