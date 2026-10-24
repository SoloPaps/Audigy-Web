import { createHash } from 'node:crypto';
import { versHex } from './bytes.js';

/** SHA-256 hexadécimal minuscule. */
export function sha256Hex(octets: Uint8Array): string {
  return versHex(createHash('sha256').update(octets).digest());
}
