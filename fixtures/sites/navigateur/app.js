document.cookie = 'panier=vide; path=/; max-age=31536000';
console.error('Erreur plantée pour le test');

const photo = document.createElement('img');
photo.src = 'http://media.example/tiers/photo.svg';
photo.alt = 'Photo';
document.body.appendChild(photo);

const lib = document.createElement('script');
lib.src = 'http://media.example/tiers/lib.js';
document.head.appendChild(lib);

fetch('https://traceur.example/tiers/event', {
  method: 'POST',
  mode: 'no-cors',
  body: 'clic=0',
});

setTimeout(() => {
  throw new Error('Exception plantée');
}, 0);
