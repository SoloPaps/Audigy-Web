import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  timingSafeEqual,
} from 'node:crypto';

const VERSION = 1;
const IV_LEN = 12;
const TAG_LEN = 16;
const AAD = Buffer.from('audigy-oauth-v1');

export interface OauthCrypto {
  encrypt(plaintext: string): Buffer;
  decrypt(blob: Buffer): string;
}

/** Clé AES-256 : 32 octets en base64 (TOKEN_ENC_KEY, §9). `null` si absente ou invalide. */
export function parseTokenKey(value: string | undefined): Buffer | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!/^[A-Za-z0-9+/]{43}=$/.test(trimmed)) return null;
  const key = Buffer.from(trimmed, 'base64');
  if (key.length !== 32) return null;
  return key;
}

export function createOauthCrypto(key: Buffer): OauthCrypto {
  if (key.length !== 32) throw new Error('token_key_invalid');
  return {
    encrypt(plaintext) {
      const iv = randomBytes(IV_LEN);
      const cipher = createCipheriv('aes-256-gcm', key, iv);
      cipher.setAAD(AAD);
      const ciphertext = Buffer.concat([
        cipher.update(plaintext, 'utf8'),
        cipher.final(),
      ]);
      const tag = cipher.getAuthTag();
      return Buffer.concat([Buffer.from([VERSION]), iv, tag, ciphertext]);
    },
    decrypt(blob) {
      try {
        if (blob.length < 1 + IV_LEN + TAG_LEN + 1) {
          throw new Error('token_invalid');
        }
        if (blob[0] !== VERSION) throw new Error('token_invalid');
        const iv = blob.subarray(1, 1 + IV_LEN);
        const tag = blob.subarray(1 + IV_LEN, 1 + IV_LEN + TAG_LEN);
        const ciphertext = blob.subarray(1 + IV_LEN + TAG_LEN);
        const decipher = createDecipheriv('aes-256-gcm', key, iv);
        decipher.setAAD(AAD);
        decipher.setAuthTag(tag);
        const plain = Buffer.concat([
          decipher.update(ciphertext),
          decipher.final(),
        ]);
        return plain.toString('utf8');
      } catch (error) {
        if (error instanceof Error && error.message === 'token_invalid') {
          throw error;
        }
        throw new Error('token_invalid');
      }
    },
  };
}

export function bufferToBytea(value: Buffer): string {
  return `\\x${value.toString('hex')}`;
}

export function byteaToBuffer(value: string): Buffer {
  const hex = /^\\x([0-9a-f]+)$/i.exec(value);
  if (hex?.[1] && hex[1].length % 2 === 0) return Buffer.from(hex[1], 'hex');
  const raw = Buffer.from(value, 'base64');
  if (raw.length > 0 && raw.toString('base64') === value) return raw;
  throw new Error('token_invalid');
}

export function sameSecret(left: string, right: string): boolean {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
