/**
 * @audigy/evidence — preuve d’un rapport (PLAN §12).
 *
 * - `resultatsCanoniques` : `results.json` en JCS (RFC 8785).
 * - `construireManifeste` : {fichier, sha256, octets} + SHA-256 de `results.json`.
 *   Le SHA-256 du manifeste canonique est l’empreinte du rapport.
 * - `horodater` : requête RFC 3161 (nonce, `certReq`) vers 2 TSA
 *   (FreeTSA, DigiCert). L’empreinte et le nonce du jeton sont vérifiés
 *   avant acceptation. Le réseau est injecté (`post`) : les tests ne sortent pas.
 * - `verifierJeton` : vérification hors ligne (fixtures, ancre locale).
 * - `signerManifeste` : Ed25519 du manifeste. Clé publique :
 *   `/.well-known/audigy-signing-key`. `SIGNING_PRIVATE_KEY` (PEM PKCS#8).
 * - `verdictFichier` (export `./browser`) : « correspond » ou « ne correspond pas ».
 *   Le hachage du fichier déposé se fait dans le navigateur (WebCrypto).
 */

export {
  type DossierPublic,
  EXEMPLE_DOSSIER_ID,
  type FichierManifeste,
  type HorodatagePublic,
  lireDossier,
  type Manifeste,
  manifesteCanonique,
  signatureCorrespond,
  type VerdictFichier,
  verdictFichier,
} from './browser.js';
export { versBase64, versHex } from './bytes.js';
export { EvidenceError } from './errors.js';
export { sha256Hex } from './hash.js';
export { canonicaliser } from './jcs.js';
export { creerAutoriteLocale } from './local-tsa.js';
export {
  construireManifeste,
  type FichierSource,
  type ManifesteConstruit,
} from './manifest.js';
export {
  type Resultats,
  resultatsCanoniques,
  resultatsSchema,
} from './results.js';
export { type Sceau, sceller } from './seal.js';
export {
  type ClePubliqueEd25519,
  clePriveeDepuisEnv,
  clePriveeEd25519,
  documentClePublique,
  genererCleEd25519,
  signerManifeste,
  verifierManifeste,
} from './sign.js';
export {
  type Horodatage,
  horodater,
  type JetonVerifie,
  posterTsa,
  requeteHorodatage,
  TSA_DEFAUT,
  type TsaCible,
  type TsaPost,
  verifierJeton,
} from './tsa.js';
