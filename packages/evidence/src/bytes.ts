/** Octets partagés par Node et le navigateur. Aucune API `node:`. */

export function versHex(octets: Uint8Array): string {
  let out = '';
  for (const byte of octets) out += byte.toString(16).padStart(2, '0');
  return out;
}

export function depuisHex(hex: string): Uint8Array {
  if (!/^[0-9a-f]+$/i.test(hex) || hex.length % 2 !== 0) {
    throw new Error('hexadécimal illisible');
  }
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i += 1) {
    out[i] = Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

export function versBase64(octets: Uint8Array): string {
  let binaire = '';
  for (const byte of octets) binaire += String.fromCharCode(byte);
  return btoa(binaire);
}

export function depuisBase64(valeur: string): Uint8Array {
  const binaire = atob(valeur);
  const out = new Uint8Array(binaire.length);
  for (let i = 0; i < binaire.length; i += 1) {
    out[i] = binaire.charCodeAt(i);
  }
  return out;
}

export function vue(octets: Uint8Array): ArrayBuffer {
  return octets.buffer.slice(
    octets.byteOffset,
    octets.byteOffset + octets.byteLength,
  ) as ArrayBuffer;
}

/** Comparaison d’empreintes : la longueur compte, y compris les zéros de tête. */
export function octetsEgaux(a: Uint8Array, b: Uint8Array): boolean {
  if (a.byteLength !== b.byteLength) return false;
  let diff = 0;
  for (let i = 0; i < a.byteLength; i += 1) {
    diff |= (a[i] ?? 0) ^ (b[i] ?? 0);
  }
  return diff === 0;
}

export function memesOctets(a: Uint8Array, b: Uint8Array): boolean {
  const gauche = magnitude(a);
  const droite = magnitude(b);
  if (gauche.length !== droite.length) return false;
  let diff = 0;
  for (let i = 0; i < gauche.length; i += 1) {
    diff |= (gauche[i] ?? 0) ^ (droite[i] ?? 0);
  }
  return diff === 0;
}

/** Entier positif : retire l’octet de signe 0x00 ajouté par DER. */
function magnitude(octets: Uint8Array): Uint8Array {
  let i = 0;
  while (i < octets.length - 1 && octets[i] === 0) i += 1;
  return octets.subarray(i);
}
