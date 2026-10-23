(() => {
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
})();
