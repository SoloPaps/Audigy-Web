window.tarteaucitron = { version: 'fixture' };
document.addEventListener('DOMContentLoaded', () => {
  const root = document.createElement('div');
  root.id = 'tarteaucitronRoot';
  root.innerHTML =
    '<div id="tarteaucitronAlertBig" role="dialog" aria-label="Gestion des traces">' +
    '<span>Ce site utilise des traces.</span>' +
    '<button type="button">Tout accepter</button>' +
    '<button type="button">Tout refuser</button>' +
    '<button type="button">Personnaliser</button>' +
    '</div>';
  document.body.appendChild(root);
});
