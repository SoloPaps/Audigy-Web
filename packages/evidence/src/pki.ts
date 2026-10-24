import * as pkijs from 'pkijs';

/**
 * pkijs n’arme pas son moteur si `self` existe sans `crypto`
 * (workers de test). On le pose explicitement sur WebCrypto.
 */
pkijs.setEngine(
  'audigy',
  new pkijs.CryptoEngine({ name: 'audigy', crypto: globalThis.crypto }),
);
