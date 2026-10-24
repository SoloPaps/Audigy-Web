import {
  createHash,
  createPrivateKey,
  createPublicKey,
  generateKeyPairSync,
  type JsonWebKey,
  type KeyObject,
  sign,
  verify,
} from 'node:crypto';
import { EvidenceError } from './errors.js';

export interface ClePubliqueEd25519 {
  alg: 'Ed25519';
  kid: string;
  publicKeyPem: string;
  jwk: JsonWebKey;
}

/** `SIGNING_PRIVATE_KEY` : PEM PKCS#8 Ed25519. Absent = rapport non signé. */
export function clePriveeDepuisEnv(env: NodeJS.ProcessEnv): KeyObject | null {
  const pem = env.SIGNING_PRIVATE_KEY;
  if (!pem) return null;
  return clePriveeEd25519(pem);
}

export function clePriveeEd25519(pem: string): KeyObject {
  const cle = createPrivateKey(pem);
  if (cle.asymmetricKeyType !== 'ed25519') {
    throw new EvidenceError('ENTREE', 'la clé de signature doit être Ed25519');
  }
  return cle;
}

export function genererCleEd25519(): { privee: KeyObject; pem: string } {
  const { privateKey } = generateKeyPairSync('ed25519');
  const pem = privateKey.export({ type: 'pkcs8', format: 'pem' });
  if (typeof pem !== 'string') {
    throw new EvidenceError('ENTREE', 'export de clé impossible');
  }
  return { privee: privateKey, pem };
}

/** Document publié dans `/.well-known/audigy-signing-key`. Pas de clé privée. */
export function documentClePublique(
  privee: KeyObject,
  kid = 'audigy-2026',
): ClePubliqueEd25519 {
  const publique = createPublicKey(privee);
  const pem = publique.export({ type: 'spki', format: 'pem' });
  const jwk = publique.export({ format: 'jwk' });
  const x = jwk.x;
  if (
    typeof pem !== 'string' ||
    jwk.crv !== 'Ed25519' ||
    jwk.kty !== 'OKP' ||
    typeof x !== 'string'
  ) {
    throw new EvidenceError('ENTREE', 'clé publique Ed25519 illisible');
  }
  return {
    alg: 'Ed25519',
    kid,
    publicKeyPem: pem,
    jwk: {
      kty: 'OKP',
      crv: 'Ed25519',
      x,
      alg: 'EdDSA',
    },
  };
}

/** Signature Ed25519 du manifeste canonique (PLAN §12.5). */
export function signerManifeste(
  canonique: string,
  privee: KeyObject,
): Uint8Array {
  return new Uint8Array(sign(null, Buffer.from(canonique, 'utf8'), privee));
}

export function verifierManifeste(
  canonique: string,
  signature: Uint8Array,
  publique: KeyObject,
): boolean {
  return verify(null, Buffer.from(canonique, 'utf8'), publique, signature);
}

export function empreinteClePublique(pem: string): string {
  const cle = createPublicKey(pem);
  const der = cle.export({ type: 'spki', format: 'der' });
  return createHash('sha256').update(der).digest('hex');
}
