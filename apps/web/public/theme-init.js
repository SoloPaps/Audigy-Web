(() => {
  const apply = () => {
    const query = new URLSearchParams(location.search).get('theme');
    let saved = null;
    try {
      saved = localStorage.getItem('audigy-theme');
    } catch {
      saved = null;
    }
    const choice = query === 'light' || query === 'dark' ? query : saved;
    if (choice === 'light' || choice === 'dark') {
      document.documentElement.setAttribute('data-theme', choice);
    }
  };
  apply();
  // Le routeur d’Astro vide les attributs de <html> à chaque navigation.
  // On remet le thème avant l’affichage de la page suivante.
  document.addEventListener('astro:after-swap', apply);
})();
